
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Tool, CanvasState, AspectRatio } from '../types';

interface CanvasProps {
  canvasState: CanvasState;
  initialImage?: string;
  onSave: (imageData: string) => void;
}

const Canvas: React.FC<CanvasProps> = ({ canvasState, initialImage, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const snapshotRef = useRef<ImageData | null>(null);

  const getDimensions = (res: number, ratio: AspectRatio) => {
    switch (ratio) {
      case '4:3':
        return { width: res, height: Math.round(res * (3 / 4)) };
      case '16:9':
        return { width: res, height: Math.round(res * (9 / 16)) };
      case '1:1':
      default:
        return { width: res, height: res };
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = getDimensions(canvasState.resolution, canvasState.aspectRatio);
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = canvasState.color;
    ctx.lineWidth = canvasState.lineWidth;
    contextRef.current = ctx;

    // Load initial image if available
    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw image stretched/fitted to new canvas size
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialImage;
    } else {
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [initialImage, canvasState.resolution, canvasState.aspectRatio]);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = canvasState.tool === 'eraser' ? '#FFFFFF' : canvasState.color;
      contextRef.current.lineWidth = canvasState.lineWidth;
    }
  }, [canvasState.color, canvasState.lineWidth, canvasState.tool]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const floodFill = (startX: number, startY: number) => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const w = canvas.width;
    const h = canvas.height;

    const targetRgb = hexToRgb(canvasState.color);
    if (!targetRgb) return;

    const x = Math.floor(startX);
    const y = Math.floor(startY);
    const offset = (y * w + x) * 4;
    const startR = data[offset];
    const startG = data[offset + 1];
    const startB = data[offset + 2];
    const startA = data[offset + 3];

    if (startR === targetRgb.r && startG === targetRgb.g && startB === targetRgb.b && startA === 255) {
      return;
    }

    const stack: [number, number][] = [[x, y]];
    
    while (stack.length > 0) {
      const [curX, curY] = stack.pop()!;
      const curOffset = (curY * w + curX) * 4;

      if (
        data[curOffset] === startR &&
        data[curOffset + 1] === startG &&
        data[curOffset + 2] === startB &&
        data[curOffset + 3] === startA
      ) {
        data[curOffset] = targetRgb.r;
        data[curOffset + 1] = targetRgb.g;
        data[curOffset + 2] = targetRgb.b;
        data[curOffset + 3] = 255;

        if (curX + 1 < w) stack.push([curX + 1, curY]);
        if (curX - 1 >= 0) stack.push([curX - 1, curY]);
        if (curY + 1 < h) stack.push([curX, curY + 1]);
        if (curY - 1 >= 0) stack.push([curX, curY - 1]);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    onSave(canvas.toDataURL('image/png'));
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);

    if (canvasState.tool === 'fill') {
      floodFill(pos.x, pos.y);
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);
    
    if (contextRef.current) {
      contextRef.current.beginPath();
      contextRef.current.moveTo(pos.x, pos.y);
      snapshotRef.current = contextRef.current.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !contextRef.current || canvasState.tool === 'fill') return;
    const pos = getPos(e);
    const ctx = contextRef.current;

    if (canvasState.tool === 'pen' || canvasState.tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      ctx.beginPath();
      if (canvasState.tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      } else if (canvasState.tool === 'circle') {
        const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (contextRef.current) {
      contextRef.current.closePath();
      onSave(canvasRef.current!.toDataURL('image/png'));
    }
  };

  const getAspectClass = (ratio: AspectRatio) => {
    switch (ratio) {
      case '4:3': return 'aspect-[4/3]';
      case '16:9': return 'aspect-[16/9]';
      case '1:1': default: return 'aspect-square';
    }
  };

  return (
    <div className={`relative w-full ${getAspectClass(canvasState.aspectRatio)} bg-white shadow-2xl border-4 border-slate-900 rounded-lg overflow-hidden cursor-crosshair`}>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full h-full"
      />
    </div>
  );
};

export default Canvas;

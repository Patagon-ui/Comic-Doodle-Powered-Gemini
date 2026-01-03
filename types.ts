
export interface ComicPanel {
  id: string;
  imageData: string; // base64
  prompt?: string;
  history?: string[];
  redoStack?: string[];
}

export type Tool = 'pen' | 'eraser' | 'circle' | 'rect' | 'fill';
export type AspectRatio = '1:1' | '4:3' | '16:9';

export interface CanvasState {
  color: string;
  lineWidth: number;
  tool: Tool;
  resolution: number;
  aspectRatio: AspectRatio;
}

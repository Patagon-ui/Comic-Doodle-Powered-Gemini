
import React, { useState, useCallback } from 'react';
import { 
  Plus, Trash2, Download, Wand2, Paintbrush, Eraser, 
  Square, Circle, ChevronLeft, ChevronRight, Zap, RefreshCw,
  Undo2, Redo2, RotateCcw, PaintBucket, Maximize, Monitor
} from 'lucide-react';
import { ComicPanel, Tool, CanvasState, AspectRatio } from './types';
import Canvas from './components/Canvas';
import { editImageWithAI, generateFromScratch } from './services/geminiService';

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#8B4513'
];

const App: React.FC = () => {
  const [panels, setPanels] = useState<ComicPanel[]>([
    { id: '1', imageData: '', history: [], redoStack: [] }
  ]);
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    color: '#000000',
    lineWidth: 5,
    tool: 'pen',
    resolution: 800,
    aspectRatio: '1:1'
  });

  const activePanel = panels[activePanelIndex];

  const handleSaveCanvas = useCallback((imageData: string) => {
    setPanels(prev => {
      const next = [...prev];
      const panel = { ...next[activePanelIndex] };
      
      if (panel.imageData !== imageData) {
        panel.history = [...(panel.history || []), panel.imageData];
        panel.redoStack = []; 
        panel.imageData = imageData;
        next[activePanelIndex] = panel;
      }
      return next;
    });
  }, [activePanelIndex]);

  const handleUndo = () => {
    setPanels(prev => {
      const next = [...prev];
      const panel = { ...next[activePanelIndex] };
      if (!panel.history || panel.history.length === 0) return prev;

      const previousState = panel.history[panel.history.length - 1];
      panel.redoStack = [...(panel.redoStack || []), panel.imageData];
      panel.imageData = previousState;
      panel.history = panel.history.slice(0, -1);
      
      next[activePanelIndex] = panel;
      return next;
    });
  };

  const handleRedo = () => {
    setPanels(prev => {
      const next = [...prev];
      const panel = { ...next[activePanelIndex] };
      if (!panel.redoStack || panel.redoStack.length === 0) return prev;

      const nextState = panel.redoStack[panel.redoStack.length - 1];
      panel.history = [...(panel.history || []), panel.imageData];
      panel.imageData = nextState;
      panel.redoStack = panel.redoStack.slice(0, -1);
      
      next[activePanelIndex] = panel;
      return next;
    });
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear this panel?")) {
      handleSaveCanvas('');
    }
  };

  const addNewPanel = () => {
    const newId = Date.now().toString();
    setPanels([...panels, { id: newId, imageData: '', history: [], redoStack: [] }]);
    setActivePanelIndex(panels.length);
  };

  const deletePanel = (index: number) => {
    if (panels.length <= 1) return;
    const newPanels = panels.filter((_, i) => i !== index);
    setPanels(newPanels);
    setActivePanelIndex(Math.max(0, index - 1));
  };

  const handleAIAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isAILoading) return;

    setIsAILoading(true);
    try {
      let result: string | null = null;
      if (activePanel.imageData) {
        result = await editImageWithAI(activePanel.imageData, prompt);
      } else {
        result = await generateFromScratch(prompt);
      }

      if (result) {
        handleSaveCanvas(result);
        setPrompt('');
      }
    } catch (error) {
      alert("Failed to process with AI. Check console for details.");
    } finally {
      setIsAILoading(false);
    }
  };

  const downloadComic = () => {
    panels.forEach((panel, i) => {
      if (!panel.imageData) return;
      const link = document.createElement('a');
      link.download = `comic-panel-${i + 1}.png`;
      link.href = panel.imageData;
      link.click();
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 overflow-hidden">
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 p-2 rounded-lg rotate-3 shadow-md">
            <Zap className="text-slate-900 w-6 h-6" fill="currentColor" />
          </div>
          <h1 className="comic-font text-3xl tracking-wider">COMIC DOODLE AI</h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={downloadComic}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-full transition-all font-semibold"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
        {/* Left Sidebar: Tools & Palette */}
        <div className="w-full md:w-40 lg:w-44 bg-white rounded-2xl shadow-xl p-4 flex flex-col gap-6 border border-slate-200 overflow-y-auto custom-scrollbar">
          {/* Main Drawing Tools */}
          <div className="grid grid-cols-2 gap-2">
            <ToolButton 
              active={canvasState.tool === 'pen'} 
              onClick={() => setCanvasState(s => ({ ...s, tool: 'pen' }))}
              icon={<Paintbrush />}
              label="Pen"
            />
            <ToolButton 
              active={canvasState.tool === 'fill'} 
              onClick={() => setCanvasState(s => ({ ...s, tool: 'fill' }))}
              icon={<PaintBucket />}
              label="Fill"
            />
            <ToolButton 
              active={canvasState.tool === 'eraser'} 
              onClick={() => setCanvasState(s => ({ ...s, tool: 'eraser' }))}
              icon={<Eraser />}
              label="Eraser"
            />
            <ToolButton 
              active={canvasState.tool === 'rect'} 
              onClick={() => setCanvasState(s => ({ ...s, tool: 'rect' }))}
              icon={<Square />}
              label="Box"
            />
            <ToolButton 
              active={canvasState.tool === 'circle'} 
              onClick={() => setCanvasState(s => ({ ...s, tool: 'circle' }))}
              icon={<Circle />}
              label="Circle"
              className="col-span-2"
            />
          </div>

          <div className="h-px bg-slate-200" />

          {/* History Controls */}
          <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
             <ToolButton 
              active={false} 
              onClick={handleUndo}
              icon={<Undo2 />}
              label="Undo"
              disabled={!activePanel.history || activePanel.history.length === 0}
            />
            <ToolButton 
              active={false} 
              onClick={handleRedo}
              icon={<Redo2 />}
              label="Redo"
              disabled={!activePanel.redoStack || activePanel.redoStack.length === 0}
            />
            <ToolButton 
              active={false} 
              onClick={handleClear}
              icon={<RotateCcw />}
              label="Clear"
              className="col-span-2 md:col-span-2"
            />
          </div>

          <div className="h-px bg-slate-200" />

          {/* Aspect Ratio */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 text-center">Aspect Ratio</span>
            <div className="grid grid-cols-3 gap-1">
              {(['1:1', '4:3', '16:9'] as AspectRatio[]).map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setCanvasState(s => ({ ...s, aspectRatio: ratio }))}
                  className={`py-2 px-1 rounded-lg text-[10px] font-bold border-2 transition-all ${
                    canvasState.aspectRatio === ratio 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Color Palette */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 text-center">Palette</span>
            <div className="grid grid-cols-4 md:grid-cols-2 gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setCanvasState(s => ({ ...s, color: c, tool: s.tool === 'eraser' ? 'pen' : s.tool }))}
                  className={`w-full aspect-square rounded-lg border-2 transition-transform hover:scale-110 ${canvasState.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="relative group mt-1">
              <input 
                type="color" 
                value={canvasState.color}
                onChange={(e) => setCanvasState(s => ({ ...s, color: e.target.value, tool: s.tool === 'eraser' ? 'pen' : s.tool }))}
                className="w-full h-10 rounded-lg cursor-pointer border-2 border-slate-200"
              />
              <span className="text-[9px] uppercase font-bold text-slate-400 block text-center mt-1">Custom</span>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Sliders */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="flex justify-between w-full px-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Brush</span>
                <span className="text-[10px] font-bold text-slate-900">{canvasState.lineWidth}px</span>
              </div>
              <input 
                type="range" 
                min="1" max="100" 
                value={canvasState.lineWidth}
                onChange={(e) => setCanvasState(s => ({ ...s, lineWidth: parseInt(e.target.value) }))}
                className="w-full accent-slate-900 h-1.5 rounded-lg appearance-none bg-slate-200 cursor-pointer"
              />
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex justify-between w-full px-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Resolution</span>
                <span className="text-[10px] font-bold text-slate-900">{canvasState.resolution}px</span>
              </div>
              <input 
                type="range" 
                min="400" max="2000" step="100"
                value={canvasState.resolution}
                onChange={(e) => setCanvasState(s => ({ ...s, resolution: parseInt(e.target.value) }))}
                className="w-full accent-slate-900 h-1.5 rounded-lg appearance-none bg-slate-200 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 flex items-center justify-center relative group/canvas">
            <div className="w-full max-w-3xl px-4">
              <Canvas 
                canvasState={canvasState} 
                initialImage={activePanel.imageData}
                onSave={handleSaveCanvas}
                key={activePanel.id + '-' + canvasState.resolution + '-' + canvasState.aspectRatio + (activePanel.imageData === '' ? '-cleared' : '')}
              />
            </div>
            
            <button 
              onClick={() => setActivePanelIndex(Math.max(0, activePanelIndex - 1))}
              disabled={activePanelIndex === 0}
              className="absolute left-2 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg disabled:opacity-0 hover:bg-white transition-all transform z-10"
            >
              <ChevronLeft size={32} />
            </button>
            <button 
              onClick={() => setActivePanelIndex(Math.min(panels.length - 1, activePanelIndex + 1))}
              disabled={activePanelIndex === panels.length - 1}
              className="absolute right-2 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg disabled:opacity-0 hover:bg-white transition-all transform z-10"
            >
              <ChevronRight size={32} />
            </button>
          </div>

          <div className="w-full max-w-3xl mx-auto mb-2 px-4">
            <form onSubmit={handleAIAction} className="relative group">
              <input 
                type="text"
                placeholder={activePanel.imageData ? "Tell Gemini to edit this panel... (e.g., 'Add a cape', 'Retro style')" : "Generate a new comic panel with AI..."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-white border-4 border-slate-900 rounded-2xl py-4 pl-6 pr-16 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:outline-none text-black text-lg font-medium group-hover:-translate-y-1 group-hover:-translate-x-1 transition-transform"
              />
              <button 
                type="submit"
                disabled={isAILoading || !prompt.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-yellow-400 rounded-xl hover:bg-yellow-300 transition-all disabled:opacity-50 disabled:grayscale"
              >
                {isAILoading ? <RefreshCw className="animate-spin" /> : <Wand2 size={24} />}
              </button>
            </form>
            {isAILoading && (
              <p className="text-center mt-4 text-slate-500 font-medium animate-pulse">
                Gemini is sketching your idea...
              </p>
            )}
          </div>

          <div className="bg-slate-200/50 p-4 rounded-2xl border border-slate-300">
            <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 min-h-[120px]">
              {panels.map((panel, idx) => (
                <div 
                  key={panel.id}
                  onClick={() => setActivePanelIndex(idx)}
                  className={`group relative flex-shrink-0 w-28 h-28 rounded-xl border-4 cursor-pointer overflow-hidden transition-all ${
                    idx === activePanelIndex ? 'border-yellow-400 scale-105 shadow-lg' : 'border-white hover:border-slate-300'
                  }`}
                >
                  {panel.imageData ? (
                    <img src={panel.imageData} alt={`Panel ${idx + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                      <Paintbrush className="text-slate-300" size={24} />
                    </div>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); deletePanel(idx); }}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity z-10"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded font-bold">
                    {idx + 1}
                  </div>
                </div>
              ))}
              <button 
                onClick={addNewPanel}
                className="flex-shrink-0 w-28 h-28 rounded-xl border-4 border-dashed border-slate-400 flex flex-col items-center justify-center gap-2 hover:bg-slate-300 transition-all text-slate-500"
              >
                <Plus size={24} />
                <span className="text-[10px] font-bold uppercase">Add Panel</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  className?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ active, onClick, icon, label, disabled, className = "" }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
      active 
        ? 'bg-slate-900 text-white scale-105 shadow-md' 
        : 'text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed'
    } ${className}`}
  >
    {React.cloneElement(icon as React.ReactElement, { size: 20 })}
    <span className="text-[9px] uppercase font-black tracking-tight">{label}</span>
  </button>
);

export default App;

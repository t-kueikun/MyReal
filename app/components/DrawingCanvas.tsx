'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pen, Eraser, Undo, Trash2 } from 'lucide-react';

export type DrawingCanvasHandle = {
  exportBlob: () => Promise<Blob | null>;
  clear: () => void;
  undo: () => void;
};

type Tool = 'pen' | 'eraser';

const DrawingCanvas = forwardRef<DrawingCanvasHandle, { onDirty?: () => void }>(
  ({ onDirty }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [tool, setTool] = useState<Tool>('pen');
    const [penSize, setPenSize] = useState(6);
    const [eraserSize, setEraserSize] = useState(24);
    const isDrawingRef = useRef(false);
    const history = useRef<ImageData[]>([]);

    // Canvas resolution state
    const [dimensions, setDimensions] = useState({ width: 800, height: 800 });

    const getContext = () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext('2d', { willReadFrequently: true });
    };

    // Resize observer to fit container
    useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          setDimensions({ width: clientWidth, height: clientHeight });
        }
      };

      window.addEventListener('resize', updateSize);
      updateSize();
      // Delay slightly for initial render
      setTimeout(updateSize, 100);

      return () => window.removeEventListener('resize', updateSize);
    }, []);

    useImperativeHandle(ref, () => ({
      exportBlob: async () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
      },
      clear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = getContext();
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        history.current = [];
      },
      undo: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = getContext();
        if (!ctx) return;
        const snapshot = history.current.pop();
        if (!snapshot) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
        ctx.putImageData(snapshot, 0, 0);
      }
    }));

    useEffect(() => {
      const ctx = getContext();
      if (!ctx) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = 'transparent';
    }, [dimensions]);

    const getPos = (event: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
      };
    };

    const handlePointerDown = (event: React.PointerEvent) => {
      event.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = getContext();
      if (!ctx) return;

      canvas.setPointerCapture(event.pointerId);

      // Save state
      history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (history.current.length > 20) history.current.shift();

      const { x, y } = getPos(event);
      ctx.beginPath();
      ctx.moveTo(x, y);

      ctx.strokeStyle = tool === 'pen' ? '#101114' : 'rgba(0,0,0,0)';
      ctx.lineWidth = tool === 'pen' ? penSize : eraserSize;
      ctx.globalCompositeOperation = tool === 'pen' ? 'source-over' : 'destination-out';

      isDrawingRef.current = true;
      onDirty?.();
    };

    const handlePointerMove = (event: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      event.preventDefault();
      const { x, y } = getPos(event);
      const ctx = getContext();
      if (!ctx) return;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const endDrawing = (event?: React.PointerEvent) => {
      if (event) {
        const canvas = canvasRef.current;
        if (canvas) canvas.releasePointerCapture(event.pointerId);
        event.preventDefault();
      }
      isDrawingRef.current = false;
      const ctx = getContext();
      if (!ctx) return;
      ctx.closePath();
      ctx.globalCompositeOperation = 'source-over';
    };

    return (
      <div className="relative w-full h-full flex flex-col" ref={containerRef}>
        <div className="flex-1 relative w-full h-full bg-white touch-none cursor-crosshair overflow-hidden rounded-2xl">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="block touch-none"
            style={{ width: '100%', height: '100%' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
            onPointerLeave={endDrawing}
          />
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-white/90 backdrop-blur-md shadow-xl rounded-full border border-ink/5">
          <button
            type="button"
            className={`p-3 rounded-full transition-all ${tool === 'pen' ? 'bg-ink text-white shadow-md' : 'text-ink/70 hover:bg-ink/5'}`}
            onClick={() => setTool('pen')}
          >
            <Pen size={24} />
          </button>

          {tool === 'pen' && (
            <div className="w-24 px-2 hidden sm:block">
              <input
                type="range"
                min="1" max="50"
                value={penSize}
                onChange={(e) => setPenSize(Number(e.target.value))}
                className="w-full h-1 bg-ink/20 rounded-lg appearance-none cursor-pointer accent-ink"
              />
            </div>
          )}

          <button
            type="button"
            className={`p-3 rounded-full transition-all ${tool === 'eraser' ? 'bg-ink text-white shadow-md' : 'text-ink/70 hover:bg-ink/5'}`}
            onClick={() => setTool('eraser')}
          >
            <Eraser size={24} />
          </button>

          <div className="w-px h-8 bg-ink/10 mx-1" />

          <button
            type="button"
            className="p-3 rounded-full text-ink/70 hover:bg-ink/5 transition-all"
            onClick={() => ref && typeof ref !== 'function' && ref.current?.undo()}
          >
            <Undo size={24} />
          </button>
          <button
            type="button"
            className="p-3 rounded-full text-red-500/80 hover:bg-red-50 transition-all"
            onClick={() => {
              if (confirm('すべて消去しますか？')) {
                ref && typeof ref !== 'function' && ref.current?.clear();
              }
            }}
          >
            <Trash2 size={24} />
          </button>
        </div>
      </div>
    );
  }
);

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;

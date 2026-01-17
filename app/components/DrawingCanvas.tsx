'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pencil, Eraser, Undo2, RotateCcw, ImagePlus } from 'lucide-react';

export type DrawingCanvasHandle = {
  exportBlob: () => Promise<Blob | null>;
  clear: () => void;
  undo: () => void;
};

type Tool = 'pen' | 'eraser';

const CANVAS_SIZE = 768;

const DrawingCanvas = forwardRef<DrawingCanvasHandle, { onDirty?: () => void; disabled?: boolean; className?: string }>(
  ({ onDirty, disabled, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [tool, setTool] = useState<Tool>('pen');
    const [penSize, setPenSize] = useState(6);
    const [eraserSize, setEraserSize] = useState(24);
    const isDrawingRef = useRef(false);
    const history = useRef<ImageData[]>([]);

    const getContext = () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext('2d', { willReadFrequently: true });
    };

    useImperativeHandle(ref, () => ({
      exportBlob: async () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
      },
      clear: () => {
        if (disabled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = getContext();
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        history.current = [];
      },
      undo: () => {
        if (disabled) return;
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
    }, []);

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
      if (disabled) return;
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
      if (disabled || !isDrawingRef.current) return;
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
      <div className={`relative flex flex-col h-full ${className || ''}`}>
        {/* Floating Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 p-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-ink/5">
          <button
            type="button"
            className={`btn-icon ${tool === 'pen' ? 'bg-ink text-white hover:bg-ink' : 'text-ink/60'}`}
            onClick={() => setTool('pen')}
            disabled={disabled}
            title="ペン"
          >
            <Pencil size={20} />
          </button>
          <button
            type="button"
            className={`btn-icon ${tool === 'eraser' ? 'bg-ink text-white hover:bg-ink' : 'text-ink/60'}`}
            onClick={() => setTool('eraser')}
            disabled={disabled}
            title="消しゴム"
          >
            <Eraser size={20} />
          </button>
          <div className="w-px h-6 bg-ink/10 mx-1" />
          <button
            type="button"
            className="btn-icon text-ink/60 hover:text-ink"
            onClick={() => {
              if (ref && typeof ref !== 'function') {
                ref.current?.undo();
              }
            }}
            disabled={disabled}
            title="元に戻す"
          >
            <Undo2 size={20} />
          </button>
          <button
            type="button"
            className="btn-icon text-red-500/80 hover:text-red-500 hover:bg-red-50"
            onClick={() => {
              if (ref && typeof ref !== 'function') {
                ref.current?.clear();
              }
            }}
            disabled={disabled}
            title="全消去"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        <div className={`flex-1 relative rounded-3xl overflow-hidden bg-white shadow-inner ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full h-full object-contain touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
            onPointerLeave={endDrawing}
            suppressHydrationWarning
          />
          {!disabled && (
            <div className="absolute bottom-4 right-4 pointer-events-none opacity-50">
              <span className="tag bg-white/80">透明背景</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;

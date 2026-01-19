'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export type DrawingCanvasHandle = {
  exportBlob: () => Promise<Blob | null>;
  clear: () => void;
  undo: () => void;
};

type Tool = 'pen' | 'eraser';

const CANVAS_SIZE = 768;

const DrawingCanvas = forwardRef<DrawingCanvasHandle, { onDirty?: () => void }>(
  ({ onDirty }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [tool, setTool] = useState<Tool>('pen');
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
    }, []);

    const getPos = (event: PointerEvent | React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height
      };
    };

    const handlePointerDown = (event: React.PointerEvent) => {
      event.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = getContext();
      if (!ctx) return;
      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(event.pointerId);
      }
      history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      const { x, y } = getPos(event);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === 'pen' ? '#101114' : 'rgba(0,0,0,0)';
      ctx.lineWidth = tool === 'pen' ? 6 : 24;
      ctx.globalCompositeOperation = tool === 'pen' ? 'source-over' : 'destination-out';
      isDrawingRef.current = true;
      onDirty?.();
    };

    const handlePointerMove = (event: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      event.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = getContext();
      if (!ctx) return;
      const { x, y } = getPos(event);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const endDrawing = (event?: React.PointerEvent) => {
      if (event) {
        event.preventDefault();
        const canvas = canvasRef.current;
        if (canvas && canvas.releasePointerCapture) {
          canvas.releasePointerCapture(event.pointerId);
        }
      }
      isDrawingRef.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = getContext();
      if (!ctx) return;
      ctx.closePath();
      ctx.globalCompositeOperation = 'source-over';
    };

    return (
      <div className="relative w-full h-full flex items-center justify-center bg-transparent">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="max-w-full max-h-full rounded-2xl bg-white shadow-sm touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrawing}
          onPointerCancel={endDrawing}
          onPointerLeave={endDrawing}
        />

        {/* Floating Toolbar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-white/90 p-2 shadow-xl backdrop-blur-md ring-1 ring-black/5">
          <button
            type="button"
            className={`group relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${tool === 'pen' ? 'bg-ink text-white' : 'text-ink hover:bg-ink/5'
              }`}
            onClick={() => setTool('pen')}
            title="ペン"
          >
            {/* Pen Icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current stroke-2"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            className={`group relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${tool === 'eraser' ? 'bg-ink text-white' : 'text-ink hover:bg-ink/5'
              }`}
            onClick={() => setTool('eraser')}
            title="消しゴム"
          >
            {/* Eraser Icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current stroke-2"
            >
              <path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17 17L7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="mx-1 h-6 w-px bg-ink/10" />

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 focus:outline-none focus:ring-2 focus:ring-accent/20"
            onClick={() => {
              if (ref && typeof ref !== 'function') {
                ref.current?.undo();
              }
            }}
            title="元に戻す"
          >
            {/* Undo Icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current stroke-2"
            >
              <path d="M9 14L4 9l5-5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            onClick={() => {
              if (ref && typeof ref !== 'function') {
                ref.current?.clear();
              }
            }}
            title="クリア"
          >
            {/* Trash/Clear Icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current stroke-2"
            >
              <path d="M3 6h18" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    );
  }
);

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;

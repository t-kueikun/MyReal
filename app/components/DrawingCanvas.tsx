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
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`btn ${tool === 'pen' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTool('pen')}
          >
            ペン
          </button>
          <button
            type="button"
            className={`btn ${tool === 'eraser' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTool('eraser')}
          >
            消しゴム
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (ref && typeof ref !== 'function') {
                ref.current?.undo();
              }
            }}
          >
            Undo
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (ref && typeof ref !== 'function') {
                ref.current?.clear();
              }
            }}
          >
            クリア
          </button>
          <span className="tag">透明背景推奨</span>
        </div>
        <div className="card p-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full max-w-full rounded-2xl bg-white touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
            onPointerLeave={endDrawing}
          />
        </div>
      </div>
    );
  }
);

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;

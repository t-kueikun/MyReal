'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pencil, Eraser, Undo2, RotateCcw } from 'lucide-react';

export type DrawingCanvasHandle = {
  exportBlob: () => Promise<Blob | null>;
  clear: () => void;
  undo: () => void;
};

type Tool = 'pen' | 'eraser';

type Point = {
  x: number;
  y: number;
};

const DEFAULT_CANVAS_SIZE = 1536;
const MIN_CANVAS_SIZE = 1280;
const MAX_CANVAS_SIZE = 2048;
const MIN_RENDER_SCALE = 2;
const HISTORY_LIMIT = 10;

const DrawingCanvas = forwardRef<DrawingCanvasHandle, { onDirty?: () => void; disabled?: boolean; className?: string }>(
  ({ onDirty, disabled, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [tool, setTool] = useState<Tool>('pen');
    const [penSize, setPenSize] = useState(6);
    const [eraserSize, setEraserSize] = useState(24);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<Point | null>(null);
    const history = useRef<ImageData[]>([]);

    const getContext = () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext('2d', { willReadFrequently: true });
    };

    const configureContext = (ctx: CanvasRenderingContext2D) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = 'transparent';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    };

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = getContext();
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lastPointRef.current = null;
      isDrawingRef.current = false;
    };

    const getTargetSize = (displaySize: number, devicePixelRatio: number) => {
      const scaledSize = Math.max(
        displaySize * devicePixelRatio,
        displaySize * MIN_RENDER_SCALE,
        MIN_CANVAS_SIZE
      );
      return Math.min(Math.round(scaledSize), MAX_CANVAS_SIZE);
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
        clearCanvas();
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
          clearCanvas();
          return;
        }
        ctx.putImageData(snapshot, 0, 0);
      }
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const width = getTargetSize(rect.width, window.devicePixelRatio || 1);
        const height = getTargetSize(rect.height, window.devicePixelRatio || 1);

        if (canvas.width === width && canvas.height === height) {
          const ctx = getContext();
          if (ctx) configureContext(ctx);
          return;
        }

        const previousCanvas = document.createElement('canvas');
        previousCanvas.width = canvas.width;
        previousCanvas.height = canvas.height;
        const previousCtx = previousCanvas.getContext('2d');
        if (previousCtx && canvas.width > 0 && canvas.height > 0) {
          previousCtx.drawImage(canvas, 0, 0);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = getContext();
        if (!ctx) return;
        configureContext(ctx);
        if (previousCanvas.width > 0 && previousCanvas.height > 0) {
          ctx.drawImage(previousCanvas, 0, 0, previousCanvas.width, previousCanvas.height, 0, 0, width, height);
        }
        history.current = [];
      };

      resizeCanvas();

      const resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
      });
      resizeObserver.observe(canvas);

      const handleWindowResize = () => {
        resizeCanvas();
      };
      window.addEventListener('resize', handleWindowResize);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleWindowResize);
      };
    }, []);

    const getPointerMetrics = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return {
          rect: null,
          scaleX: 1,
          scaleY: 1,
          strokeScale: 1
        };
      }

      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width ? canvas.width / rect.width : 1;
      const scaleY = rect.height ? canvas.height / rect.height : 1;

      return {
        rect,
        scaleX,
        scaleY,
        strokeScale: Math.max(scaleX, scaleY)
      };
    };

    const getPos = (event: React.PointerEvent) => {
      const { rect, scaleX, scaleY } = getPointerMetrics();
      if (!rect) return { x: 0, y: 0 };

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

      configureContext(ctx);

      history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (history.current.length > HISTORY_LIMIT) history.current.shift();

      const { x, y } = getPos(event);
      const { strokeScale } = getPointerMetrics();

      ctx.strokeStyle = tool === 'pen' ? '#101114' : '#000000';
      ctx.fillStyle = tool === 'pen' ? '#101114' : '#000000';
      ctx.lineWidth = (tool === 'pen' ? penSize : eraserSize) * strokeScale;
      ctx.globalCompositeOperation = tool === 'pen' ? 'source-over' : 'destination-out';

      ctx.beginPath();
      ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y);

      lastPointRef.current = { x, y };
      isDrawingRef.current = true;
      onDirty?.();
    };

    const handlePointerMove = (event: React.PointerEvent) => {
      if (disabled || !isDrawingRef.current) return;
      event.preventDefault();
      const ctx = getContext();
      if (!ctx) return;
      const point = getPos(event);
      const previousPoint = lastPointRef.current;

      if (!previousPoint) {
        lastPointRef.current = point;
        ctx.moveTo(point.x, point.y);
        return;
      }

      const midPoint = {
        x: (previousPoint.x + point.x) / 2,
        y: (previousPoint.y + point.y) / 2
      };

      ctx.quadraticCurveTo(previousPoint.x, previousPoint.y, midPoint.x, midPoint.y);
      ctx.stroke();
      lastPointRef.current = point;
    };

    const endDrawing = (event?: React.PointerEvent) => {
      const point = event ? getPos(event) : lastPointRef.current;
      if (event) {
        const canvas = canvasRef.current;
        if (canvas?.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
        event.preventDefault();
      }

      isDrawingRef.current = false;
      lastPointRef.current = null;

      const ctx = getContext();
      if (!ctx) return;
      if (point) {
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
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
            width={DEFAULT_CANVAS_SIZE}
            height={DEFAULT_CANVAS_SIZE}
            className="block w-full h-full touch-none"
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

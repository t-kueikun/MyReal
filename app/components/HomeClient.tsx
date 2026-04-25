'use client';

import Link from 'next/link';
import { PenTool } from 'lucide-react';
import { useEffect, useRef } from 'react';

type Point = {
  x: number;
  y: number;
};

function TrialSketchLayer({
  className,
  clickThroughSelector
}: {
  className: string;
  clickThroughSelector?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const pointerStartRef = useRef<Point | null>(null);
  const clickThroughTargetRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(rect.width * ratio);
      const height = Math.round(rect.height * ratio);

      if (canvas.width === width && canvas.height === height) return;

      const previousCanvas = document.createElement('canvas');
      previousCanvas.width = canvas.width;
      previousCanvas.height = canvas.height;
      const previousCtx = previousCanvas.getContext('2d');
      if (previousCtx && canvas.width > 0 && canvas.height > 0) {
        previousCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (previousCanvas.width > 0 && previousCanvas.height > 0) {
        ctx.drawImage(previousCanvas, 0, 0, previousCanvas.width, previousCanvas.height, 0, 0, width, height);
      }
    };

    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const getClickThroughTarget = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!clickThroughSelector) return null;

    const element = document.querySelector(clickThroughSelector);
    if (!(element instanceof HTMLAnchorElement)) return null;

    const rect = element.getBoundingClientRect();
    const isInside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    return isInside ? element : null;
  };

  const beginSketch = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0) return;

    const canvas = canvasRef.current;
    const point = getPoint(event);
    const ctx = canvas?.getContext('2d');
    if (!canvas || !point || !ctx) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    isDrawingRef.current = true;
    lastPointRef.current = point;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    clickThroughTargetRef.current = getClickThroughTarget(event);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#101114';
    ctx.fillStyle = '#101114';
    ctx.lineWidth = 4 * (window.devicePixelRatio || 1);

    if (clickThroughTargetRef.current) return;

    ctx.beginPath();
    ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const continueSketch = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || activePointerIdRef.current !== event.pointerId) return;

    const point = getPoint(event);
    const previousPoint = lastPointRef.current;
    const ctx = canvasRef.current?.getContext('2d');
    if (!point || !ctx) return;

    event.preventDefault();
    const start = pointerStartRef.current;
    if (start && clickThroughTargetRef.current) {
      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (distance < 8) return;

      clickThroughTargetRef.current = null;
      lastPointRef.current = point;
      ctx.beginPath();
      ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (!previousPoint) {
      lastPointRef.current = point;
      return;
    }

    ctx.beginPath();
    ctx.moveTo(previousPoint.x, previousPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const endSketch = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;

    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }

    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    lastPointRef.current = null;

    const start = pointerStartRef.current;
    const target = clickThroughTargetRef.current;
    pointerStartRef.current = null;
    clickThroughTargetRef.current = null;

    if (!start || !target) return;

    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (distance < 8 && getClickThroughTarget(event) === target) {
      window.location.assign(target.href);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className={className}
      onPointerDown={beginSketch}
      onPointerMove={continueSketch}
      onPointerUp={endSketch}
      onPointerCancel={endSketch}
      suppressHydrationWarning
      aria-hidden="true"
    />
  );
}

export default function HomeClient({ eventMode }: { eventMode?: boolean }) {
  void eventMode;
  return (
    <div className="relative flex min-h-[70vh] select-none items-center justify-center">
      <TrialSketchLayer
        className="pointer-events-auto fixed inset-0 z-40 h-screen w-screen touch-none"
        clickThroughSelector="[data-trial-sketch-link]"
      />
      <section
        className="card relative z-30 w-full max-w-lg p-10 md:p-14 text-center space-y-8 bg-gradient-to-br from-white to-paper-1 shadow-soft-xl border-white"
      >
        <h1 className="font-heading text-4xl md:text-5xl text-ink">AReal</h1>
        <div className="flex items-center justify-center">
          <Link
            href="/draw"
            data-hotkey-next
            className="group relative flex h-52 w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-8 text-ink shadow-lift backdrop-blur-sm transition-transform duration-300 hover:scale-105 sm:w-96"
            data-trial-sketch-link
          >
            <div className="relative z-10 flex flex-col items-center justify-center">
              <PenTool size={72} className="mb-4" />
              <span className="font-heading text-3xl">描いてつくる</span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

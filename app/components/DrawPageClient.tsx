'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DrawingCanvas, { DrawingCanvasHandle } from './DrawingCanvas';
import { saveImageBlob } from '../../lib/clientStorage';
import { saveDraft } from '../../lib/draft';
import Link from 'next/link';
import { ChevronLeft, Check, Clock3 } from 'lucide-react';

const DEFAULT_PALETTE = ['#f8a4b8', '#ffd1a9', '#ffe8cc'];
const DRAWING_LIMIT_SECONDS = 30;

export default function DrawPageClient() {
  const router = useRouter();
  const drawingRef = useRef<DrawingCanvasHandle | null>(null);
  const autoSubmittedRef = useRef(false);
  const handleNextRef = useRef<(auto?: boolean) => Promise<void>>(async () => {});
  const submittingRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(DRAWING_LIMIT_SECONDS);
  const [timedOut, setTimedOut] = useState(false);

  const handleNext = async (auto = false) => {
    if (busy || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    try {
      const blob = (await drawingRef.current?.exportBlob()) ?? null;
      if (!blob) {
        alert(auto ? '自動終了できる描画がありません。' : '描画してください');
        return;
      }

      const { nanoid } = await import('nanoid');
      const draftId = nanoid(10);

      await saveImageBlob('input', blob, draftId);
      saveDraft({
        palette: DEFAULT_PALETTE,
        bgRemove: true,
        mood: 'random',
        source: 'draw'
      }, draftId);

      router.push(`/generate/${draftId}`);
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  handleNextRef.current = handleNext;

  useEffect(() => {
    if (!startedAt || busy) return;

    const updateCountdown = () => {
      const elapsedMs = Date.now() - startedAt;
      const nextRemaining = Math.max(
        0,
        Math.ceil((DRAWING_LIMIT_SECONDS * 1000 - elapsedMs) / 1000)
      );
      setRemainingSeconds(nextRemaining);
      if (nextRemaining === 0) {
        setTimedOut(true);
        return true;
      }
      return false;
    };

    if (updateCountdown()) return;

    const timerId = window.setInterval(() => {
      if (updateCountdown()) {
        window.clearInterval(timerId);
      }
    }, 250);

    return () => window.clearInterval(timerId);
  }, [startedAt, busy]);

  useEffect(() => {
    if (!timedOut || autoSubmittedRef.current || busy) return;
    autoSubmittedRef.current = true;
    void handleNextRef.current(true);
  }, [timedOut, busy]);

  const handleCanvasDirty = () => {
    if (startedAt || timedOut || busy) return;
    setStartedAt(Date.now());
    setRemainingSeconds(DRAWING_LIMIT_SECONDS);
  };

  const timerProgress = startedAt
    ? Math.max(0, (remainingSeconds / DRAWING_LIMIT_SECONDS) * 100)
    : 100;
  const timerTone = timedOut
    ? 'bg-red-100 text-red-700'
    : startedAt && remainingSeconds <= 10
      ? 'bg-orange-100 text-orange-700'
      : 'bg-white text-ink/70';

  return (
    <div className="fixed inset-0 overflow-hidden bg-paper">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/site-wallpaper.png')] bg-cover bg-center opacity-70"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-white/70"
      />

      <div className="relative z-10 flex h-full flex-col">
        <header className="z-20 flex items-center justify-between px-4 pb-3 pt-4">
          <Link href="/" className="btn btn-ghost h-12 w-12 rounded-full p-0">
            <ChevronLeft className="h-6 w-6" />
          </Link>

          <h1 className="font-heading text-xl text-ink">描く</h1>
          <div aria-hidden="true" className="h-12 w-12" />
        </header>

        <main className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-16 pt-1 md:px-6">
          <div className="relative flex h-full min-h-0 w-full items-center justify-center py-0.5">
            <div className="relative aspect-square h-full max-h-full w-auto max-w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-xl">
              <div className="h-full w-full">
                <DrawingCanvas
                  ref={drawingRef}
                  onDirty={handleCanvasDirty}
                  disabled={busy || timedOut}
                  overlayTop={(
                    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${timerTone}`}>
                      <Clock3 className="h-4 w-4" />
                      {busy
                        ? '保存中…'
                        : timedOut
                          ? '時間切れです'
                          : startedAt
                            ? `あと ${remainingSeconds} 秒`
                            : '30秒カウント'}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 pointer-events-none">
        <div className="mx-auto flex max-w-6xl items-end justify-end px-4 pb-6 sm:px-6">
          <button
            type="button"
            onClick={() => {
              void handleNext();
            }}
            disabled={busy}
            className="pointer-events-auto inline-flex h-14 items-center gap-3 rounded-full bg-ink px-7 text-lg font-bold text-white shadow-lg shadow-ink/20 transition-transform hover:scale-[1.02] disabled:scale-100"
          >
            {busy ? '処理中…' : (
              <>
                <span>次へ</span>
                <Check className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

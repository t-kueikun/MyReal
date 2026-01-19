'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DrawingCanvas, { DrawingCanvasHandle } from './DrawingCanvas';
import ImageUploader from './ImageUploader';
import PalettePicker from './PalettePicker';
import QueueStatus from './QueueStatus';
import TermsModal from './TermsModal';
import { saveImageBlob } from '../../lib/clientStorage';
import { saveDraft } from '../../lib/draft';

const DEFAULT_PALETTE = ['#f08f6f', '#f3c969', '#5a9bd8'];

type ViewState = 'landing' | 'terms' | 'app';

export default function HomeClient({ eventMode }: { eventMode: boolean }) {
  const router = useRouter();
  const drawingRef = useRef<DrawingCanvasHandle | null>(null);

  // State
  const [viewState, setViewState] = useState<ViewState>('landing');
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  const [bgRemove, setBgRemove] = useState(true);
  const [priorityCode, setPriorityCode] = useState('');
  // In the new flow, consent is implicitly true if they pass the Terms modal,
  // but we keep the state for the form check or if we want to show it again.
  // For this design, we can assume 'landing -> terms -> app' implies consent.
  // However, the original code had a checkbox. We can keep it pre-checked or remove it.
  // Let's keep it sync with the TermsModal agreement.
  const [consent, setConsent] = useState(false);

  const [error, setError] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [source, setSource] = useState<'draw' | 'upload' | null>(null);
  const [busy, setBusy] = useState(false);

  const handleStart = () => {
    setViewState('terms');
  };

  const handleAgreeTerms = () => {
    setConsent(true);
    setViewState('app');
  };

  const handleCancelTerms = () => {
    setViewState('landing');
  };

  const handleGenerate = async () => {
    setError('');
    // Double check consent if the checkbox is still visible/required
    if (!consent) {
      setError('同意のチェックをお願いします。');
      return;
    }
    setBusy(true);
    try {
      let blob: Blob | null = null;
      let usedSource: 'draw' | 'upload' | null = source;
      if (source === 'upload' && uploadedFile) {
        blob = uploadedFile;
      } else if (source === 'draw') {
        blob = (await drawingRef.current?.exportBlob()) ?? null;
      } else if (uploadedFile) {
        blob = uploadedFile;
        usedSource = 'upload';
      } else {
        blob = (await drawingRef.current?.exportBlob()) ?? null;
        usedSource = 'draw';
      }
      if (!blob) {
        setError('画像が見つかりません。描くか読み込んでください。');
        return;
      }

      const { nanoid } = await import('nanoid');
      const draftId = nanoid(10); // Short ID

      await saveImageBlob('input', blob, draftId);
      saveDraft({
        palette,
        bgRemove,
        priorityCode: priorityCode.trim() || undefined,
        source: usedSource ?? 'draw'
      }, draftId);
      router.push(`/generate/${draftId}`);
    } finally {
      setBusy(false);
    }
  };

  // -- Landing & Terms Views --
  if (viewState === 'landing') {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center space-y-10 text-center animate-fadeIn">
        <div className="space-y-4">
          <p className="text-lg font-bold uppercase tracking-[0.2em] text-accent-2">
            AI x AR Character Creator
          </p>
          <h1 className="font-heading text-6xl md:text-8xl font-black tracking-tight text-ink drop-shadow-sm">
            MyReal
          </h1>
          <p className="text-xl text-ink/70">
            描いた絵が、その場で動き出す。
          </p>
        </div>

        <button
          onClick={handleStart}
          className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-accent px-12 py-6 text-xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-accent/30"
        >
          <span className="relative z-10">START</span>
          <div className="absolute inset-0 -z-10 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>

        <div className="absolute bottom-10 flex gap-4 text-sm font-bold text-ink/40">
          <span>PWA対応</span>
          <span>•</span>
          <span>24時間限定</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {viewState === 'terms' && (
        <TermsModal onAgree={handleAgreeTerms} onCancel={handleCancelTerms} />
      )}

      <div className="space-y-8 animate-fadeIn">
        {/* Header (Simplified for App View) */}
        <header className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="font-heading text-3xl font-bold text-ink">MyReal</h1>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">BETA</span>
          </div>
          <Link href="/scan" className="btn btn-ghost text-sm">
            QR読取
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2.5fr,1fr]">
          <section className="space-y-6">
            <div className="card h-full min-h-[600px] p-6 border-2 border-dashed border-ink/5 bg-white/50 relative flex items-center justify-center">
              <DrawingCanvas
                ref={drawingRef}
                onDirty={() => setSource('draw')}
              />
            </div>
          </section>

          <aside className="space-y-6">
            <QueueStatus />
            <div className="card p-6 space-y-6 shadow-xl shadow-accent/5 ring-1 ring-black/5">

              <div className="space-y-2">
                <h2 className="font-heading text-lg font-bold text-ink">ツール & 設定</h2>
              </div>

              {/* Section: Input Source / Category */}
              <div className="space-y-4">
                <label className="block text-sm font-bold text-ink/70">画像読み込み (背景透過推奨)</label>
                <ImageUploader
                  onSelect={(file) => {
                    setUploadedFile(file);
                    if (file) setSource('upload');
                  }}
                />
              </div>

              <div className="border-t border-ink/5 pt-4 space-y-4">
                <label className="block text-sm font-bold text-ink/70">カラーパレット</label>
                <PalettePicker value={palette} onChange={setPalette} />
              </div>

              <div className="space-y-4 rounded-xl bg-paper-2 p-4">
                <label className="flex items-center gap-3 text-sm font-medium text-ink/80 cursor-pointer">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer h-5 w-5 appearance-none rounded-md border-2 border-ink/20 bg-white transition-colors checked:border-accent checked:bg-accent focus:ring-2 focus:ring-accent/30"
                      checked={bgRemove}
                      onChange={(event) => setBgRemove(event.target.checked)}
                    />
                    <svg
                      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  背景除去 (推奨)
                </label>
              </div>

              {eventMode ? (
                <label className="flex flex-col gap-2 text-sm text-ink/70">
                  <span className="font-bold">優先コード (係員用)</span>
                  <input
                    type="password"
                    value={priorityCode}
                    onChange={(event) => setPriorityCode(event.target.value)}
                    className="rounded-xl border border-ink/10 px-3 py-2 focus:ring-2 focus:ring-accent/30"
                    placeholder="コードを入力"
                  />
                </label>
              ) : null}

              {/* Hidden implicit consent checkbox, or kept as visual confirmation */}
              <label className="flex items-start gap-3 text-xs text-ink/50">
                <div className="pt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <span>
                  利用規約に同意済み (画像は48時間後に削除されます)
                </span>
              </label>

              {error ? (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                className="btn btn-primary w-full py-4 text-lg shadow-xl shadow-accent/20 transition-transform active:scale-[0.98]"
                disabled={busy}
                onClick={handleGenerate}
              >
                {busy ? '生成中...' : '生成する'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

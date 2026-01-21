'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DrawingCanvas, { DrawingCanvasHandle, Tool } from './DrawingCanvas';
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
  const [tool, setTool] = useState<Tool>('pen');
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
      <div className="flex h-screen w-full flex-col items-center justify-center space-y-10 bg-paper text-center animate-fadeIn overflow-hidden">
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

      {/* Main App Layout - Full Screen No Scroll */}
      <div className="flex h-screen w-full flex-col overflow-hidden bg-paper lg:flex-row animate-fadeIn">

        {/* Left Column: Canvas Area (Flex Grow) */}
        <main className="relative flex-1 flex flex-col min-h-0 bg-paper-1/50">
          {/* Header Overlay */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-ink">MyReal</h1>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">BETA</span>
          </div>

          <div className="absolute top-4 right-4 z-10 lg:hidden">
            {/* Mobile Toggle or simple Link for now */}
            <Link href="/scan" className="btn btn-ghost text-sm bg-white/80 backdrop-blur-sm">
              QR読取
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
            <div className="relative aspect-square w-full max-w-[85vh] lg:max-w-none lg:h-full lg:w-auto overflow-hidden rounded-3xl border-2 border-dashed border-ink/5 bg-white shadow-sm">
              <DrawingCanvas
                ref={drawingRef}
                tool={tool}
                onDirty={() => setSource('draw')}
              />
            </div>
          </div>
        </main>

        {/* Right Column: Sidebar (Fixed Width on Desktop) */}
        <aside className="w-full flex-none overflow-y-auto border-t border-ink/5 bg-white p-6 shadow-xl lg:h-full lg:w-[400px] lg:border-l lg:border-t-0 lg:p-8 z-20">
          <div className="flex h-full flex-col gap-8">

            {/* 1. Drawing Tools */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-sm font-bold text-ink/50 uppercase tracking-wider">Drawing Tools</h2>
                <Link href="/scan" className="hidden lg:inline-flex btn btn-ghost text-xs px-2 py-1 h-auto min-h-0">
                  QR読取
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => setTool('pen')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-3 transition-all ${tool === 'pen' ? 'bg-ink text-white shadow-md scale-105' : 'bg-paper-2 text-ink/70 hover:bg-ink/10'}`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                  <span className="text-[10px] font-bold">ペン</span>
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-3 transition-all ${tool === 'eraser' ? 'bg-ink text-white shadow-md scale-105' : 'bg-paper-2 text-ink/70 hover:bg-ink/10'}`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z" /><path d="M17 17L7 7" /></svg>
                  <span className="text-[10px] font-bold">消しゴム</span>
                </button>
                <button
                  onClick={() => drawingRef.current?.undo()}
                  className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-paper-2 py-3 text-ink/70 transition-all hover:bg-ink/10 active:scale-95"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" /></svg>
                  <span className="text-[10px] font-bold">戻す</span>
                </button>
                <button
                  onClick={() => drawingRef.current?.clear()}
                  className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-red-50 py-3 text-red-500 transition-all hover:bg-red-100 active:scale-95"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  <span className="text-[10px] font-bold">クリア</span>
                </button>
              </div>
            </section>

            {/* 2. Color Palette */}
            <section className="space-y-3 flex-1 min-h-0">
              <h2 className="font-heading text-sm font-bold text-ink/50 uppercase tracking-wider">Palette</h2>
              <div className="rounded-3xl bg-paper-1 border border-ink/5 p-4 overflow-y-auto max-h-[300px] lg:max-h-none">
                <PalettePicker value={palette} onChange={setPalette} />
              </div>
            </section>

            {/* 3. Settings & Actions */}
            <div className="mt-auto space-y-4 pt-4 border-t border-ink/5">
              <div className="grid grid-cols-2 gap-3">
                {/* Image Upload Compact */}
                <div className="col-span-1">
                  <ImageUploader
                    onSelect={(file) => {
                      setUploadedFile(file);
                      if (file) setSource('upload');
                    }}
                  />
                </div>

                {/* Bg Remove Toggle Compact */}
                <div className="col-span-1 flex items-center justify-center rounded-xl bg-paper-2 border border-ink/5 px-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-ink/70 cursor-pointer w-full justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-ink/20 text-accent focus:ring-accent"
                      checked={bgRemove}
                      onChange={(event) => setBgRemove(event.target.checked)}
                    />
                    背景除去
                  </label>
                </div>
              </div>

              {eventMode ? (
                <input
                  type="password"
                  value={priorityCode}
                  onChange={(event) => setPriorityCode(event.target.value)}
                  className="w-full rounded-xl border border-ink/10 bg-paper-1 px-4 py-3 text-sm focus:ring-2 focus:ring-accent/30"
                  placeholder="優先コード (係員用)"
                />
              ) : null}

              {/* Error Message */}
              {error ? (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600 border border-red-100 text-center animate-shake">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                className="group relative w-full overflow-hidden rounded-full bg-ink p-4 text-white shadow-xl transition-transform active:scale-[0.98]"
                disabled={busy}
                onClick={handleGenerate}
              >
                <div className="relative z-10 flex items-center justify-center gap-2 font-bold text-lg">
                  <span>{busy ? '生成中...' : '生成する'}</span>
                  {!busy && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>}
                </div>
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-accent to-accent-2 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

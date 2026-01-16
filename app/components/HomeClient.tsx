'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Timer, QrCode, Sparkles, Upload, Palette, Check, Lock, ScanLine, RotateCcw } from 'lucide-react';
import DrawingCanvas, { DrawingCanvasHandle } from './DrawingCanvas';
import ImageUploader from './ImageUploader';
import PalettePicker from './PalettePicker';
import QueueStatus from './QueueStatus';
import { saveImageBlob } from '../../lib/clientStorage';
import { saveDraft } from '../../lib/draft';

const DEFAULT_PALETTE = ['#f08f6f', '#f3c969', '#5a9bd8'];

export default function HomeClient({ eventMode }: { eventMode: boolean }) {
  const router = useRouter();
  const drawingRef = useRef<DrawingCanvasHandle | null>(null);
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  const [bgRemove, setBgRemove] = useState(true);
  const [priorityCode, setPriorityCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [source, setSource] = useState<'draw' | 'upload' | null>(null);
  const [busy, setBusy] = useState(false);

  // Timer States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setProgress((timeLeft / 30) * 100);
  }, [timeLeft]);

  const startDrawing = () => {
    setIsPlaying(true);
    setIsTimeUp(false);
    setTimeLeft(30);
    setProgress(100);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsPlaying(false);
          setIsTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleManualStop = () => {
    clearInterval(timerRef.current);
    setIsPlaying(false);
    setIsTimeUp(true);
    setTimeLeft(0);
    setProgress(0);
  };

  const handleGenerate = async () => {
    setError('');
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

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-ink text-white p-8 md:p-12 shadow-2xl animate-floatIn">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-2/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-2 text-white/60 text-sm font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              MyReal AI Avatar
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight">
              描いて作る、<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-2">
                今だけのキャラクター
              </span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-xl leading-relaxed">
              30秒一本勝負！あなたの落書きが、AIの力でリッチな3Dキャラクターに変身します。
            </p>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <Link href="/scan" className="btn bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md">
              <QrCode size={20} />
              QRで受け取る
            </Link>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold border border-white/10 backdrop-blur-sm">24時間限定</span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold border border-white/10 backdrop-blur-sm">PWA対応</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-[1.8fr,1fr] items-start">

        {/* Left Column: Drawing Area */}
        <section className="space-y-6">
          {/* Main Card - Refactored for Full Screen */}
          <div className="min-h-[500px] relative">
            <div className={`flex flex-col isolate transition-all duration-300 ${isPlaying ? 'fixed inset-0 z-50 bg-[#f6f4f0] h-full w-full' : 'relative h-full'}`}>
              <div className={`absolute inset-0 card -z-10 ${isPlaying ? 'opacity-0' : 'opacity-100'}`} />

              {/* Content Layer */}
              <div className="relative z-10 flex flex-col flex-1 p-1">
                <div className={`p-5 flex items-center justify-between border-b border-ink/5 ${isPlaying ? 'hidden' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-accent/10 text-accent">
                      <Timer size={22} />
                    </div>
                    <h2 className="font-heading text-xl font-bold">1. 描く / 読み込む</h2>
                  </div>

                  {/* Time Display for Desktop */}
                  {!isPlaying && !isTimeUp && (
                    <span className="font-mono font-bold text-ink/40 text-sm bg-ink/5 px-3 py-1 rounded-full">
                      LIMIT: 30s
                    </span>
                  )}
                </div>

                {/* Drawing Content */}
                <div className={`flex flex-col flex-1 transition-all duration-500 ${isPlaying ? 'p-4 md:p-8 animate-scaleUp' : 'p-4 relative'}`}>

                  {/* Full Screen Header */}
                  {isPlaying && (
                    <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0 max-w-5xl mx-auto w-full">
                      <div className="flex flex-col">
                        <span className="text-sm text-ink/50 font-bold uppercase tracking-widest">Time Remaining</span>
                        <div className={`font-mono text-5xl md:text-6xl font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-ink'}`}>
                          {timeLeft}
                          <span className="text-base ml-2 font-bold text-ink/40">SEC</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-lg px-8 shadow-2xl"
                        onClick={handleManualStop}
                      >
                        <Check size={24} />
                        描き終わった！
                      </button>
                    </div>
                  )}

                  {isPlaying && (
                    <div className="w-full h-2 bg-black/5 rounded-full mb-4 overflow-hidden max-w-5xl mx-auto">
                      <div
                        className="h-full bg-accent transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}

                  <div className={`relative ${isPlaying ? 'flex-1 min-h-0 w-full flex items-center justify-center max-w-5xl mx-auto' : 'h-[400px]'}`}>
                    <DrawingCanvas
                      ref={drawingRef}
                      onDirty={() => setSource('draw')}
                      disabled={!isPlaying}
                      className={isPlaying ? 'h-full w-full shadow-2xl rounded-3xl overflow-hidden bg-white' : 'h-full rounded-2xl border border-ink/5 bg-white/50'}
                    />

                    {/* Start / TimeUp / Idle Overlay */}
                    {!isPlaying && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl">
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-2xl" />

                        <div className="relative z-10 p-8 text-center animate-floatIn">
                          {isTimeUp ? (
                            <div className="space-y-6">
                              <div className="inline-flex p-4 rounded-full bg-accent text-white shadow-lg shadow-accent/30 mb-2">
                                <Check size={48} />
                              </div>
                              <h3 className="text-4xl font-heading font-black text-ink">Finished!</h3>
                              <p className="text-ink/60 font-medium">素晴らしい作品です！</p>
                              <button
                                onClick={startDrawing}
                                className="btn btn-ghost bg-white/80 backdrop-blur-sm"
                              >
                                <RotateCcw size={18} />
                                描き直す
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-8 max-w-xs mx-auto">
                              <div className="space-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent-2 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-accent/20">
                                  <Timer size={32} className="text-white" />
                                </div>
                                <h3 className="text-2xl font-heading font-bold">お絵かきスタート</h3>
                                <p className="text-ink/60 text-sm">
                                  30秒の制限時間で、直感的に描いてみましょう。
                                </p>
                              </div>
                              <button
                                onClick={startDrawing}
                                className="btn btn-primary w-full py-4 text-lg shadow-xl shadow-ink/20 hover:scale-105 active:scale-95 transition-all"
                              >
                                START (全画面)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-ink/5 bg-ink/[0.02]">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <p className="text-xs font-bold text-ink/40 uppercase tracking-widest">- または写真をアップロード -</p>
                    <ImageUploader
                      onSelect={(file) => {
                        setUploadedFile(file);
                        if (file) setSource('upload');
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Settings */}
        <aside className="space-y-6 h-full">
          <QueueStatus />

          <div className="card p-6 space-y-8 sticky top-6">
            <div className="flex items-center gap-2 pb-4 border-b border-ink/5">
              <div className="p-2 rounded-full bg-accent-2/10 text-accent-2">
                <Palette size={20} />
              </div>
              <h2 className="font-heading text-xl font-bold">2. 仕上げ設定</h2>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-ink/70">カラーパレット</label>
              <PalettePicker value={palette} onChange={setPalette} />
            </div>

            <div className="space-y-4 pt-4 border-t border-ink/5">
              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink/5 transition-colors cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={bgRemove}
                    onChange={(event) => setBgRemove(event.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-ink/20 transition-all checked:border-accent checked:bg-accent hover:border-accent"
                  />
                  <Check size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-ink group-hover:text-accent transition-colors">背景除去</span>
                  <span className="text-xs text-ink/50">人物やキャラを切り抜く</span>
                </div>
              </label>

              {eventMode && (
                <label className="block p-3 rounded-xl bg-ink/5 border border-ink/5">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-ink/50 uppercase">
                    <Lock size={12} />
                    優先コード (係員用)
                  </div>
                  <input
                    type="password"
                    value={priorityCode}
                    onChange={(event) => setPriorityCode(event.target.value)}
                    className="w-full bg-transparent border-none p-0 text-ink placeholder:text-ink/30 focus:ring-0 font-mono text-lg tracking-widest"
                    placeholder="••••"
                  />
                </label>
              )}

              <label className="flex items-start gap-3 p-3 rounded-xl bg-ink/[0.02] border border-ink/5">
                <div className="relative flex items-center pt-1">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-ink/20 transition-all checked:border-ink checked:bg-ink hover:border-ink"
                  />
                  <Check size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <span className="text-xs text-ink/60 leading-relaxed">
                  画像は体験日から最大48時間で削除されます。<br />プライバシーポリシーに同意します。
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary w-full py-4 text-lg shadow-xl shadow-ink/20 group"
              disabled={busy || (!isTimeUp && !uploadedFile && source !== 'upload')}
              onClick={handleGenerate}
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="animate-spin" size={20} />
                  準備中…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles size={20} className="group-hover:animate-pulse" />
                  生成する
                </span>
              )}
            </button>

            {!isTimeUp && !uploadedFile && source !== 'upload' && (
              <p className="text-center text-xs text-ink/40 font-bold">
                ※アップロードするか、お絵かきを完了してください
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// Helper component for icon import if needed, but imported at top.


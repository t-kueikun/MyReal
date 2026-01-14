'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const timerRef = useRef<NodeJS.Timeout>();

  const startDrawing = () => {
    setIsPlaying(true);
    setIsTimeUp(false);
    setTimeLeft(30);
    // Auto-clear canvas on start if needed? No, let user keep previous scribbles or manual clear.

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
    <div className="space-y-8">
      <section className="card p-6 md:p-10 animate-floatIn">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-widest text-ink/50">MyReal</p>
            <h1 className="font-heading text-3xl md:text-5xl">
              描いて作る、今だけのキャラクター
            </h1>
            <p className="text-ink/70">
              30秒一本勝負！あなたの絵がAIでリッチな3Dキャラに変身します。
            </p>
          </div>
          <div className="flex gap-2">
            <span className="tag">24時間限定</span>
            <span className="tag">PWA対応</span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/scan" className="btn btn-ghost">
            QRを読み込む
          </Link>
        </div>
      </section>

      {/* Enlarged Layout: 1.8fr vs 0.8fr */}
      <div className="grid gap-8 lg:grid-cols-[1.8fr,0.8fr]">
        <section className="space-y-6">
          <div className="card p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl">1. 描く / 読み込む</h2>
              {/* Timer Display (Normal View) */}
              {!isPlaying && !isTimeUp && (
                <div className="font-mono text-xl font-bold text-ink">
                  30秒制限
                </div>
              )}
            </div>

            {/* Drawing Container - Toggles Full Screen */}
            <div className={`transition-all duration-300 ${isPlaying
              ? 'fixed inset-0 z-50 bg-[#f6f4f0] flex flex-col p-4 animate-scaleUp'
              : 'relative'
              }`}>

              {/* Full Screen Header */}
              {isPlaying && (
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <div className={`font-mono text-4xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-ink'}`}>
                    {timeLeft}
                    <span className="text-sm ml-1">SEC</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm px-6"
                    onClick={handleManualStop}
                  >
                    描き終わった！
                  </button>
                </div>
              )}

              <div className={`relative ${isPlaying ? 'flex-1 min-h-0 w-full flex items-center justify-center' : ''}`}>
                <DrawingCanvas
                  ref={drawingRef}
                  onDirty={() => setSource('draw')}
                  disabled={!isPlaying}
                  className={isPlaying ? 'h-full w-full object-contain' : ''}
                />

                {/* Start / TimeUp Overlay */}
                {!isPlaying && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl animate-fadeIn">
                    {isTimeUp ? (
                      <div className="text-center space-y-4">
                        <h3 className="text-4xl font-heading text-ink">TIME UP!</h3>
                        <p className="text-ink/70">素晴らしい！</p>
                        <div className="flex gap-4 justify-center">
                          <button
                            onClick={startDrawing}
                            className="btn btn-ghost"
                          >
                            描き直す
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-2xl font-heading">お絵かきスタート</h3>
                          <p className="text-ink/70">30秒で描いてみよう！</p>
                        </div>
                        <button
                          onClick={startDrawing}
                          className="btn btn-primary text-lg px-10 py-4 h-auto shadow-xl hover:scale-105 transition-transform"
                        >
                          START (全画面)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 relative z-10">
              <p className="text-xs text-center text-ink/50 mb-2">- または写真をアップロード -</p>
              <ImageUploader
                onSelect={(file) => {
                  setUploadedFile(file);
                  if (file) setSource('upload');
                }}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <QueueStatus />
          <div className="card p-6 space-y-4">
            <h2 className="font-heading text-xl">2. 仕上げ設定</h2>
            <PalettePicker value={palette} onChange={setPalette} />
            <label className="flex items-center gap-3 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={bgRemove}
                onChange={(event) => setBgRemove(event.target.checked)}
              />
              背景除去を試す (サーバー側で処理)
            </label>
            {eventMode ? (
              <label className="flex flex-col gap-2 text-sm text-ink/70">
                優先コード (係員用)
                <input
                  type="password"
                  value={priorityCode}
                  onChange={(event) => setPriorityCode(event.target.value)}
                  className="rounded-xl border border-ink/10 px-3 py-2"
                  placeholder="コードを入力"
                />
              </label>
            ) : null}
            <label className="flex items-start gap-3 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                画像は体験日から最大48時間で削除されます。プライバシーに同意します。
              </span>
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}



            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={busy || (!isTimeUp && !uploadedFile && source !== 'upload')}
              onClick={handleGenerate}
            >
              {busy ? '準備中…' : '生成する'}
            </button>
            {!isTimeUp && !uploadedFile && source !== 'upload' && (
              <p className="text-xs text-center text-ink/50">※アップロードするか、お絵かきを完了させてください</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

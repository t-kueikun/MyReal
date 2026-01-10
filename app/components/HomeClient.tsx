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
        blob = await drawingRef.current?.exportBlob();
      } else if (uploadedFile) {
        blob = uploadedFile;
        usedSource = 'upload';
      } else {
        blob = await drawingRef.current?.exportBlob();
        usedSource = 'draw';
      }
      if (!blob) {
        setError('画像が見つかりません。描くか読み込んでください。');
        return;
      }
      await saveImageBlob('input', blob);
      saveDraft({
        palette,
        bgRemove,
        priorityCode: priorityCode.trim() || undefined,
        source: usedSource ?? 'draw'
      });
      router.push('/generate');
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
              30–60秒で描いてAIで彩る。QRで受け取り、会場でAR撮影。
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

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <section className="space-y-6">
          <div className="card p-6">
            <h2 className="font-heading text-xl">1. 描く / 読み込む</h2>
            <p className="text-sm text-ink/70">
              線画でも写真でもOK。透明背景がおすすめです。
            </p>
            <div className="mt-5 grid gap-6">
              <DrawingCanvas
                ref={drawingRef}
                onDirty={() => setSource('draw')}
              />
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
              disabled={busy}
              onClick={handleGenerate}
            >
              {busy ? '準備中…' : '生成する'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

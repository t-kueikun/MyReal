'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QueueStatus from './QueueStatus';
import { saveImageBlob } from '../../lib/clientStorage';
import { saveDraft } from '../../lib/draft';
import { PenTool, Upload } from 'lucide-react';

export default function HomeClient({ eventMode }: { eventMode: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleUploadContinue = async (file: File) => {
    setBusy(true);
    try {
      const { nanoid } = await import('nanoid');
      const draftId = nanoid(10);
      await saveImageBlob('input', file, draftId);
      // Default settings for upload
      saveDraft({
        palette: ['#f08f6f', '#f3c969', '#5a9bd8'],
        bgRemove: true,
        source: 'upload'
      }, draftId);
      router.push(`/generate/${draftId}`);
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <section className="card p-8 md:p-16 animate-floatIn text-center space-y-8 bg-gradient-to-br from-white to-paper-1 shadow-soft-xl border-white">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-widest text-ink/50 font-bold">AI × AR Character Maker</p>
          <h1 className="font-heading text-4xl md:text-6xl text-ink leading-tight">
            MyReal
          </h1>
          <p className="text-lg text-ink/70 max-w-xl mx-auto">
            あなたの落書きが、AIで命を吹き込まれる。<br />
            そして現実世界へ。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
          <Link href="/draw" className="group relative w-full sm:w-64 h-40 bg-ink rounded-3xl overflow-hidden shadow-lift hover:scale-105 transition-transform duration-300 flex flex-col items-center justify-center text-white p-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <PenTool size={48} className="mb-4" />
            <span className="font-heading text-2xl">描いてつくる</span>
            <span className="text-sm opacity-70 mt-1">Start Drawing</span>
          </Link>

          <div className="relative w-full sm:w-64 h-40 bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-lift border border-ink/5 hover:scale-105 transition-transform duration-300 flex flex-col items-center justify-center text-ink p-6 cursor-pointer">
            {/* Overlay Input */}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadContinue(file);
              }}
            />
            <Upload size={48} className="mb-4 text-accent" />
            <span className="font-heading text-2xl">画像をよみこむ</span>
            <span className="text-sm opacity-60 mt-1">Upload Image</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        <div className="card p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">1</div>
          <div>
            <h3 className="font-bold mb-1">描く</h3>
            <p className="text-sm text-ink/70">簡単な線画やシルエットを描きます。色はAIが提案します。</p>
          </div>
        </div>
        <div className="card p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-accent-2/10 flex items-center justify-center text-accent-2 font-bold">2</div>
          <div>
            <h3 className="font-bold mb-1">生成</h3>
            <p className="text-sm text-ink/70">Gemini AIがあなたの絵をハイクオリティなキャラクターに変換。</p>
          </div>
        </div>
        <div className="card p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center text-ink font-bold">3</div>
          <div>
            <h3 className="font-bold mb-1">AR撮影</h3>
            <p className="text-sm text-ink/70">会場の好きな場所に配置して記念撮影。24時間限定です。</p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link href="/scan" className="btn btn-ghost inline-flex items-center gap-2">
          過去の作品を呼び出す (QRスキャン)
        </Link>
      </div>

      <div className="fixed bottom-4 right-4 z-50">
        <QueueStatus />
      </div>
    </div>
  );
}

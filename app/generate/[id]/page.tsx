'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { deleteImageBlob, loadImageBlob } from '../../../lib/clientStorage';
import { clearDraft, loadDraft, loadResult, saveResult, SavedResult } from '../../../lib/draft';
import FeedbackForm from '../../components/FeedbackForm';

type GenerateResult = SavedResult;

const AUTO_KEY = 'myreal:auto-generate';

export default function GeneratePage({ params }: { params: { id: string } }) {
  const { id: draftId } = params;
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [qr, setQr] = useState<string>('');
  const [error, setError] = useState('');
  const didRunRef = useRef(false);

  const runGenerate = async (force = false) => {
    // 1. Check if result already exists for this ID (Reload Support)
    const existingResult = loadResult(draftId);
    if (existingResult && !force) {
      setResult(existingResult);
      setState('done');
      const url = `${window.location.origin}/ar/${existingResult.token}`;
      QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setQr);
      return;
    }

    if (!force) {
      const last = Number(sessionStorage.getItem(AUTO_KEY) || '0');
      if (Date.now() - last < 2000) {
        return;
      }
      sessionStorage.setItem(AUTO_KEY, Date.now().toString());
    }

    setState('loading');
    setError('');

    // 2. Load Draft Data using ID
    const draft = loadDraft(draftId);
    const blob = await loadImageBlob('input', draftId);

    if (!draft || !blob) {
      setError('入力データが見つかりません。最初からやり直してください。');
      setState('error');
      return;
    }

    const file = new File([blob], 'input.png', { type: blob.type || 'image/png' });
    const form = new FormData();
    form.append('file', file);
    form.append('palette', JSON.stringify(draft.palette));
    form.append('bgRemove', draft.bgRemove ? '1' : '0');
    form.append('source', draft.source);
    if (draft.priorityCode) form.append('priorityCode', draft.priorityCode);

    const res = await fetch('/api/generate', {
      method: 'POST',
      body: form
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({ message: '生成に失敗しました。' }));
      setError(payload.message || '生成に失敗しました。');
      setState('error');
      return;
    }

    const data = (await res.json()) as GenerateResult;

    // 3. Save Result and Clear Draft
    saveResult(draftId, data);
    setResult(data);
    clearDraft(draftId);
    deleteImageBlob('input', draftId).catch(() => null);

    setState('done');
    const url = `${window.location.origin}/ar/${data.token}`;
    QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setQr);
  };

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;
    runGenerate().catch(() => {
      setError('生成に失敗しました。');
      setState('error');
    });
  }, [draftId]);

  const handleDownload = async () => {
    if (!result) return;
    const res = await fetch(result.imageUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'myreal.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (state === 'loading') {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16 space-y-8">
        <div className="card p-8 space-y-6">
          <h1 className="font-heading text-2xl">生成中…</h1>
          <div className="skeleton h-64 w-full" />
          <p className="text-ink/70">AIがゆるキャラを作成しています。</p>
        </div>
      </main>
    );
  }

  if (state === 'error') {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16 space-y-6">
        <div className="card p-8 space-y-4">
          <h1 className="font-heading text-2xl">生成に失敗しました</h1>
          <p className="text-ink/70">{error}</p>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={() => runGenerate(true)}>
              再試行
            </button>
            <Link href="/" className="btn btn-ghost">
              もう一度つくる
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <section className="card p-6 md:p-10 space-y-4">
        <h1 className="font-heading text-2xl">完成！</h1>
        <p className="text-ink/70">
          QRで受け取り、会場でAR撮影を楽しもう。
        </p>
        <div className="grid gap-6 md:grid-cols-[1.2fr,0.8fr] items-start">
          <div className="space-y-4">
            {result ? (
              <img
                src={result.imageUrl}
                alt="生成結果"
                className="w-full rounded-3xl bg-white p-4 shadow-soft"
              />
            ) : null}
            <div className="flex flex-wrap gap-3">
              {result ? (
                <Link href={`/ar/${result.token}`} className="btn btn-accent">
                  撮影をはじめる
                </Link>
              ) : null}
              <button className="btn btn-ghost" onClick={handleDownload}>
                保存
              </button>
              <Link href="/" className="btn btn-ghost">
                もう一度つくる
              </Link>
            </div>
            {result ? (
              <p className="text-sm text-ink/60">
                有効期限: {new Date(result.expiresAt).toLocaleString()}
              </p>
            ) : null}
            {result ? (
              <p className="text-xs text-ink/50">
                生成エンジン:{' '}
                {result.provider === 'gemini'
                  ? 'Gemini'
                  : result.provider === 'openrouter'
                    ? 'OpenRouter (Gemini)'
                    : 'ローカル簡易'}
                {result.geminiFailed ? ' (Gemini失敗時フォールバック)' : ''}
              </p>
            ) : null}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink/10 bg-white p-4 text-center">
              <p className="text-sm font-semibold text-ink/70">QRコード</p>
              {qr ? (
                <img src={qr} alt="QRコード" className="mx-auto mt-3" />
              ) : (
                <div className="skeleton h-48 w-full" />
              )}
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white p-4 text-sm text-ink/70">
              QRを読み取ると24時間限定の撮影ページにアクセスできます。
            </div>
          </div>
        </div>
      </section>
      {result ? <FeedbackForm token={result.token} /> : null}
    </main>
  );
}

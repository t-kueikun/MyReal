'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { deleteImageBlob, loadImageBlob } from '../../../lib/clientStorage';
import {
  clearDraft,
  loadDraft,
  loadResult,
  saveResult,
  type GenerationDraft,
  type SavedResult
} from '../../../lib/draft';
import { MOOD_OPTIONS, type MoodId } from '../../../lib/mood';
import { VARIATION_OPTIONS, type VariationId } from '../../../lib/variation';
import FeedbackForm from '../../components/FeedbackForm';
import PalettePicker from '../../components/PalettePicker';

type GenerateResult = SavedResult;

const AUTO_KEY = 'myreal:auto-generate';

export default function GeneratePage() {
  const params = useParams();
  const draftId = params.id as string;
  const [state, setState] = useState<'loading' | 'ready' | 'done' | 'error'>('loading');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [qr, setQr] = useState<string>('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<GenerationDraft | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [mood, setMood] = useState<MoodId>('random');
  const [palette, setPalette] = useState<string[]>(['#f08f6f', '#f3c969', '#5a9bd8']);
  const [variation, setVariation] = useState<VariationId>('standard');
  const [elapsed, setElapsed] = useState(0);
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
    const activeDraft = draft ?? loadDraft(draftId);
    const blob = await loadImageBlob('input', draftId);

    if (!activeDraft || !blob) {
      setError('入力データが見つかりません。最初からやり直してください。');
      setState('error');
      return;
    }

    const file = new File([blob], 'input.png', { type: blob.type || 'image/png' });
    const form = new FormData();
    form.append('file', file);
    form.append('palette', JSON.stringify(palette));
    form.append('bgRemove', activeDraft.bgRemove ? '1' : '0');
    form.append('mood', mood);
    form.append('variation', variation);
    form.append('source', activeDraft.source);
    if (activeDraft.priorityCode) form.append('priorityCode', activeDraft.priorityCode);

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
    const init = async () => {
      const existingResult = loadResult(draftId);
      if (existingResult) {
        setResult(existingResult);
        setState('done');
        const url = `${window.location.origin}/ar/${existingResult.token}`;
        QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setQr);
        return;
      }

      const loadedDraft = loadDraft(draftId);
      const blob = await loadImageBlob('input', draftId);
      if (!loadedDraft || !blob) {
        setError('入力データが見つかりません。最初からやり直してください。');
        setState('error');
        return;
      }
      setDraft(loadedDraft);
      setMood((loadedDraft.mood as MoodId) || 'random');
      setPalette(loadedDraft.palette);
      setPreviewUrl(URL.createObjectURL(blob));
      setState('ready');
    };

    init().catch(() => {
      setError('生成に失敗しました。');
      setState('error');
    });
  }, [draftId]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (state !== 'loading') {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state]);

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
    const progress = Math.min(90, Math.round((elapsed / 40) * 100));
    return (
      <main className="mx-auto max-w-5xl px-6 py-16 space-y-8">
        <div className="card p-8 space-y-6">
          <h1 className="font-heading text-2xl">生成中…</h1>
          <div className="skeleton h-64 w-full" />
          <div className="space-y-3">
            <div className="h-2 w-full rounded-full bg-ink/10 overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-ink/70">AIがゆるキャラを作成しています。</p>
            <p className="text-xs text-ink/50">
              目安: 20〜40秒 / 経過: {elapsed}秒
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (state === 'ready') {
    return (
      <main className="min-h-screen px-6 py-6 flex items-center justify-center">
        <div className="card w-full max-w-md p-6 space-y-4">
          <div className="space-y-2">
            <h1 className="font-heading text-xl">仕上げを選ぶ</h1>
            <p className="text-sm text-ink/70">
              仕上げムードを選んでから生成します。
            </p>
          </div>
          {previewUrl ? (
            <div className="rounded-3xl bg-white p-3 shadow-soft">
              <img
                src={previewUrl}
                alt="入力画像"
                className="w-full max-h-[38vh] object-contain"
              />
            </div>
          ) : null}
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink/50 uppercase tracking-widest block">
                色を指定
              </label>
              <PalettePicker value={palette} onChange={setPalette} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink/50 uppercase tracking-widest block">
                仕上げムード
              </label>
              <select
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-2 text-sm"
                value={mood}
                onChange={(event) => setMood(event.target.value as MoodId)}
              >
                {MOOD_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink/50">
                おまかせは毎回ランダムで変化します。
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink/50 uppercase tracking-widest block">
                変化量
              </label>
              <div className="grid grid-cols-3 gap-2">
                {VARIATION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`btn ${variation === option.id ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setVariation(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink/50">
                「大きく」にすると似た絵でも変化が強くなります。
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={() => runGenerate(true)}>
              生成する
            </button>
            <Link href="/" className="btn btn-ghost">
              もどる
            </Link>
          </div>
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
          <div className="text-xs text-ink/50 space-y-1">
            <p>・通信が不安定な場合は少し待って再試行してください。</p>
            <p>・混雑時は時間をおいて再試行すると通りやすいです。</p>
            <p>・画像が大きい場合は描き直すと成功率が上がります。</p>
          </div>
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
            {result ? (
              <div className="rounded-2xl border border-ink/10 bg-ink/[0.02] p-4 space-y-2">
                <p className="text-sm font-semibold text-ink/80">
                  iPhoneはここからARを開く
                </p>
                <Link href={`/ar/${result.token}`} className="btn btn-accent w-full py-4 text-lg">
                  iPhone ARで開く
                </Link>
                <p className="text-xs text-ink/50">
                  AndroidはQRから開いてください。
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
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

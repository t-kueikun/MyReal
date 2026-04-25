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
import PalettePicker, { PALETTE_PRESETS } from '../../components/PalettePicker';

type GenerateResult = SavedResult;

type PendingCompletion = {
  result: GenerateResult;
  qrUrl: string;
};

const AUTO_KEY = 'areal:auto-generate';
const EMPTY_PALETTE: string[] = [];
const VARIATION_HELP: Record<VariationId, string> = {
  subtle: '元の絵の雰囲気を残しつつ、やさしく整えます。',
  standard: 'ほどよくアレンジして、ゆるキャラらしさを足します。',
  bold: '小物や形を大きく変えて、印象をしっかり変えます。'
};

function isSamePalette(left: string[], right: string[]) {
  return left.length === right.length && left.every((color, index) => color === right[index]);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    tagName === 'BUTTON'
  );
}

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
  const [palette, setPalette] = useState<string[]>(EMPTY_PALETTE);
  const [variation, setVariation] = useState<VariationId>('standard');
  const [elapsed, setElapsed] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [pendingCompletion, setPendingCompletion] = useState<PendingCompletion | null>(null);
  const didRunRef = useRef(false);
  const loadingStartedAtRef = useRef<number | null>(null);
  const pendingCompletionRef = useRef<PendingCompletion | null>(null);
  const activeVariation =
    VARIATION_OPTIONS.find((option) => option.id === variation) ?? VARIATION_OPTIONS[1];
  const activePaletteIndex = PALETTE_PRESETS.findIndex((preset) =>
    isSamePalette(preset.colors, palette)
  );
  const paletteIndex = activePaletteIndex >= 0 ? activePaletteIndex : 0;
  const prevPalette = PALETTE_PRESETS[
    (paletteIndex - 1 + PALETTE_PRESETS.length) % PALETTE_PRESETS.length
  ];
  const nextPalette = PALETTE_PRESETS[(paletteIndex + 1) % PALETTE_PRESETS.length];
  const activeMoodIndex = MOOD_OPTIONS.findIndex((option) => option.id === mood);
  const moodIndex = activeMoodIndex >= 0 ? activeMoodIndex : 0;
  const prevMood = MOOD_OPTIONS[
    (moodIndex - 1 + MOOD_OPTIONS.length) % MOOD_OPTIONS.length
  ];
  const nextMood = MOOD_OPTIONS[(moodIndex + 1) % MOOD_OPTIONS.length];

  const runGenerate = async (force = false) => {
    try {
      // 1. Check if result already exists for this ID (Reload Support)
      const existingResult = loadResult(draftId);
      if (existingResult && !force) {
        setResult(existingResult);
        const url = `${window.location.origin}/ar/${existingResult.token}`;
        QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setQr);
        setDisplayProgress(100);
        setPendingCompletion(null);
        setState('done');
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
      setDisplayProgress(0);
      setPendingCompletion(null);

      // 2. Load Draft Data using ID
      const activeDraft = draft ?? loadDraft(draftId);
      const blob = await loadImageBlob('input', draftId);

      if (!activeDraft || !blob) {
        setError('入力データが見つかりません。最初からやり直してください。');
        setState('error');
        return;
      }

      if (palette.length !== 3) {
        setError('カラーを選んでから生成してください。');
        setState('ready');
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
        const payload = await res
          .json()
          .catch(() => ({ message: '生成に失敗しました。' }));
        setError(payload.message || '生成に失敗しました。');
        setState('error');
        return;
      }

      const data = (await res.json()) as GenerateResult;

      // 3. Save Result and Clear Draft
      saveResult(draftId, data);
      clearDraft(draftId);
      deleteImageBlob('input', draftId).catch(() => null);

      const url = `${window.location.origin}/ar/${data.token}`;
      setPendingCompletion({
        result: data,
        qrUrl: url
      });
    } catch {
      setError('通信が不安定です。少し待って再試行してください。');
      setState('error');
    }
  };

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;
    const init = async () => {
      const existingResult = loadResult(draftId);
      if (existingResult) {
        setResult(existingResult);
        setDisplayProgress(100);
        setPendingCompletion(null);
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
      setPalette(EMPTY_PALETTE);
      setDisplayProgress(0);
      setPendingCompletion(null);
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
    pendingCompletionRef.current = pendingCompletion;
  }, [pendingCompletion]);

  useEffect(() => {
    if (state !== 'loading') {
      loadingStartedAtRef.current = null;
      setElapsed(0);
      return;
    }

    const start = Date.now();
    loadingStartedAtRef.current = start;
    setElapsed(0);

    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);

    return () => window.clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (state !== 'loading') {
      setDisplayProgress(0);
      return;
    }

    let frameId = 0;
    const DURATION_MS = 20_000;

    const easeInOutCubic = (t: number) =>
      t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const tick = () => {
      const startedAt = loadingStartedAtRef.current ?? Date.now();
      const elapsedMs = Date.now() - startedAt;
      const raw = Math.min(elapsedMs / DURATION_MS, 1);
      const eased = easeInOutCubic(raw);
      const target = eased * 100;

      setDisplayProgress(target);

      if (raw < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [state]);

  useEffect(() => {
    if (state !== 'loading' || !pendingCompletion || displayProgress < 100) {
      return;
    }

    const id = window.setTimeout(() => {
      setResult(pendingCompletion.result);
      QRCode.toDataURL(pendingCompletion.qrUrl, { margin: 1, width: 240 }).then(setQr);
      setPendingCompletion(null);
      setState('done');
    }, 700);

    return () => window.clearTimeout(id);
  }, [state, pendingCompletion, displayProgress]);

  useEffect(() => {
    if (state !== 'ready') return;

    const cyclePalette = (direction: 1 | -1) => {
      const currentIndex = PALETTE_PRESETS.findIndex((preset) =>
        isSamePalette(preset.colors, palette)
      );
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex =
        (baseIndex + direction + PALETTE_PRESETS.length) % PALETTE_PRESETS.length;
      setPalette(PALETTE_PRESETS[nextIndex].colors);
    };

    const cycleMood = (direction: 1 | -1) => {
      const currentIndex = MOOD_OPTIONS.findIndex((option) => option.id === mood);
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex =
        (baseIndex + direction + MOOD_OPTIONS.length) % MOOD_OPTIONS.length;
      setMood(MOOD_OPTIONS[nextIndex].id);
    };

    const cycleVariation = (direction: 1 | -1) => {
      const currentIndex = VARIATION_OPTIONS.findIndex((option) => option.id === variation);
      const baseIndex = currentIndex >= 0 ? currentIndex : 1;
      const nextIndex =
        (baseIndex + direction + VARIATION_OPTIONS.length) % VARIATION_OPTIONS.length;
      setVariation(VARIATION_OPTIONS[nextIndex].id);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        isTypingTarget(event.target)
      ) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();

      if (key === 'q') {
        event.preventDefault();
        cyclePalette(-1);
        return;
      }

      if (key === 'w') {
        event.preventDefault();
        cyclePalette(1);
        return;
      }

      if (key === 'e') {
        event.preventDefault();
        cycleMood(-1);
        return;
      }

      if (key === 'r') {
        event.preventDefault();
        cycleMood(1);
        return;
      }

      if (key === 'd') {
        event.preventDefault();
        cycleVariation(-1);
        return;
      }

      if (key === 'f') {
        event.preventDefault();
        cycleVariation(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, palette, mood, variation]);

  const handleDownload = async () => {
    if (!result) return;
    const res = await fetch(result.imageUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'areal.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (state === 'loading') {
    const messages = [
      '🎨 AIがゆるキャラを描いています…',
      '✨ 色をぬりぬり中…',
      '🖌️ 輪郭を整えています…',
      '🌈 仕上げに色をのせています…',
      '🎀 かわいさをチェック中…',
      '🔮 魔法をかけています…',
      '💫 もうすぐできあがり！',
    ];
    const msgIndex = Math.floor(elapsed / 4) % messages.length;

    return (
      <main className="mx-auto max-w-5xl px-6 py-16 space-y-8">
        <div className="card p-8 space-y-6">
          <h1 className="font-heading text-2xl">生成中…</h1>
          <div className="flex items-center justify-center h-64 w-full rounded-2xl bg-white/40">
            <span className="animate-pulse-glow text-6xl select-none">✨</span>
          </div>
          <div className="space-y-3">
            <div className="h-3 w-full rounded-full bg-ink/10 overflow-hidden">
              <div
                className="h-full progress-bar"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <p
              className="animate-fade-msg text-ink/80 font-semibold"
              key={msgIndex}
            >
              {messages[msgIndex]}
            </p>
            <p className="text-xs text-ink/50">
              進行度: {Math.min(100, Math.round(displayProgress))}% / 経過: {elapsed}秒
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (state === 'ready') {
    return (
      <main className="min-h-screen overflow-y-auto overflow-x-hidden px-3 py-3 pb-8 sm:px-4 sm:py-4 sm:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col">
          <div className="card flex flex-col p-3 md:p-4">
            <div className="mb-3 space-y-1">
              <h1 className="font-heading text-2xl">仕上げを選ぶ</h1>
              <p className="text-sm text-ink/70">
                描いた絵を確認して、色と変化量を決めてから生成します。
              </p>
            </div>

            <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr),336px]">
              <section className="min-h-0 lg:sticky lg:top-4">
                {previewUrl ? (
                  <div className="flex h-[46vh] min-h-[320px] items-center justify-center rounded-[2rem] border border-white/60 bg-white p-2.5 shadow-soft lg:h-[min(62vh,720px)]">
                    <img
                      src={previewUrl}
                      alt="入力画像"
                      className="h-full max-h-full w-full rounded-[1.5rem] object-contain"
                    />
                  </div>
                ) : null}
              </section>

              <section className="flex min-h-0 flex-col gap-3 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:pr-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-[0.24em] text-ink/50">
                  色を指定
                </label>
                <PalettePicker value={palette} onChange={setPalette} presetsOnly />
                <p className="text-[10px] leading-tight text-ink/45">
                  Q:前 / W:次 ・ {paletteIndex + 1}/{PALETTE_PRESETS.length} ・ 前:{prevPalette.name} ・ 次:{nextPalette.name}
                </p>
                {palette.length !== 3 ? (
                  <p className="text-xs text-ink/50">
                    生成前にカラーを1つ選んでください。
                  </p>
                ) : null}
              </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-[0.24em] text-ink/50">
                    仕上げムード
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MOOD_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={mood === option.id}
                        className={`rounded-2xl border px-3 py-2.5 text-left text-sm transition ${
                          mood === option.id
                            ? 'border-ink bg-ink text-white shadow-lg shadow-ink/10'
                            : 'border-ink/10 bg-white text-ink/80 hover:bg-ink/5'
                        }`}
                        onClick={() => setMood(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-ink/50">
                    おまかせは毎回ランダムで変化します。
                  </p>
                  <p className="text-[10px] leading-tight text-ink/45">
                    E:前 / R:次 ・ {moodIndex + 1}/{MOOD_OPTIONS.length} ・ 前:{prevMood.label} ・ 次:{nextMood.label}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-[0.24em] text-ink/50">
                    変化量
                  </label>
                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-max gap-2">
                    {VARIATION_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`shrink-0 rounded-[1.25rem] border px-5 py-3 text-left transition ${
                          variation === option.id
                            ? 'border-ink bg-ink text-white shadow-lg shadow-ink/10'
                            : 'border-ink/10 bg-white text-ink/80 hover:bg-ink/5'
                        }`}
                        onClick={() => setVariation(option.id)}
                      >
                        <span className="block text-base font-semibold">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-ink/[0.02] p-4 text-sm text-ink/65">
                  {VARIATION_HELP[activeVariation.id]}
                </div>
                <p className="text-[10px] leading-tight text-ink/45">
                  D:前 / F:次
                </p>
              </div>

                <div className="flex items-end justify-between gap-3 pb-2 pt-1">
                  <Link href="/" className="btn btn-ghost px-6 py-3 text-base">
                    もどる
                  </Link>
                  <button
                    data-hotkey-next
                    className="btn btn-primary px-7 py-3 text-lg shadow-xl shadow-ink/20"
                    onClick={() => runGenerate(true)}
                    disabled={palette.length !== 3}
                  >
                    生成する
                  </button>
                </div>
              </section>
            </div>
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
            <Link href="/" data-hotkey-next className="btn btn-ghost">
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
              <button className="btn btn-ghost" onClick={handleDownload}>
                保存
              </button>
              <Link href="/" data-hotkey-next className="btn btn-ghost">
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
                {result.provider === 'stable-diffusion'
                  ? 'Stable Diffusion 3.5 (Stability AI)'
                  : result.provider === 'gemini'
                    ? 'Gemini'
                    : result.provider === 'openrouter'
                      ? 'OpenRouter (Gemini)'
                      : 'ローカル簡易'}
                {result.aiFailed ?? result.geminiFailed
                  ? ' (AI失敗時フォールバック)'
                  : ''}
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
    </main>
  );
}

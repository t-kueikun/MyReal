'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type ScanState = 'idle' | 'scanning' | 'checking' | 'ready' | 'error';

type MetaResult = {
  imageUrl: string;
  expiresAt: string;
};

function extractToken(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    const arIndex = parts.indexOf('ar');
    if (arIndex !== -1 && parts[arIndex + 1]) {
      return decodeURIComponent(parts[arIndex + 1]);
    }
    return null;
  } catch {
    if (raw.includes('/ar/')) {
      const [, token] = raw.split('/ar/');
      return token ? token.split(/[?#]/)[0] : null;
    }
    return raw;
  }
}

function isBarcodeSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const [state, setState] = useState<ScanState>('idle');
  const [error, setError] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isBarcodeSupported());
    return () => stopScan();
  }, []);

  const stopScan = () => {
    activeRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleResult = (rawValue: string) => {
    if (state === 'checking' || state === 'ready') return;
    stopScan();
    lookupToken(rawValue);
  };

  const startScan = async () => {
    if (!supported || state === 'scanning') return;
    setError('');
    setState('scanning');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const Detector = (window as any).BarcodeDetector;
      const detector = new Detector({ formats: ['qr_code'] });
      activeRef.current = true;
      const scan = async () => {
        if (!activeRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes?.length) {
            const value = codes[0]?.rawValue || codes[0]?.data || '';
            if (value) {
              handleResult(String(value));
              return;
            }
          }
        } catch {
          // ignore detection errors and keep scanning
        }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    } catch {
      stopScan();
      setState('error');
      setError('カメラの利用が許可されていません。');
    }
  };

  const lookupToken = async (rawValue: string) => {
    const extracted = extractToken(rawValue);
    if (!extracted) {
      setState('error');
      setError('QRの内容が読み取れませんでした。');
      return;
    }
    setTokenInput(extracted);
    setState('checking');
    setError('');
    try {
      const res = await fetch(`/api/meta/${encodeURIComponent(extracted)}`);
      if (!res.ok) {
        setState('error');
        setError('番号が見つかりません。もう一度読み込んでください。');
        return;
      }
      const data = (await res.json()) as MetaResult;
      setToken(extracted);
      setImageUrl(data.imageUrl);
      setExpiresAt(data.expiresAt);
      setState('ready');
    } catch {
      setState('error');
      setError('照合に失敗しました。通信状況をご確認ください。');
    }
  };

  const handleManual = () => {
    if (!tokenInput.trim()) {
      setError('番号またはURLを入力してください。');
      return;
    }
    stopScan();
    lookupToken(tokenInput.trim());
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <section className="card p-6 md:p-10 space-y-3">
        <h1 className="font-heading text-2xl">QRを読み込む</h1>
        <p className="text-ink/70">
          QRの番号を照合して、作ったイラストを呼び出します。
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-6 space-y-4">
          <h2 className="font-heading text-lg">カメラで読み取る</h2>
          {supported ? (
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-black/80">
              <video
                ref={videoRef}
                className="h-64 w-full object-cover"
                playsInline
                muted
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/60">
              このブラウザはQR読み取りに対応していません。手入力をご利用ください。
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={startScan}
              disabled={!supported || state === 'scanning'}
            >
              {state === 'scanning' ? '読み取り中…' : '読み取り開始'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                stopScan();
                setState('idle');
              }}
            >
              停止
            </button>
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="font-heading text-lg">手入力で照合</h2>
          <input
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            className="w-full rounded-2xl border border-ink/10 px-4 py-3"
            placeholder="QRのURL or トークン"
          />
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={handleManual}>
              照合する
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setTokenInput('');
                setError('');
                setState('idle');
              }}
            >
              クリア
            </button>
          </div>
        </section>
      </div>

      {state === 'checking' ? (
        <section className="card p-6 space-y-3">
          <p className="font-semibold">照合中…</p>
          <div className="skeleton h-40 w-full" />
        </section>
      ) : null}

      {state === 'error' && error ? (
        <section className="card p-6 space-y-3">
          <p className="font-semibold text-red-600">{error}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => lookupToken(tokenInput)}
            >
              再取得
            </button>
            <Link href="/" className="btn btn-ghost">
              戻る
            </Link>
          </div>
        </section>
      ) : null}

      {state === 'ready' ? (
        <section className="card p-6 space-y-4">
          <h2 className="font-heading text-lg">作ったイラスト</h2>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="作ったイラスト"
              className="w-full rounded-3xl bg-white p-4 shadow-soft"
            />
          ) : null}
          {expiresAt ? (
            <p className="text-sm text-ink/60">
              有効期限: {new Date(expiresAt).toLocaleString()}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Link href={`/ar/${token}`} className="btn btn-accent">
              撮影をはじめる
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setState('idle');
                setError('');
              }}
            >
              もう一度読み込む
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}

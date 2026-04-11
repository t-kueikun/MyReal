'use client';

import { useEffect, useState } from 'react';
import QuickLookButton from './QuickLookButton';
import AndroidSceneViewerButton from './AndroidSceneViewerButton';

type Props = {
  imageUrl: string;
  token: string;
};

type Platform = 'ios' | 'android' | 'other';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS =
    typeof document !== 'undefined' && ua.includes('Mac') && 'ontouchend' in document;
  if (isIOS || isIPadOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

export default function ARClient({ imageUrl }: Props) {
  const [platform, setPlatform] = useState<Platform>('other');

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const tag =
    platform === 'ios'
      ? 'Quick Look'
      : platform === 'android'
        ? 'Scene Viewer'
        : 'Mobile AR';

  const description =
    platform === 'ios'
      ? 'iPhone では Quick Look で AR を開きます。'
      : platform === 'android'
        ? 'Android では Scene Viewer で AR を開きます。'
        : 'スマホで開くと、iPhone は Quick Look、Android は Scene Viewer で起動します。';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink/60">
        <span className="tag">{tag}</span>
        <span>{description}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
        <div className="card p-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white shadow-soft sm:aspect-video">
            <img
              src={imageUrl}
              alt="ARプレビュー"
              className="h-full w-full object-contain p-4"
            />
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <div className="space-y-2">
            <h2 className="font-heading text-lg">ARを開く</h2>
            <p className="text-sm text-ink/60">
              端末に合ったネイティブ AR で起動します。配置や撮影、カメラ切り替えは各アプリ側の標準 UI に従います。
            </p>
          </div>

          {platform === 'ios' ? <QuickLookButton imageUrl={imageUrl} /> : null}
          {platform === 'android' ? <AndroidSceneViewerButton imageUrl={imageUrl} /> : null}

          {platform === 'other' ? (
            <div className="rounded-2xl border border-ink/10 bg-ink/[0.02] p-4 text-sm text-ink/70">
              このページをスマホで開いてください。
              <br />
              iPhone は Quick Look、Android は Scene Viewer が起動します。
            </div>
          ) : null}

          <div className="rounded-2xl border border-ink/10 bg-ink/[0.02] p-4 space-y-2">
            <p className="text-sm font-semibold text-ink/80">使い方</p>
            <p className="text-sm text-ink/60">
              1. ボタンを押してネイティブ AR を開く
              <br />
              2. 端末側の UI で配置やサイズ調整をする
              <br />
              3. 撮影や保存は端末の標準機能を使う
            </p>
            <p className="text-xs text-ink/50">
              前面/背面カメラの切り替え可否は Quick Look / Scene Viewer 側の仕様に依存します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

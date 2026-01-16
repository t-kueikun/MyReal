'use client';

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';

function isIOSQuickLook() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = ua.includes('Mac') && 'ontouchend' in document;
  return isIOS || isIPadOS;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (res.ok) return true;
      if (res.status === 403 || res.status === 405) return true;
    } catch {
      // ignore and retry
    }
    await sleep(350);
  }
  return false;
}

async function loadImageFromUrl(url: string) {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error('Image download failed');
  }
  const blob = await response.blob();
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image load failed'));
    };
    img.src = objectUrl;
  });
}

function sampleCornerColor(data: Uint8ClampedArray, width: number, height: number) {
  const size = Math.max(6, Math.floor(Math.min(width, height) * 0.04));
  const corners = [
    { x: 0, y: 0 },
    { x: width - size, y: 0 },
    { x: 0, y: height - size },
    { x: width - size, y: height - size }
  ];
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;
  corners.forEach((corner) => {
    for (let y = corner.y; y < corner.y + size; y += 1) {
      for (let x = corner.x; x < corner.x + size; x += 1) {
        const idx = (y * width + x) * 4;
        totalR += data[idx];
        totalG += data[idx + 1];
        totalB += data[idx + 2];
        count += 1;
      }
    }
  });
  return {
    r: totalR / count,
    g: totalG / count,
    b: totalB / count
  };
}

function buildProcessedCanvas(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const bg = sampleCornerColor(data, canvas.width, canvas.height);
  const bgThreshold = 28;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    const distance =
      Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
    if (distance <= bgThreshold) {
      data[i + 3] = 0;
      continue;
    }
    if (alpha > 0 && alpha < 255) {
      const a = alpha / 255;
      data[i] = Math.min(255, Math.max(0, Math.round((r - bg.r * (1 - a)) / a)));
      data[i + 1] = Math.min(
        255,
        Math.max(0, Math.round((g - bg.g * (1 - a)) / a))
      );
      data[i + 2] = Math.min(
        255,
        Math.max(0, Math.round((b - bg.b * (1 - a)) / a))
      );
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return { canvas, imageData };
}

function buildAlphaTexture(imageData: ImageData) {
  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = imageData.width;
  alphaCanvas.height = imageData.height;
  const alphaCtx = alphaCanvas.getContext('2d');
  if (!alphaCtx) throw new Error('Canvas unavailable');
  const alphaData = alphaCtx.createImageData(imageData.width, imageData.height);
  const src = imageData.data;
  const dest = alphaData.data;
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3];
    dest[i] = a;
    dest[i + 1] = a;
    dest[i + 2] = a;
    dest[i + 3] = 255;
  }
  alphaCtx.putImageData(alphaData, 0, 0);
  const alphaTexture = new THREE.CanvasTexture(alphaCanvas);
  alphaTexture.colorSpace = THREE.NoColorSpace;
  return alphaTexture;
}

async function buildUsdZ(imageUrl: string) {
  const image = await loadImageFromUrl(imageUrl);
  const { canvas, imageData } = buildProcessedCanvas(image);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const alphaTexture = buildAlphaTexture(imageData);

  const aspect = image.width ? image.width / image.height : 1;
  const height = 0.6;
  const width = height * aspect;
  const thickness = 0.02;

  const faceMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1,
    emissiveMap: texture,
    alphaMap: alphaTexture,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 1,
    alphaTest: 0.15
  });

  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    faceMaterial
  );
  front.position.set(0, height / 2, thickness / 2 + 0.001);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(width, height), faceMaterial);
  back.position.set(0, height / 2, -thickness / 2 - 0.001);
  back.rotation.y = Math.PI;

  const scene = new THREE.Scene();
  scene.add(front, back);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const light = new THREE.DirectionalLight(0xffffff, 0.7);
  light.position.set(1, 2, 1);
  scene.add(ambient, light);

  const exporter = new USDZExporter();
  const data = await exporter.parseAsync(scene, {
    quickLookCompatible: true,
    includeAnchoringProperties: true,
    ar: {
      anchoring: { type: 'plane' },
      planeAnchoring: { alignment: 'horizontal' }
    },
    maxTextureSize: 1024
  });

  const buffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  );
  return new Blob([buffer], { type: 'model/vnd.usdz+zip' });
}

export default function QuickLookButton({ imageUrl }: { imageUrl: string }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [usdzUrl, setUsdzUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const supported = useMemo(() => isIOSQuickLook(), []);

  useEffect(() => {
    setReady(supported);
  }, [supported]);

  useEffect(() => {
    let active = true;
    if (!supported || !imageUrl) return;
    setBusy(true);
    setError('');
    buildUsdZ(imageUrl)
      .then(async (usdz) => {
        if (!active) return;
        const file = new File([usdz], 'myreal.usdz', {
          type: 'model/vnd.usdz+zip'
        });
        const form = new FormData();
        form.append('file', file);
        try {
          const res = await fetch('/api/usdz', { method: 'POST', body: form });
          if (!res.ok) throw new Error('upload failed');
          const data = (await res.json()) as { url?: string };
          if (!data.url) throw new Error('no url');
          const ready = await waitForUrl(data.url);
          if (!ready) throw new Error('not ready');
          setUsdzUrl(data.url);
          return;
        } catch {
          if (!active) return;
          setError('ARファイルの準備に失敗しました。もう一度お試しください。');
        }
      })
      .catch(() => {
        if (!active) return;
        setError('ARの準備に失敗しました。');
      })
      .finally(() => {
        if (!active) return;
        setBusy(false);
      });
    return () => {
      active = false;
      setUsdzUrl((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [supported, imageUrl]);

  if (!ready) return null;

  return (
    <div className="space-y-2">
      <a
        rel="ar"
        href={usdzUrl || '#'}
        className={`btn btn-accent ${busy || !usdzUrl ? 'opacity-60 pointer-events-none' : ''}`}
        onClick={(event) => {
          if (!usdzUrl) event.preventDefault();
        }}
      >
        {busy || !usdzUrl ? 'ARを準備中…' : 'iPhone ARで開く'}
        <img
          src={imageUrl}
          alt=""
          style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}
        />
      </a>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

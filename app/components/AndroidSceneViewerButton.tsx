'use client';

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

function isAndroid() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Android/.test(ua);
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

function buildProcessedCanvas(image: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(image, 0, 0);
    // Basic image processing if needed (like corner sampling in QuickLookButton)
    // For now, simple passthrough is likely fine, or reuse the same logic if needed.
    // Reusing the QuickLookButton logic for consistency (alpha masking etc) might be good but let's keep it simple first.
    return canvas;
}

async function buildGLB(imageUrl: string) {
    const image = await loadImageFromUrl(imageUrl);
    const canvas = buildProcessedCanvas(image);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const aspect = image.width ? image.width / image.height : 1;
    const height = 0.6;
    const width = height * aspect;

    const faceMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.15,
        roughness: 1,
        metalness: 0
    });

    // Create a mesh standing up
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        faceMaterial
    );
    // Center is 0,0,0 usually for GLB? 
    // Should verify pivot. Plane default is centered at 0,0,0.
    // We want it to stand "up". In GLB, Y is up.
    // Let's position it so the bottom is at 0? Or center?
    // Scene Viewer usually places the model's origin at the reticle.
    mesh.position.set(0, height / 2, 0);

    const scene = new THREE.Scene();
    scene.add(mesh);

    const exporter = new GLTFExporter();

    return new Promise<Blob>((resolve, reject) => {
        exporter.parse(
            scene,
            (gltf) => {
                const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
                resolve(blob);
            },
            (error) => {
                reject(error);
            },
            { binary: true }
        );
    });
}

export default function AndroidSceneViewerButton({ imageUrl }: { imageUrl: string }) {
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [glbUrl, setGlbUrl] = useState<string | null>(null);
    const [error, setError] = useState('');
    const supported = useMemo(() => isAndroid(), []);

    useEffect(() => {
        setReady(supported);
    }, [supported]);

    useEffect(() => {
        let active = true;
        if (!supported || !imageUrl) return;
        setBusy(true);
        setError('');

        // Auto-generate GLB when component mounts/image changes
        buildGLB(imageUrl)
            .then(async (glb) => {
                if (!active) return;
                const file = new File([glb], 'myreal.glb', {
                    type: 'model/gltf-binary'
                });
                const form = new FormData();
                form.append('file', file);
                try {
                    const res = await fetch('/api/glb', { method: 'POST', body: form });
                    if (!res.ok) throw new Error('upload failed');
                    const data = (await res.json()) as { url?: string };
                    if (!data.url) throw new Error('no url');
                    const ready = await waitForUrl(data.url);
                    if (!ready) throw new Error('not ready');
                    setGlbUrl(data.url);
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
        };
    }, [supported, imageUrl]);

    if (!ready) return null;

    const intentUrl = glbUrl
        ? `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(glbUrl)}&mode=ar_only&resizable=true#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;end;`
        : '#';

    return (
        <div className="space-y-2">
            <a
                href={intentUrl}
                className={`btn btn-accent ${busy || !glbUrl ? 'opacity-60 pointer-events-none' : ''}`}
                onClick={(event) => {
                    if (!glbUrl) event.preventDefault();
                }}
            >
                {busy || !glbUrl ? 'ARを準備中…' : 'Android ARで開く'}
            </a>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
    );
}

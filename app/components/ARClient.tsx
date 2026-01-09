'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { saveCapture, listCaptures, type GalleryItem } from '../../lib/gallery';

type Props = {
  imageUrl: string;
  token: string;
};

type Controls = {
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
};

const DEFAULT_CONTROLS: Controls = {
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0
};

export default function ARClient({ imageUrl, token }: Props) {
  const [supportsXR, setSupportsXR] = useState(false);
  const [modeChecked, setModeChecked] = useState(false);
  const [controls, setControls] = useState(DEFAULT_CONTROLS);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [voiceGuide, setVoiceGuide] = useState(false);

  useEffect(() => {
    let active = true;
    if (navigator.xr?.isSessionSupported) {
      navigator.xr.isSessionSupported('immersive-ar').then((ok) => {
        if (active) {
          setSupportsXR(ok);
          setModeChecked(true);
        }
      });
    } else {
      setModeChecked(true);
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    listCaptures().then(setGallery).catch(() => null);
  }, []);

  useEffect(() => {
    if (!voiceGuide || !('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(
      '画面のスライダーで位置やサイズを調整できます。シャッターを押して保存してください。'
    );
    utter.lang = 'ja-JP';
    speechSynthesis.speak(utter);
    return () => {
      speechSynthesis.cancel();
    };
  }, [voiceGuide]);

  const handleCapture = async (dataUrl: string) => {
    await saveCapture({ dataUrl, createdAt: new Date().toISOString(), token });
    const list = await listCaptures();
    setGallery(list);
    await downloadImage(dataUrl);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink/60">
        <span className="tag">
          {supportsXR ? 'WebXR' : modeChecked ? '2D合成' : '判定中'}
        </span>
        <span>
          {supportsXR
            ? 'ARモード'
            : modeChecked
            ? 'カメラ合成モード'
            : '互換性を確認中'}
        </span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="card p-4">
          {modeChecked ? (
            supportsXR ? (
              <XRViewer imageUrl={imageUrl} controls={controls} onCapture={handleCapture} />
            ) : (
              <FallbackViewer imageUrl={imageUrl} controls={controls} onCapture={handleCapture} />
            )
          ) : (
            <div className="skeleton h-[420px] w-full" />
          )}
        </div>
        <div className="card p-5 space-y-4">
          <h2 className="font-heading text-lg">操作</h2>
          <label className="flex flex-col gap-2 text-sm text-ink/70">
            スケール
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.01}
              value={controls.scale}
              onChange={(event) =>
                setControls((prev) => ({
                  ...prev,
                  scale: Number(event.target.value)
                }))
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-ink/70">
            回転
            <input
              type="range"
              min={-0.6}
              max={0.6}
              step={0.01}
              value={controls.rotation}
              onChange={(event) =>
                setControls((prev) => ({
                  ...prev,
                  rotation: Number(event.target.value)
                }))
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-ink/70">
            左右
            <input
              type="range"
              min={-0.4}
              max={0.4}
              step={0.01}
              value={controls.offsetX}
              onChange={(event) =>
                setControls((prev) => ({
                  ...prev,
                  offsetX: Number(event.target.value)
                }))
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-ink/70">
            上下
            <input
              type="range"
              min={-0.4}
              max={0.4}
              step={0.01}
              value={controls.offsetY}
              onChange={(event) =>
                setControls((prev) => ({
                  ...prev,
                  offsetY: Number(event.target.value)
                }))
              }
            />
          </label>
          <button
            className="btn btn-ghost"
            onClick={() => setControls(DEFAULT_CONTROLS)}
          >
            配置リセット
          </button>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={voiceGuide}
              onChange={(event) => setVoiceGuide(event.target.checked)}
            />
            音声案内
          </label>
        </div>
      </div>
      <div className="card p-6 space-y-4">
        <h2 className="font-heading text-lg">ギャラリー (オフライン閲覧可)</h2>
        {gallery.length === 0 ? (
          <p className="text-sm text-ink/60">まだ保存された写真がありません。</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gallery.map((item) => (
              <img
                key={item.id}
                src={item.dataUrl}
                alt="保存した写真"
                className="rounded-2xl bg-white shadow-soft"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function downloadImage(dataUrl: string) {
  if ('showSaveFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const picker = await (window as any).showSaveFilePicker({
        suggestedName: 'myreal-ar.png',
        types: [
          {
            description: 'PNG Image',
            accept: { 'image/png': ['.png'] }
          }
        ]
      });
      const writable = await picker.createWritable();
      const blob = await (await fetch(dataUrl)).blob();
      await writable.write(blob);
      await writable.close();
      return;
    } catch {
      // fallback to download
    }
  }
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'myreal-ar.png';
  link.click();
}

function XRViewer({
  imageUrl,
  controls,
  onCapture
}: {
  imageUrl: string;
  controls: Controls;
  onCapture: (dataUrl: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlsRef = useRef(controls);
  const tiltRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    const onTilt = (event: DeviceOrientationEvent) => {
      tiltRef.current = {
        x: Number(event.gamma || 0),
        y: Number(event.beta || 0)
      };
    };
    window.addEventListener('deviceorientation', onTilt);
    return () => window.removeEventListener('deviceorientation', onTilt);
  }, []);

  useEffect(() => {
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let group: THREE.Group | null = null;
    let frameId = 0;
    let disposed = false;

    const init = async () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true
      });
      renderer.xr.enabled = true;
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(container.clientWidth, 420);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(70, container.clientWidth / 420, 0.01, 20);
      scene.add(camera);

      const ambient = new THREE.AmbientLight(0xffffff, 0.8);
      const directional = new THREE.DirectionalLight(0xffffff, 1.2);
      directional.position.set(1, 2, 1);
      directional.castShadow = true;
      scene.add(ambient, directional);

      const texture = await loadTexture(imageUrl);
      const { normalMap, avgLuminance } = createNormalMap(texture.image as HTMLImageElement);
      renderer.toneMappingExposure = clamp(1.1 + (0.6 - avgLuminance), 0.8, 1.4);

      group = new THREE.Group();
      group.userData.baseRotation = (Math.random() - 0.5) * 0.2;
      const layers = createLayers(texture, normalMap);
      layers.forEach((layer) => group!.add(layer));

      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.2),
        new THREE.ShadowMaterial({ opacity: 0.2 })
      );
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -0.4;
      shadowPlane.receiveShadow = true;
      group.add(shadowPlane);

      scene.add(group);

      const startButton = container.querySelector<HTMLButtonElement>('[data-ar-start]');
      if (startButton) {
        startButton.onclick = async () => {
          if (!renderer || !renderer.xr) return;
          const session = await navigator.xr?.requestSession('immersive-ar', {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: container }
          });
          if (!session) return;
          await renderer.xr.setSession(session);
          renderer.setAnimationLoop(() => {
            frameId += 1;
            if (!scene || !camera || !group) return;
            updateGroup(group, camera, controlsRef.current);
            applyParallax(group, tiltRef.current);
            renderer!.render(scene, camera);
          });
          session.addEventListener('end', () => {
            renderer?.setAnimationLoop(null);
          });
        };
      }

      const resizeObserver = new ResizeObserver(() => {
        if (!container || !renderer || !camera) return;
        const width = container.clientWidth;
        const height = 420;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    };

    init().catch(() => null);

    return () => {
      disposed = true;
      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
      }
      if (scene) {
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).geometry) {
            (obj as THREE.Mesh).geometry.dispose();
          }
          if ((obj as THREE.Mesh).material) {
            const material = (obj as THREE.Mesh).material as THREE.Material;
            material.dispose();
          }
        });
      }
      if (disposed) {
        frameId = 0;
      }
    };
  }, [imageUrl]);

  const capture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onCapture(dataUrl);
  };

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        className="h-[420px] w-full rounded-2xl bg-black"
      />
      <button
        data-ar-start
        className="btn btn-accent absolute bottom-4 left-4"
      >
        ARを起動
      </button>
      <button
        className="btn btn-primary absolute bottom-4 right-4"
        onClick={capture}
      >
        シャッター
      </button>
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.15))]" />
    </div>
  );
}

function FallbackViewer({
  imageUrl,
  controls,
  onCapture
}: {
  imageUrl: string;
  controls: Controls;
  onCapture: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef(controls);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    videoRef.current = video;

    const drawLoop = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = await loadImage(imageUrl);
      const draw = () => {
          if (!canvas || !ctx || !videoRef.current) return;
          const width = canvas.clientWidth;
          const height = 420;
          canvas.width = width;
          canvas.height = height;

          ctx.filter = 'blur(4px) brightness(1.05)';
          ctx.drawImage(videoRef.current, 0, 0, width, height);
          ctx.filter = 'none';
          ctx.drawImage(videoRef.current, 0, 0, width, height);

        const current = controlsRef.current;
        const scale = current.scale * 0.8;
        const w = img.width * scale;
        const h = img.height * scale;
        const x = width / 2 - w / 2 + current.offsetX * width;
        const y = height / 2 - h / 2 + current.offsetY * height;

        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(current.rotation);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        requestAnimationFrame(draw);
      };
      draw();
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((mediaStream) => {
        stream = mediaStream;
        video.srcObject = mediaStream;
        return new Promise((resolve) => {
          video.onloadedmetadata = resolve;
        });
      })
      .then(() => drawLoop())
      .catch(() => null);

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [imageUrl]);

  const capture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onCapture(dataUrl);
  };

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="h-[420px] w-full rounded-2xl" />
      <button className="btn btn-primary absolute bottom-4 right-4" onClick={capture}>
        シャッター
      </button>
    </div>
  );
}

function createLayers(
  texture: THREE.Texture,
  normalMap: THREE.DataTexture
): THREE.Mesh[] {
  const geometry = new THREE.PlaneGeometry(1, 1.2);
  const layers: THREE.Mesh[] = [];

  const masks = createLayerMasks(texture.image as HTMLImageElement);
  masks.forEach((mask, index) => {
    const layerTexture = new THREE.CanvasTexture(mask);
    const material = new THREE.MeshStandardMaterial({
      map: layerTexture,
      normalMap,
      transparent: true,
      roughness: 0.95,
      metalness: 0.05
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = index * 0.02;
    mesh.userData.parallaxIndex = index + 1;
    mesh.userData.baseZ = mesh.position.z;
    mesh.castShadow = true;
    layers.push(mesh);
  });

  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: 0x111111,
    transparent: true,
    opacity: 0.15
  });
  const outline = new THREE.Mesh(geometry, outlineMaterial);
  outline.scale.set(1.04, 1.04, 1.04);
  outline.position.z = -0.01;
  layers.unshift(outline);

  return layers;
}

function createLayerMasks(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const layers = [
    document.createElement('canvas'),
    document.createElement('canvas'),
    document.createElement('canvas')
  ];
  layers.forEach((layer) => {
    layer.width = canvas.width;
    layer.height = canvas.height;
  });

  for (let i = 0; i < 3; i++) {
    const layerCtx = layers[i].getContext('2d');
    if (!layerCtx) continue;
    const yStart = (canvas.height / 3) * i;
    const yEnd = (canvas.height / 3) * (i + 1);
    layerCtx.putImageData(data, 0, 0);
    layerCtx.clearRect(0, 0, canvas.width, yStart);
    layerCtx.clearRect(0, yEnd, canvas.width, canvas.height - yEnd);
  }

  return layers;
}

function createNormalMap(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { normalMap: new THREE.DataTexture(), avgLuminance: 0.5 };
  }
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const normalData = new Uint8Array(data.length);
  let luminanceTotal = 0;

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
    luminanceTotal += lum;
    normalData[i] = 128;
    normalData[i + 1] = 128;
    normalData[i + 2] = 255;
    normalData[i + 3] = data[i + 3];
  }

  const sobel = (x: number, y: number) => {
    const idx = (y * canvas.width + x) * 4;
    return data[idx] / 255;
  };

  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const dx =
        sobel(x - 1, y - 1) + 2 * sobel(x - 1, y) + sobel(x - 1, y + 1) -
        sobel(x + 1, y - 1) - 2 * sobel(x + 1, y) - sobel(x + 1, y + 1);
      const dy =
        sobel(x - 1, y - 1) + 2 * sobel(x, y - 1) + sobel(x + 1, y - 1) -
        sobel(x - 1, y + 1) - 2 * sobel(x, y + 1) - sobel(x + 1, y + 1);
      const idx = (y * canvas.width + x) * 4;
      const nx = clamp(0.5 - dx * 0.5, 0, 1);
      const ny = clamp(0.5 - dy * 0.5, 0, 1);
      normalData[idx] = Math.floor(nx * 255);
      normalData[idx + 1] = Math.floor(ny * 255);
      normalData[idx + 2] = 255;
      normalData[idx + 3] = data[idx + 3];
    }
  }

  const normalMap = new THREE.DataTexture(
    normalData,
    canvas.width,
    canvas.height,
    THREE.RGBAFormat
  );
  normalMap.needsUpdate = true;

  return {
    normalMap,
    avgLuminance: luminanceTotal / (data.length / 4)
  };
}

async function loadTexture(url: string) {
  return await new Promise<THREE.Texture>((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      reject
    );
  });
}

async function loadImage(url: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function updateGroup(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera,
  controls: Controls
) {
  const distance = 1.2;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const right = new THREE.Vector3();
  right.setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3();
  up.setFromMatrixColumn(camera.matrixWorld, 1);

  group.position.copy(camera.position);
  group.position.add(dir.multiplyScalar(distance));
  group.position.add(right.multiplyScalar(controls.offsetX));
  group.position.add(up.multiplyScalar(controls.offsetY));
  group.scale.setScalar(controls.scale);

  group.quaternion.copy(camera.quaternion);
  group.rotation.y += controls.rotation + (group.userData.baseRotation || 0);
}

function applyParallax(group: THREE.Group, tilt: { x: number; y: number }) {
  const offsetX = clamp(tilt.x / 45, -1, 1) * 0.015;
  const offsetY = clamp(tilt.y / 45, -1, 1) * 0.015;
  group.children.forEach((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.userData?.parallaxIndex) {
      const depth = Number(mesh.userData.parallaxIndex);
      mesh.position.x = offsetX * depth;
      mesh.position.y = offsetY * depth;
      mesh.position.z = Number(mesh.userData.baseZ || 0);
    }
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

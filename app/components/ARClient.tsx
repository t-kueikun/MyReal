'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import NextImage from 'next/image';
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
  const [viewMode, setViewMode] = useState<'xr' | 'camera'>('camera');
  const [controls, setControls] = useState(DEFAULT_CONTROLS);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [voiceGuide, setVoiceGuide] = useState(false);
  const [transparentBackground, setTransparentBackground] = useState(false);
  const modeInitRef = useRef(false);

  useEffect(() => {
    let active = true;
    if (navigator.xr?.isSessionSupported) {
      navigator.xr.isSessionSupported('immersive-ar').then((ok) => {
        if (!active) return;
        setSupportsXR(ok);
        setModeChecked(true);
        if (!modeInitRef.current) {
          //          setViewMode(ok ? 'xr' : 'camera'); 
          // Default to camera first as per user flow usually preference? Or XR? 
          // Original code was: setViewMode(ok ? 'xr' : 'camera');
          // Let's keep it but user seems to be using Fallback mostly.
          setViewMode(ok ? 'xr' : 'camera');
          modeInitRef.current = true;
        }
      });
    } else {
      setModeChecked(true);
      if (!modeInitRef.current) {
        setViewMode('camera');
        modeInitRef.current = true;
      }
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

  const handleCapture = useCallback(async (dataUrl: string) => {
    await saveCapture({ dataUrl, createdAt: new Date().toISOString(), token });
    const list = await listCaptures();
    setGallery(list);
    await downloadImage(dataUrl);
  }, [token]);

  const useXr = viewMode === 'xr' && supportsXR;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink/60">
        <span className="tag">
          {modeChecked ? (useXr ? 'WebXR' : '2D合成') : '判定中'}
        </span>
        <span>
          {modeChecked
            ? useXr
              ? 'ARモード'
              : 'カメラ合成モード'
            : '互換性を確認中'}
        </span>
      </div>
      {supportsXR ? (
        <div className="flex flex-wrap gap-2">
          <button
            className={`btn ${useXr ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('xr')}
            type="button"
          >
            ARモード
          </button>
          <button
            className={`btn ${!useXr ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('camera')}
            type="button"
          >
            カメラ合成で撮影
          </button>
          {!useXr ? (
            <span className="text-sm text-ink/60 self-center">
              写真を残す場合はこちらがおすすめです。
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="card p-4">
          {modeChecked ? (
            useXr ? (
              <XRViewer imageUrl={imageUrl} controls={controls} onCapture={handleCapture} />
            ) : (
              <FallbackViewer
                imageUrl={imageUrl}
                controls={controls}
                onCapture={handleCapture}
                transparent={transparentBackground}
              />
            )
          ) : (
            <div className="skeleton h-[420px] w-full" />
          )}
        </div>
        <div className="card p-5 space-y-4">
          <h2 className="font-heading text-lg">操作</h2>

          <label className="flex items-center gap-2 text-sm text-ink/70 font-bold bg-ink/5 p-2 rounded-lg">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={transparentBackground}
              onChange={(event) => setTransparentBackground(event.target.checked)}
            />
            背景を透過して保存
          </label>
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
              min={-3.14}
              max={3.14}
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
            左右 (微調整)
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
            上下 (微調整)
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
              <div key={item.id} className="relative aspect-square">
                <NextImage
                  src={item.dataUrl}
                  alt="保存した写真"
                  fill
                  className="rounded-2xl bg-white shadow-soft object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
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
      if (window.showSaveFilePicker) {
        const picker = await window.showSaveFilePicker({
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
      }
    } catch {
      // fallback to download
    }
  }
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'myreal-ar.png';
  link.click();
}


function calculateVisualCenter(image: HTMLImageElement): { x: number; y: number } {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { x: 0.5, y: 0.5 };

  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
  let totalX = 0, totalY = 0, count = 0;

  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 20) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        totalX += x;
        totalY += y;
        count++;
      }
    }
  }

  if (count === 0) return { x: 0.5, y: 0.5 };

  // Use centroid for rotation center
  return {
    x: (totalX / count) / canvas.width,
    y: (totalY / count) / canvas.height
  };
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
  const sceneRef = useRef<{ place: () => void } | null>(null);

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
    let xrSession: { end?: () => Promise<void> } | null = null;
    let frameId = 0;
    let disposed = false;

    const init = async () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
      });
      renderer.xr.enabled = true;
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(container.clientWidth, 420);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = false;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(70, container.clientWidth / 420, 0.01, 20);
      scene.add(camera);

      const ambient = new THREE.AmbientLight(0xffffff, 0.8);
      const directional = new THREE.DirectionalLight(0xffffff, 1.2);
      directional.position.set(1, 2, 1);
      scene.add(ambient, directional);

      const texture = await loadTexture(imageUrl);
      const { normalMap, avgLuminance } = createNormalMap(texture.image as HTMLImageElement);
      const visualCenter = calculateVisualCenter(texture.image as HTMLImageElement);
      renderer.toneMappingExposure = clamp(1.1 + (0.6 - avgLuminance), 0.8, 1.4);

      group = new THREE.Group();
      group.userData.baseRotation = (Math.random() - 0.5) * 0.2;
      const layers = createLayers(texture, normalMap);

      // Offset layers so visual center is at 0,0,0
      const offsetX = (0.5 - visualCenter.x) * (texture.image.width / 100); // approximate scale unit? 
      // Wait, createLayers makes planes based on Aspect Ratio?
      // Need to check createLayers. It's likely just creating a plane with aspect ratio.
      // If standard plane is width/height based on aspect.
      const aspect = texture.image.width / texture.image.height;
      const planeWidth = aspect;
      const planeHeight = 1;
      // Visual center X (0..1) -> Local X (-W/2 .. W/2)
      // center.x=0.5 -> 0
      // center.x=1.0 -> -W/2 ?? No.
      // 0 is left, 1 is right.
      // If pivot is at 0.8 (right side), we want that point to be at 0.
      // So we move mesh by - (0.8 - 0.5) * width.
      const shiftX = -(visualCenter.x - 0.5) * planeWidth;
      const shiftY = (visualCenter.y - 0.5) * planeHeight; // Y is up? texture Y is down.
      // ThreeJS Y is up. Texture UV 0,0 is usually bottom-left or top-left depending.
      // PlaneGeometry UVs: (0,1) top-left, (0,0) bottom-left.
      // visualCenter.y: 0 is TOP (canvas), 1 is BOTTOM.
      // ThreeJS Y: + is UP, - is DOWN.
      // center.y=0.2 (Top). We want this at 0. 
      // Default geometric center is 0.5 (Middle).
      // diff = 0.2 - 0.5 = -0.3.
      // Current Mesh Y range: +0.5 to -0.5.
      // We want Y=0.3 relative to bottom (which is -0.5) -> -0.2 to be at 0?
      // Let's stick to: visual center y=0.5 -> Shift 0.
      // visual center y=0 (Top) -> Shift ??
      // If pivot is Top, we move the mesh DOWN so Top is at 0.
      // So shift should be negative.
      // shiftY = - (0.5 - visualCenter.y) * planeHeight?
      // Wait. visualCenter.y=0 (Top). 0.5-0 = 0.5. Shift -0.5.
      // Mesh moves down by half height. Top aligns with 0. Correct.
      // visualCenter.y=1 (Bottom). 0.5-1 = -0.5. Shift +0.5.
      // Mesh moves up. Bottom aligns with 0. Correct.
      const meshShiftY = -(0.5 - visualCenter.y) * planeHeight;
      const meshShiftX = -(visualCenter.x - 0.5) * planeWidth;

      layers.forEach((layer) => {
        layer.position.x += meshShiftX;
        layer.position.y += meshShiftY;
        group!.add(layer)
      });

      // Default: Place at 0,0,-1.5 (1.5m in front of origin)
      group.position.set(0, 0, -1.5);
      group.userData.anchorPos = group.position.clone();

      scene.add(group);

      const place = () => {
        if (!camera || !group) return;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0;
        dir.normalize();

        // Place 1.2m in front of camera
        group.position.copy(camera.position).add(dir.multiplyScalar(1.2));
        group.lookAt(camera.position.x, group.position.y, camera.position.z);
        // Reset rotation offset base to 0 relative to lookAt
        group.rotation.y += Math.PI; // Face the camera
        group.userData.baseRotation = 0;
        group.userData.anchorPos = group.position.clone();
      };
      sceneRef.current = { place };

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
          xrSession = session;
          await renderer.xr.setSession(session);

          place();

          renderer.setAnimationLoop(() => {
            frameId += 1;
            if (!scene || !camera || !group) return;
            updateGroup(group, camera, controlsRef.current);
            applyParallax(group, tiltRef.current);
            renderer!.render(scene, camera);
          });
          session.addEventListener('end', () => {
            renderer?.setAnimationLoop(null);
            xrSession = null;
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
      xrSession?.end?.().catch(() => null);
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
      <div className="absolute top-4 left-4 flex gap-2">
        <button
          className="btn btn-sm btn-ghost bg-black/40 text-white backdrop-blur"
          onClick={() => sceneRef.current?.place()}
        >
          正面に配置
        </button>
      </div>
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
  onCapture,
  transparent
}: {
  imageUrl: string;
  controls: Controls;
  onCapture: (dataUrl: string) => void;
  transparent: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef(controls);

  // Gyro state: active, offset, current smoothed values
  const gyroRef = useRef({ alpha: 0, beta: 0, gamma: 0, active: false, alphaOffset: 0 });
  const [hasGyro, setHasGyro] = useState(false);
  const [permissionNeeded, setPermissionNeeded] = useState(false);

  const anchorRef = useRef({ x: 0.5, y: 0.68 });
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const visualCenterRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  // Handle Orientation
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const alpha = e.alpha || 0; // Compass 0-360
      const beta = e.beta || 0; // Front-back tilt -180 to 180
      const gamma = e.gamma || 0; // Left-right tilt -90 to 90

      const gyro = gyroRef.current;

      // First read initialization
      if (!gyro.active && (alpha !== 0 || beta !== 0 || gamma !== 0)) {
        gyro.active = true;
        gyro.alphaOffset = alpha;
        setHasGyro(true);
      }

      // Simple loop handling for alpha (0-360 wraparound)
      // Check shortest path between current gyro.alpha and new alpha
      let dAlpha = alpha - gyro.alpha;
      if (dAlpha > 180) dAlpha -= 360;
      if (dAlpha < -180) dAlpha += 360;

      // Smooth update (Low pass filter)
      const k = 0.15;
      gyro.alpha += dAlpha * k;
      // Normalizing accumulated alpha isn't strictly necessary if we just use diffs,
      // but let's keep it clean:
      if (gyro.alpha >= 360) gyro.alpha -= 360;
      if (gyro.alpha < 0) gyro.alpha += 360;

      gyro.beta += (beta - gyro.beta) * k;
      gyro.gamma += (gamma - gyro.gamma) * k;
    };

    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      // iOS 13+ requires permission
      // We can't check if granted without requesting, but usually if it's there we need to ask.
      // However, if we already have it granted in previous session? 
      // Need user gesture anyway.
      setPermissionNeeded(true);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const requestPermission = async () => {
    try {
      const response = await (DeviceOrientationEvent as any).requestPermission();
      if (response === 'granted') {
        setPermissionNeeded(false);
        // Re-attach listener
        const handleOrientation = (e: DeviceOrientationEvent) => {
          const alpha = e.alpha || 0;
          const beta = e.beta || 0;
          const gamma = e.gamma || 0;
          const gyro = gyroRef.current;

          if (!gyro.active) {
            gyro.active = true;
            gyro.alphaOffset = alpha;
            setHasGyro(true);
          }
          // Use simpler smoothing logic here to match effect
          // ... (same as above, or simpler direct assign for robustness first)
          gyro.alpha = alpha; // Simplify for now
          gyro.beta = beta;
          gyro.gamma = gamma;
        };
        window.addEventListener('deviceorientation', handleOrientation);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      sizeRef.current = { width, height, dpr: window.devicePixelRatio || 1 };
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let active = true;
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    videoRef.current = video;
    const frameCanvas = document.createElement('canvas');
    const frameCtx = frameCanvas.getContext('2d');
    let hasFrame = false;

    const drawLoop = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      const img = await loadImage(imageUrl);
      visualCenterRef.current = calculateVisualCenter(img);
      const layers = createLayerMasks(img);
      let lastWidth = 0;
      let lastHeight = 0;
      let lastDpr = 1;
      let lastVideoTime = -1;
      const requestFrame = (video as any).requestVideoFrameCallback?.bind(video) as
        | ((cb: () => void) => void)
        | undefined;

      const render = (freshFrame: boolean) => {
        if (!active) return;
        if (!canvas || !ctx) return;
        const { width, height, dpr } = sizeRef.current;
        if (!width || !height) return;
        if (width !== lastWidth || height !== lastHeight || dpr !== lastDpr) {
          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);
          lastWidth = width;
          lastHeight = height;
          lastDpr = dpr;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalCompositeOperation = 'source-over';

        const shouldSample = requestFrame ? freshFrame : true;
        if (
          shouldSample &&
          frameCtx &&
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {
          const needsResize =
            frameCanvas.width !== video.videoWidth ||
            frameCanvas.height !== video.videoHeight;
          if (needsResize) {
            frameCanvas.width = video.videoWidth;
            frameCanvas.height = video.videoHeight;
          }
          if (video.currentTime !== lastVideoTime || needsResize) {
            lastVideoTime = video.currentTime;
            frameCtx.drawImage(
              video,
              0,
              0,
              frameCanvas.width,
              frameCanvas.height
            );
            hasFrame = true;
          }
        }

        if (hasFrame) {
          if (!transparent || !captureRequestRef.current) {
            drawCover(ctx, frameCanvas, frameCanvas.width, frameCanvas.height, width, height);
          } else {
            ctx.clearRect(0, 0, width, height);
          }
        } else {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          return;
        }

        const current = controlsRef.current;
        const gyro = gyroRef.current;

        // Calculate tracked position based on gyro
        let targetX = anchorRef.current.x;
        // let targetY = anchorRef.current.y;

        if (gyro.active) {
          // How much have we turned from the "zero" point?
          let diff = gyro.alpha - gyro.alphaOffset;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;

          // Assume 60 degree FOV (common for phones)
          // If we turn +10 deg, object should move -10 deg on screen.
          // Screen width = 60 deg.
          // X shift = - (diff / 60);
          const shiftX = -(diff / 60);

          targetX = 0.5 + shiftX;
        }

        const anchorX = targetX * width + current.offsetX * width;
        const anchorY = anchorRef.current.y * height + current.offsetY * height; // Static Y for now, or add Beta support

        const baseScale =
          Math.min(width / img.width, height / img.height) * 0.7;
        const depthScale = clamp(0.8 + (anchorY / height) * 0.6, 0.8, 1.35);
        const scale = baseScale * current.scale * depthScale;
        const w = img.width * scale;
        const h = img.height * scale;
        const x = anchorX - w / 2;
        const y = anchorY - h;

        // Apply tilt effects (parallax)
        // Use real gyro tilt instead of parallax logic if possible, 
        // but parallax adds depth to layers so keep it.
        // We use Gamma (left/right tilt) and Beta (front/back)

        const tiltX = clamp(gyro.gamma / 45, -1, 1);
        const tiltY = clamp(gyro.beta / 45, -1, 1);
        const tiltRotation = tiltX * 0.08;
        const skewX = tiltX * 0.1;
        const skewY = tiltY * 0.06;

        const parallaxX = tiltX * 12;
        const parallaxY = tiltY * 10;

        // Pivot Offset: Rotate around visual center
        const pivotOffsetX = (visualCenterRef.current.x - 0.5) * w;
        const pivotOffsetY = (visualCenterRef.current.y - 0.5) * h;

        const centerX = x + w / 2 + pivotOffsetX;
        const centerY = y + h / 2 + pivotOffsetY;

        const drawLayer = (layer: HTMLCanvasElement, depth: number) => {
          const dx = parallaxX * depth;
          const dy = parallaxY * depth;
          ctx.save();
          // Translate to Pivot Point
          ctx.translate(centerX + dx, centerY + dy);
          ctx.rotate(current.rotation + tiltRotation);
          ctx.transform(1, skewY, skewX, 1, 0, 0);

          // Draw image offset by pivot
          ctx.drawImage(layer, -w / 2 - pivotOffsetX, -h / 2 - pivotOffsetY, w, h);
          ctx.restore();
        };

        layers.forEach((layer, index) =>
          drawLayer(layer, (index + 1) * 0.6)
        );

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(current.rotation + tiltRotation);
        ctx.transform(1, skewY, skewX, 1, 0, 0);
        const highlight = ctx.createLinearGradient(-w / 2 - pivotOffsetX, -h / 2 - pivotOffsetY, w / 2 - pivotOffsetX, h / 2 - pivotOffsetY);
        highlight.addColorStop(0, 'rgba(255,255,255,0.12)');
        highlight.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = highlight;
        ctx.fillRect(-w / 2 - pivotOffsetX, -h / 2 - pivotOffsetY, w, h);
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';

        if (captureRequestRef.current) {
          const dataUrl = canvas.toDataURL('image/png');
          onCapture(dataUrl);
          captureRequestRef.current = false;
        }
      };

      const loop = () => {
        if (!active) return;
        if (requestFrame) {
          requestFrame(() => {
            if (!active) return;
            render(true);
            loop();
          });
        } else {
          rafId = requestAnimationFrame(() => {
            render(false);
            loop();
          });
        }
      };

      loop();
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return Promise.reject(new Error('stopped'));
        }
        stream = mediaStream;
        video.srcObject = mediaStream;
        return new Promise((resolve) => {
          video.onloadedmetadata = resolve;
        });
      })
      .then(() => {
        if (!active) return;
        video.play().catch(() => null);
        return drawLoop();
      })
      .catch(() => null);

    return () => {
      active = false;
      hasFrame = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      video.pause();
      (video.srcObject as MediaStream | null) = null;
    };
  }, [imageUrl, onCapture, transparent]);

  const captureRequestRef = useRef(false);

  const capture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    captureRequestRef.current = true;
  };

  const handlePlace = (event: React.PointerEvent<HTMLCanvasElement>) => {
    // If gyro is active, tap resets the 'forward' direction
    if (gyroRef.current.active) {
      gyroRef.current.alphaOffset = gyroRef.current.alpha;
      // Also reset vertical anchor if we implemented beta tracking
      return;
    }

    // Normal placement logic
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    anchorRef.current = {
      x: clamp(x, 0.1, 0.9),
      y: clamp(y, 0.3, 0.95)
    };
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="h-[420px] w-full rounded-2xl bg-black"
        onPointerDown={handlePlace}
      />
      {permissionNeeded && !hasGyro && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button className="btn btn-primary shadow-lg" onClick={requestPermission}>
            ジャイロ機能を有効化
          </button>
        </div>
      )}
      <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs text-ink/70 shadow-soft">
        {hasGyro ? '画面をタップして正面リセット' : '画面をタップして配置'}
      </div>
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
  const image = texture.image as HTMLImageElement;
  const aspect = image.width ? image.height / image.width : 1;
  const geometry = new THREE.PlaneGeometry(1, aspect);
  const layers: THREE.Mesh[] = [];

  const masks = createLayerMasks(image);
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

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  width: number,
  height: number
) {
  if (!srcW || !srcH) {
    ctx.drawImage(source, 0, 0, width, height);
    return;
  }
  const videoAspect = srcW / srcH;
  const canvasAspect = width / height;
  let sx = 0;
  let sy = 0;
  let sW = srcW;
  let sH = srcH;
  if (videoAspect > canvasAspect) {
    sW = srcH * canvasAspect;
    sx = (srcW - sW) / 2;
  } else {
    sH = srcW / canvasAspect;
    sy = (srcH - sH) / 2;
  }
  ctx.drawImage(source, sx, sy, sW, sH, 0, 0, width, height);
}

function updateGroup(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera,
  controls: Controls
) {
  // If no anchorPos, it means we haven't initialized/placed it yet or it's fallback.
  // But for this func, we assume group is already at world pos.

  // Apply rotation
  // We want to rotate around its own Y axis (Vertical).
  // group.rotation.y = controls.rotation; 
  // BUT: group.lookAt() might have set logic.
  // Let's just add user rotation to base.

  // Note: "controls.rotation" is an absolute value from slider.
  // We should add it to the base rotation derived from placement.
  // But we don't track "placement rotation" well in this stateless func?
  // We can trust group.rotation.y is persisted between frames if we don't overwrite it fully.
  // But here we want to overwrite it with "Base + Control".

  // Workaround: We don't reset group.rotation every frame.
  // We just modify it? No, controls.rotation is a state value.
  // It needs to be deterministic: Rotation = BaseRotation + ControlRotation.

  // We reset rotation to identities then apply? No.
  // We need to know the Base Rotation (facing camera).
  // We stored it implicitly by rotation.y in 'place()'.
  // But wait, if we overwrite rotation.y, we lose the 'facing camera' aspect?
  // No, we should store base rotation in userData.

  // Simplified:
  // We don't change position here (it's world anchored).
  // We only change rotation and scale.

  group.scale.setScalar(controls.scale);

  // For rotation, we have a problem: 'place()' sets an initial Y rotation.
  // We should respect that.
  // Let's assume group.quaternion is correct for "Base".
  // Actually, let's just rotate the children or inner container if we wanted perfection.
  // But modifying group.rotation.y directly is fine IF we consider current rotation as "Base + offset"
  // But since this runs every frame, "rotation += control" would spin it forever.

  // Correct approach:
  // Rotation = InitialRotation + ControlRotation.
  // We need to save InitialRotation.

  const initialQ = group.userData.initialQuaternion as THREE.Quaternion;
  if (!initialQ) {
    group.userData.initialQuaternion = group.quaternion.clone();
    return; // Skip first frame if just initialized
  }

  group.quaternion.copy(initialQ);
  group.rotateY(controls.rotation);

  // Initial Position + Offset
  const anchorPos = group.userData.anchorPos as THREE.Vector3;
  if (anchorPos) {
    group.position.copy(anchorPos);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(group.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion);
    group.position.add(right.multiplyScalar(controls.offsetX));
    group.position.add(up.multiplyScalar(controls.offsetY));
  }
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

import sharp from 'sharp';
import { env } from './config';
import { logWarn } from './logger';
import { removeNearWhiteBackground } from './image';

let sessionPromise: Promise<any> | null = null;

async function getSession() {
  if (!env.bgRemovalModelPath) return null;
  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        const ort = await import('onnxruntime-node');
        return await ort.InferenceSession.create(env.bgRemovalModelPath);
      } catch (error) {
        logWarn('onnxruntime-node not available or model load failed');
        return null;
      }
    })();
  }
  return sessionPromise;
}

function normalize(data: Uint8ClampedArray) {
  const float = new Float32Array((data.length / 4) * 3);
  for (let i = 0, j = 0; i < data.length; i += 4) {
    float[j++] = data[i] / 255;
    float[j++] = data[i + 1] / 255;
    float[j++] = data[i + 2] / 255;
  }
  return float;
}

export async function removeBackground(buffer: Buffer) {
  const session = await getSession();
  if (!session) {
    return await removeNearWhiteBackground(buffer);
  }

  const SIZE = 320;
  const resized = await sharp(buffer)
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const input = normalize(new Uint8ClampedArray(resized.data));
  const ort = await import('onnxruntime-node');
  const tensor = new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]);
  const feeds: Record<string, any> = {};
  feeds[session.inputNames[0]] = tensor;

  const results = await session.run(feeds);
  const output = results[session.outputNames[0]] as { data: Float32Array };
  const maskData = output.data;

  const mask = new Uint8ClampedArray(SIZE * SIZE);
  for (let i = 0; i < maskData.length; i++) {
    mask[i] = Math.max(0, Math.min(255, Math.round(maskData[i] * 255)));
  }

  const maskBuffer = await sharp(mask, {
    raw: { width: SIZE, height: SIZE, channels: 1 }
  })
    .resize(resized.info.width, resized.info.height)
    .toBuffer();

  const original = await sharp(buffer).ensureAlpha();
  const { data, info } = await original.raw().toBuffer({ resolveWithObject: true });
  for (let i = 0, j = 0; i < data.length; i += info.channels, j++) {
    data[i + 3] = maskBuffer[j];
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
    .png()
    .toBuffer();
}

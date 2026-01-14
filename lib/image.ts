import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

const MAX_MB = 18;

export async function validateImage(buffer: Buffer) {
  if (buffer.length > MAX_MB * 1024 * 1024) {
    throw new Error(`ファイルサイズは${MAX_MB}MBまでです。`);
  }
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !['image/png', 'image/jpeg'].includes(type.mime)) {
    throw new Error('PNGまたはJPEGのみ対応しています。');
  }
  const image = sharp(buffer, { failOnError: false });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('画像の解析に失敗しました。');
  }
  return { image, mime: type.mime, width: metadata.width, height: metadata.height };
}

export async function resizeToLimit(image: sharp.Sharp, width: number, height: number) {
  const shortSide = Math.min(width, height);
  if (shortSide <= 1536) {
    return image.png().toBuffer();
  }
  const scale = 1536 / shortSide;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);
  return image.resize(targetWidth, targetHeight).png().toBuffer();
}

export async function removeNearWhiteBackground(buffer: Buffer) {
  const image = sharp(buffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 230 && g > 230 && b > 230) {
      data[i + 3] = 0;
    }
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

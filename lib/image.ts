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

function isDarkOpaquePixel(data: Buffer, idx: number, channels: number) {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  const a = channels >= 4 ? data[idx + 3] : 255;
  return a > 200 && r < 28 && g < 28 && b < 28;
}

function clearRow(data: Buffer, width: number, y: number, channels: number) {
  for (let x = 0; x < width; x += 1) {
    const idx = (y * width + x) * channels;
    if (channels >= 4) data[idx + 3] = 0;
  }
}

function clearCol(data: Buffer, width: number, height: number, x: number, channels: number) {
  for (let y = 0; y < height; y += 1) {
    const idx = (y * width + x) * channels;
    if (channels >= 4) data[idx + 3] = 0;
  }
}

export async function removeEdgeDarkBands(buffer: Buffer) {
  const image = sharp(buffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const maxBandRows = Math.max(8, Math.floor(height * 0.22));
  const maxBandCols = Math.max(8, Math.floor(width * 0.22));
  const threshold = 0.78;

  // Bottom band
  for (let y = height - 1; y >= Math.max(0, height - maxBandRows); y -= 1) {
    let dark = 0;
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * channels;
      if (isDarkOpaquePixel(data, idx, channels)) dark += 1;
    }
    if (dark / width >= threshold) {
      clearRow(data, width, y, channels);
      continue;
    }
    break;
  }

  // Top band
  for (let y = 0; y < Math.min(height, maxBandRows); y += 1) {
    let dark = 0;
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * channels;
      if (isDarkOpaquePixel(data, idx, channels)) dark += 1;
    }
    if (dark / width >= threshold) {
      clearRow(data, width, y, channels);
      continue;
    }
    break;
  }

  // Left band
  for (let x = 0; x < Math.min(width, maxBandCols); x += 1) {
    let dark = 0;
    for (let y = 0; y < height; y += 1) {
      const idx = (y * width + x) * channels;
      if (isDarkOpaquePixel(data, idx, channels)) dark += 1;
    }
    if (dark / height >= threshold) {
      clearCol(data, width, height, x, channels);
      continue;
    }
    break;
  }

  // Right band
  for (let x = width - 1; x >= Math.max(0, width - maxBandCols); x -= 1) {
    let dark = 0;
    for (let y = 0; y < height; y += 1) {
      const idx = (y * width + x) * channels;
      if (isDarkOpaquePixel(data, idx, channels)) dark += 1;
    }
    if (dark / height >= threshold) {
      clearCol(data, width, height, x, channels);
      continue;
    }
    break;
  }

  return sharp(data, {
    raw: { width, height, channels }
  })
    .png()
    .toBuffer();
}

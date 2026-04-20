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

function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isOpaquePixel(data: Buffer, idx: number, channels: number) {
  const a = channels >= 4 ? data[idx + 3] : 255;
  return a >= 190;
}

function isBoundaryPixel(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  x: number,
  y: number
) {
  const idx = (y * width + x) * channels;
  const a = channels >= 4 ? data[idx + 3] : 255;
  if (a < 190) return false;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
      const nIdx = (ny * width + nx) * channels;
      const na = channels >= 4 ? data[nIdx + 3] : 255;
      if (na < 20) return true;
    }
  }
  return false;
}

export async function softenOuterOutline(buffer: Buffer) {
  const image = sharp(buffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const boundary = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isBoundaryPixel(data, width, height, channels, x, y)) {
        boundary[y * width + x] = 1;
      }
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!boundary[y * width + x]) continue;
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const pixelLum = luminance(r, g, b);

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;

      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (boundary[ny * width + nx]) continue;
          const nIdx = (ny * width + nx) * channels;
          const na = channels >= 4 ? data[nIdx + 3] : 255;
          if (na < 200) continue;
          sumR += data[nIdx];
          sumG += data[nIdx + 1];
          sumB += data[nIdx + 2];
          count += 1;
        }
      }

      if (count < 3) continue;
      const meanR = sumR / count;
      const meanG = sumG / count;
      const meanB = sumB / count;
      const meanLum = luminance(meanR, meanG, meanB);

      const veryDark = pixelLum < 48;
      const darkerThanInside = pixelLum + 16 < meanLum;

      if (!veryDark && !darkerThanInside) continue;

      // Blend toward inside color to suppress unwanted stroke while preserving silhouette.
      data[idx] = Math.round(meanR * 0.9 + r * 0.1);
      data[idx + 1] = Math.round(meanG * 0.9 + g * 0.1);
      data[idx + 2] = Math.round(meanB * 0.9 + b * 0.1);
    }
  }

  return sharp(data, {
    raw: { width, height, channels }
  })
    .png()
    .toBuffer();
}

function buildBoundaryDistanceMap(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  maxDistance: number
) {
  const total = width * height;
  const distance = new Uint16Array(total);
  distance.fill(maxDistance + 1);
  const queue = new Uint32Array(total);
  let head = 0;
  let tail = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      const idx = pixelIndex * channels;
      if (!isOpaquePixel(data, idx, channels)) continue;
      if (!isBoundaryPixel(data, width, height, channels, x, y)) continue;
      distance[pixelIndex] = 1;
      queue[tail] = pixelIndex;
      tail += 1;
    }
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const dist = distance[pixelIndex];
    if (dist >= maxDistance) continue;

    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const neighborPixelIndex = ny * width + nx;
      const nIdx = neighborPixelIndex * channels;
      if (!isOpaquePixel(data, nIdx, channels)) continue;
      if (distance[neighborPixelIndex] <= dist + 1) continue;
      distance[neighborPixelIndex] = dist + 1;
      queue[tail] = neighborPixelIndex;
      tail += 1;
    }
  }

  return distance;
}

export async function softenInnerOutlineEchoes(buffer: Buffer) {
  const image = sharp(buffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const maxEchoDistance = Math.max(8, Math.min(28, Math.round(Math.min(width, height) * 0.03)));
  const distance = buildBoundaryDistanceMap(data, width, height, channels, maxEchoDistance + 8);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      const dist = distance[pixelIndex];
      if (dist < 2 || dist > maxEchoDistance) continue;

      const idx = pixelIndex * channels;
      if (!isOpaquePixel(data, idx, channels)) continue;

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;

      for (let dy = -5; dy <= 5; dy += 1) {
        for (let dx = -5; dx <= 5; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const neighborPixelIndex = ny * width + nx;
          const neighborDistance = distance[neighborPixelIndex];
          if (neighborDistance <= dist + 1) continue;
          const nIdx = neighborPixelIndex * channels;
          if (!isOpaquePixel(data, nIdx, channels)) continue;
          sumR += data[nIdx];
          sumG += data[nIdx + 1];
          sumB += data[nIdx + 2];
          count += 1;
        }
      }

      if (count < 12) continue;

      const meanR = sumR / count;
      const meanG = sumG / count;
      const meanB = sumB / count;
      const pixelLum = luminance(data[idx], data[idx + 1], data[idx + 2]);
      const meanLum = luminance(meanR, meanG, meanB);
      const darkerThanInside = pixelLum + 20 < meanLum;

      if (!darkerThanInside) continue;

      data[idx] = Math.round(meanR * 0.88 + data[idx] * 0.12);
      data[idx + 1] = Math.round(meanG * 0.88 + data[idx + 1] * 0.12);
      data[idx + 2] = Math.round(meanB * 0.88 + data[idx + 2] * 0.12);
    }
  }

  return sharp(data, {
    raw: { width, height, channels }
  })
    .png()
    .toBuffer();
}

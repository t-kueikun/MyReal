import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { softenInnerOutlineEchoes } from '../lib/image';

function pixelAt(data: Buffer, width: number, x: number, y: number) {
  const idx = (y * width + x) * 4;
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    a: data[idx + 3]
  };
}

describe('softenInnerOutlineEchoes', () => {
  it('softens thin dark lines that echo the outer silhouette', async () => {
    const width = 64;
    const height = 64;
    const body = { r: 202, g: 222, b: 232, a: 255 };
    const darkLine = { r: 68, g: 96, b: 156, a: 255 };
    const raw = Buffer.alloc(width * height * 4, 0);

    for (let y = 8; y <= 55; y += 1) {
      for (let x = 8; x <= 55; x += 1) {
        const idx = (y * width + x) * 4;
        raw[idx] = body.r;
        raw[idx + 1] = body.g;
        raw[idx + 2] = body.b;
        raw[idx + 3] = body.a;
      }
    }

    for (let x = 18; x <= 45; x += 1) {
      const chinIdx = (48 * width + x) * 4;
      raw[chinIdx] = darkLine.r;
      raw[chinIdx + 1] = darkLine.g;
      raw[chinIdx + 2] = darkLine.b;
      raw[chinIdx + 3] = darkLine.a;
    }

    for (let x = 25; x <= 38; x += 1) {
      const mouthIdx = (32 * width + x) * 4;
      raw[mouthIdx] = darkLine.r;
      raw[mouthIdx + 1] = darkLine.g;
      raw[mouthIdx + 2] = darkLine.b;
      raw[mouthIdx + 3] = darkLine.a;
    }

    const input = await sharp(raw, {
      raw: { width, height, channels: 4 }
    })
      .png()
      .toBuffer();

    const output = await softenInnerOutlineEchoes(input);
    const { data } = await sharp(output)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const chinBefore = pixelAt(raw, width, 24, 48);
    const chinAfter = pixelAt(data, width, 24, 48);
    const mouthBefore = pixelAt(raw, width, 30, 32);
    const mouthAfter = pixelAt(data, width, 30, 32);

    expect(chinAfter.r).toBeGreaterThan(chinBefore.r + 80);
    expect(chinAfter.g).toBeGreaterThan(chinBefore.g + 70);
    expect(chinAfter.b).toBeGreaterThan(chinBefore.b + 35);

    expect(Math.abs(mouthAfter.r - mouthBefore.r)).toBeLessThanOrEqual(10);
    expect(Math.abs(mouthAfter.g - mouthBefore.g)).toBeLessThanOrEqual(10);
    expect(Math.abs(mouthAfter.b - mouthBefore.b)).toBeLessThanOrEqual(10);
  });
});

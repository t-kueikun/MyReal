import sharp from 'sharp';

export async function stylizeFallback(buffer: Buffer, palette: string[]) {
  const [c1, c2, c3] = palette;
  const colors = [c1, c2, c3].map((hex) => hexToRgb(hex));
  const base = await sharp(buffer).ensureAlpha();
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luminance < 60) {
      data[i] = 24;
      data[i + 1] = 24;
      data[i + 2] = 28;
      continue;
    }

    const bucket = luminance < 120 ? 0 : luminance < 190 ? 1 : 2;
    const color = colors[bucket];
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
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

function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '');
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

import { env } from './config';
import { logError } from './logger';
import { VariationOption } from './variation';
import { MoodOption } from './mood';

const ENDPOINT = 'https://api.stability.ai/v2beta/stable-image/generate/sd3';

async function withBackoff<T>(fn: () => Promise<T>) {
  const delays = [500, 1000, 2000];
  let lastError: unknown;
  for (let i = 0; i < delays.length; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, delays[i]));
    }
  }
  throw lastError;
}

function buildStableDiffusionPrompt(
  palette: string[],
  mood: MoodOption,
  variation: VariationOption
) {
  const moodPromptById: Record<string, string> = {
    pastel: 'soft pastel colors, gentle plush-toy feel with light shading',
    vivid: 'bright vivid colors, pop and energetic feel with soft volume',
    retro: 'muted retro colors, vintage kawaii feel with gentle shading',
    clay: 'matte coloring, clay-like simplicity with subtle soft shadows',
    paper: 'clean paper-like illustration style with minimal soft shading',
    neon: 'bright neon colors with bold outlines and soft glow'
  };

  const variationPromptById: Record<string, string> = {
    subtle: 'keep the silhouette and key features very close to the input',
    standard:
      'keep the silhouette while changing patterns, expression, and texture for character',
    bold:
      'keep the silhouette but make bold stylistic changes and add unique accessories'
  };

  const moodPrompt =
    moodPromptById[mood.id] ||
    'friendly and cute finish with soft texture and balanced contrast';
  const variationPrompt =
    variationPromptById[variation.id] || variationPromptById.standard;

  return [
    'Create one cute mascot character in a kawaii style like BT21 or LINE Friends characters.',
    'Make it look like a cute animal, ghost, or creature.',
    'Keep the character concept and main silhouette from the input image. Ignore all construction marks.',
    'Simple rounded shapes, minimal details, chunky adorable proportions.',
    'Soft 3D plush-toy volume with gentle shading and highlights. Soft rounded outlines, not too thick or harsh.',
    'Warm smiley expression with pink cheeks. Can vary with sleeping face, waving pose, etc.',
    'Background must be pure white (#FFFFFF) with no shadows or patterns.',
    'Do not include any guide lines, dotted lines, triangles, circles, measurements, arrows, text, or overlays.',
    `Use this color palette as the base: ${palette.join(', ')}.`,
    `Style direction: ${moodPrompt}.`,
    `Variation: ${variationPrompt}.`
  ].join(' ');
}

function buildStableDiffusionNegativePrompt() {
  return [
    'guide lines',
    'construction lines',
    'dotted lines',
    'triangle overlay',
    'geometry marks',
    'sketch artifacts',
    'text',
    'watermark',
    'logo',
    'extra characters',
    'blurry',
    'low quality'
  ].join(', ');
}

export async function generateWithStableDiffusion(
  image: Buffer,
  palette: string[],
  mood: MoodOption,
  variation: VariationOption
): Promise<Buffer> {
  if (!env.stabilityApiKey) {
    throw new Error('Stability API key missing');
  }

  const prompt = buildStableDiffusionPrompt(palette, mood, variation);
  const negativePrompt = buildStableDiffusionNegativePrompt();
  const imageBytes = new Uint8Array(image.byteLength);
  imageBytes.set(image);
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('mode', 'image-to-image');
  form.append('image', new Blob([imageBytes], { type: 'image/png' }), 'input.png');
  form.append('strength', String(env.stableDiffusionStrength));
  form.append('model', env.stableDiffusionModel);
  form.append('cfg_scale', String(env.stableDiffusionCfgScale));
  form.append('negative_prompt', negativePrompt);
  if (env.stableDiffusionStylePreset) {
    form.append('style_preset', env.stableDiffusionStylePreset);
  }
  form.append('output_format', 'png');

  return await withBackoff(async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.stabilityApiKey}`,
        Accept: 'image/*'
      },
      body: form
    });

    if (!res.ok) {
      const body = await res.text();
      logError('Stable Diffusion failed', {
        status: res.status,
        body: body.slice(0, 400)
      });
      throw new Error('Stable Diffusion failed');
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = (await res.json()) as any;
      const imageBase64 = payload?.image;
      if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
        throw new Error('Stable Diffusion returned empty image payload');
      }
      return Buffer.from(imageBase64, 'base64');
    }

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error('Stable Diffusion returned empty image body');
    }
    return bytes;
  });
}

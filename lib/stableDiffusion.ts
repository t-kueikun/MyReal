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
    kawaii: 'soft pastel colors, gentle plush-toy feel with light shading, round and cute',
    cool: 'cool muted tones, slightly edgy and sleek, calm confident vibe',
    pop: 'bright vivid colors, pop and energetic feel with playful volume',
    yume: 'dreamy pastel lavender and mint tones, soft fantasy glow, magical feel',
    natural: 'warm earthy tones, cozy and gentle, natural organic warmth',
    mystery: 'deep moody colors, night-like tones, slightly mysterious and enchanting'
  };

  const variationPromptById: Record<string, string> = {
    subtle: 'keep the general impression and motif close to the input while softening into a round cute mascot',
    standard:
      'use the input as inspiration to redesign a new cute mascot character. Do not trace or fill in the original lines. Do not treat enclosed line areas as regions to color. Reinterpret into round, adorable shapes.',
    bold:
      'use the input as loose inspiration and make bold stylistic changes, adding unique accessories and creative reinterpretation'
  };

  const moodPrompt =
    moodPromptById[mood.id] ||
    'friendly and cute finish with soft texture and balanced contrast';
  const variationPrompt =
    variationPromptById[variation.id] || variationPromptById.standard;

  return [
    'Create one cute mascot character in a kawaii style like BT21 or LINE Friends characters.',
    'Make it look like a cute animal, ghost, or creature.',
    'Use the input image as inspiration for the character concept. Do not trace or fill in the original lines. Do not interpret closed outlines as fillable shapes. Do not auto-fill the inside of the original linework. Create a new cute character inspired by the input.',
    'Do not leave any leftover sketch fragments, echo contours, duplicate jaw lines, chin lines, or residual original strokes in the final image.',
    'Simple rounded shapes, minimal details, chunky adorable proportions.',
    'MUST have soft 3D plush-toy volume with visible gentle shading, highlights, and round marshmallow-like depth. Never flat or 2D. Soft rounded outlines in a color similar to the character, NOT black outlines. No hard black edges.',
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
    'black outlines',
    'black edges',
    'thick outlines',
    'filled line art',
    'filled outlines',
    'inside-outline fill',
    'solid fill inside sketch lines',
    'coloring book fill',
    'paint bucket fill',
    'leftover sketch line',
    'echo outline',
    'double contour',
    'duplicate jaw line',
    'duplicate chin line',
    'residual stroke',
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

import { env } from './config';
import { logError } from './logger';
import { buildPrompt } from './prompt';
import { MoodOption } from './mood';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

function extractBase64FromDataUrl(url: string) {
  const match = url.match(/^data:image\/[^;]+;base64,(.+)$/);
  return match ? match[1] : null;
}

function extractImageBase64(payload: any) {
  const message = payload?.choices?.[0]?.message;
  const images = message?.images;
  if (Array.isArray(images) && images.length > 0) {
    const url =
      images[0]?.image_url?.url ||
      images[0]?.imageUrl?.url ||
      images[0]?.image_url ||
      images[0]?.imageUrl;
    if (typeof url === 'string') {
      const base64 = extractBase64FromDataUrl(url);
      if (base64) return base64;
    }
  }

  const content = message?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part?.type !== 'image_url') continue;
      const url = part?.image_url?.url || part?.imageUrl?.url || part?.image_url;
      if (typeof url === 'string') {
        const base64 = extractBase64FromDataUrl(url);
        if (base64) return base64;
      }
    }
  }

  const data = payload?.data;
  if (Array.isArray(data) && data.length > 0) {
    const base64 = data[0]?.b64_json;
    if (typeof base64 === 'string') return base64;
    const url = data[0]?.url;
    if (typeof url === 'string') {
      const maybe = extractBase64FromDataUrl(url);
      if (maybe) return maybe;
    }
  }

  return null;
}

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

export async function generateWithOpenRouter(
  image: Buffer,
  palette: string[],
  mood: MoodOption
): Promise<Buffer> {
  if (!env.openRouterApiKey) {
    throw new Error('OpenRouter API key missing');
  }

  const prompt = buildPrompt(palette, mood);
  const base64 = image.toString('base64');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.openRouterApiKey}`,
    'Content-Type': 'application/json'
  };

  if (env.openRouterReferer) {
    headers['HTTP-Referer'] = env.openRouterReferer;
  }
  if (env.openRouterTitle) {
    headers['X-Title'] = env.openRouterTitle;
  }

  return await withBackoff(async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: env.openRouterModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64}`
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text'],
        image_config: {
          aspect_ratio: '1:1',
          image_size: '1K'
        },
        max_tokens: 512,
        stream: false
      })
    });

    if (!res.ok) {
      const body = await res.text();
      logError('OpenRouter failed', {
        status: res.status,
        body: body.slice(0, 400)
      });
      throw new Error('OpenRouter failed');
    }

    const data = (await res.json()) as any;
    const imageBase64 = extractImageBase64(data);
    if (!imageBase64) {
      logError('OpenRouter no image data', {
        keys: data ? Object.keys(data) : []
      });
      throw new Error('OpenRouter no image data');
    }

    return Buffer.from(imageBase64, 'base64');
  });
}

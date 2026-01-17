import { env } from './config';
import { logError, logInfo } from './logger';
import { buildPrompt } from './prompt';
import { MoodOption } from './mood';

function normalizeModel(model: string) {
  return model.startsWith('models/') ? model : `models/${model}`;
}

function isImageModel(model: string) {
  return /image|imagen/i.test(model);
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

export async function generateWithGemini(
  image: Buffer,
  palette: string[],
  mood: MoodOption
): Promise<Buffer> {
  if (!env.geminiApiKey) {
    throw new Error('Gemini API key missing');
  }

  const base64 = image.toString('base64');
  const prompt = buildPrompt(palette, mood);
  const modelName = normalizeModel(env.geminiModel);
  const useImageModel = isImageModel(env.geminiModel);

  return await withBackoff(async () => {
    // Imagen 3 specific logic (:predict endpoint)
    if (env.geminiModel.includes('imagen')) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:predict`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.geminiApiKey
          },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1 }
          })
        }
      );

      if (!res.ok) {
        const body = await res.text();
        logError('Imagen REST failed', {
          status: res.status,
          body: body.slice(0, 400)
        });
        throw new Error('Imagen REST failed');
      }

      const data = (await res.json()) as any;
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) throw new Error('Imagen REST no image data');
      return Buffer.from(b64, 'base64');
    }

    if (useImageModel) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.geminiApiKey
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: 'image/png',
                      data: base64
                    }
                  }
                ]
              }
            ]
          })
        }
      );
      if (!res.ok) {
        const body = await res.text();
        logError('Gemini REST failed', {
          status: res.status,
          body: body.slice(0, 400)
        });
        throw new Error('Gemini REST failed');
      }
      const data = (await res.json()) as any;
      const part = data.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData?.data || p.inline_data?.data
      );
      const inline = part?.inlineData?.data || part?.inline_data?.data;
      if (!inline) throw new Error('Gemini REST no image data');
      return Buffer.from(inline, 'base64');
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(env.geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: env.geminiModel
      });
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64
                }
              }
            ]
          }
        ],
        generationConfig: {
          // @ts-ignore
          // responseModalities: ['image']
        }
      });
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((part: any) => part.inlineData?.data);
      if (!imagePart?.inlineData?.data) {
        throw new Error('Gemini SDK did not return image data');
      }
      return Buffer.from(imagePart.inlineData.data, 'base64');
    } catch (error) {
      logInfo('Gemini SDK failed, trying REST fallback');
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.geminiApiKey
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: 'image/png',
                      data: base64
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              // response_modalities: ['image'] // Reverted: caused 400 error
            }
          })
        }
      );
      if (!res.ok) {
        const body = await res.text();
        logError('Gemini REST failed', {
          status: res.status,
          body: body.slice(0, 400)
        });
        throw new Error('Gemini REST failed');
      }
      const data = (await res.json()) as any;
      const part = data.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData?.data || p.inline_data?.data
      );
      const inline = part?.inlineData?.data || part?.inline_data?.data;
      if (!inline) throw new Error('Gemini REST no image data');
      return Buffer.from(inline, 'base64');
    }
  });
}

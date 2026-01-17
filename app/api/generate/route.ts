import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { validateImage, resizeToLimit, removeNearWhiteBackground } from '../../../lib/image';
import { removeBackground } from '../../../lib/backgroundRemove';
import { generateWithGemini } from '../../../lib/gemini';
import { generateWithOpenRouter } from '../../../lib/openrouter';
import { stylizeFallback } from '../../../lib/stylize';
import { createToken } from '../../../lib/token';
import { saveMeta } from '../../../lib/metadata';
import { getImageUrl, saveImage } from '../../../lib/storage';
import { queueTask } from '../../../lib/queue';
import { recordFailure, recordGeneration } from '../../../lib/metrics';
import { checkRateLimit, hashIp } from '../../../lib/rateLimit';
import { assertSameOrigin, getRequestIp } from '../../../lib/security';
import { env } from '../../../lib/config';
import { logError, logInfo } from '../../../lib/logger';
import { resolveMood } from '../../../lib/mood';
import sharp from 'sharp';

export const runtime = 'nodejs';

const paletteSchema = z
  .array(z.string().regex(/^#([0-9a-fA-F]{6})$/))
  .length(3);

export async function POST(request: NextRequest) {
  try {
    if (env.maintenanceMode) {
      return NextResponse.json(
        { message: 'メンテナンス中です。' },
        { status: 503 }
      );
    }
    assertSameOrigin(request);
    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { message: '画像が見つかりません。' },
        { status: 400 }
      );
    }
    const paletteRaw = form.get('palette');
    const palette = paletteSchema.parse(
      paletteRaw ? JSON.parse(String(paletteRaw)) : []
    );
    const bgRemove = form.get('bgRemove') === '1';
    const moodRaw = form.get('mood');
    const moodId = typeof moodRaw === 'string' ? moodRaw : 'random';
    const mood = resolveMood(moodId);
    const source = form.get('source') === 'upload' ? 'upload' : 'draw';
    const priorityCode = String(form.get('priorityCode') || '');

    const bypass = env.eventMode && priorityCode && priorityCode === env.priorityCode;
    const isDev = process.env.NODE_ENV === 'development';
    if (!bypass && !isDev) {
      const ipHash = hashIp(getRequestIp(request));
      const rate = checkRateLimit(ipHash);
      if (!rate.allowed) {
        return NextResponse.json(
          { message: `少し待ってから再試行してください。`, retryAfter: rate.retryAfter },
          { status: 429 }
        );
      }
    }

    const start = Date.now();

    const task = async () => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { image, width, height } = await validateImage(buffer);
      let processed = await resizeToLimit(image, width, height);
      if (bgRemove) {
        processed = await removeBackground(processed).catch(async () =>
          removeNearWhiteBackground(processed)
        );
      }

      let output: Buffer | undefined;
      let provider: 'gemini' | 'openrouter' | 'fallback' = 'fallback';
      let aiAttempted = false;
      const fallbackInput = bgRemove
        ? processed
        : await removeNearWhiteBackground(processed);
      if (env.openRouterApiKey) {
        aiAttempted = true;
        try {
          output = await generateWithOpenRouter(processed, palette, mood);
          provider = 'openrouter';
        } catch (error) {
          logError('OpenRouter generation failed', { error: String(error) });
        }
      }

      if (!output && env.geminiApiKey) {
        aiAttempted = true;
        try {
          output = await generateWithGemini(processed, palette, mood);
          provider = 'gemini';
        } catch (error) {
          logError('Gemini generation failed', { error: String(error) });
        }
      }

      if (!output) {
        output = await stylizeFallback(fallbackInput, palette);
        provider = 'fallback';
      }

      const geminiFailed = aiAttempted && provider === 'fallback';

      // Always attempt to remove background from the generated result
      // because we explicitly prompted for a white background.
      if (output) {
        try {
          output = await removeBackground(output);
        } catch (error) {
          logError('Output background removal failed', { error: String(error) });
        }
      }

      output = await sharp(output)
        .resize(1024, 1024, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();

      const saved = await saveImage(output, 'image/png', 'generated');
      const { token, exp } = createToken(env.tokenTtlHours);
      const expiresAt = new Date(exp).toISOString();
      await saveMeta({
        token,
        imageKey: saved.key,
        createdAt: new Date().toISOString(),
        expiresAt,
        palette,
        source
      });
      const imageUrl = await getImageUrl(saved.key, env.tokenTtlHours * 3600);
      return { token, imageUrl, expiresAt, provider, geminiFailed };
    };

    const result = bypass ? await task() : await queueTask(task, 1);

    await recordGeneration(Date.now() - start);
    logInfo('generation completed', {
      durationMs: Date.now() - start,
      provider: result.provider,
      geminiFailed: result.geminiFailed,
      model: result.provider === 'openrouter' ? env.openRouterModel : env.geminiModel,
      hasGeminiKey: Boolean(env.geminiApiKey),
      hasOpenRouterKey: Boolean(env.openRouterApiKey)
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    await recordFailure();
    if (error instanceof ZodError) {
      return NextResponse.json({ message: '入力が不正です。' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Invalid origin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    logError('generation error', { error: String(error) });
    return NextResponse.json(
      { message: '生成に失敗しました。時間をおいて再試行してください。' },
      { status: 500 }
    );
  }
}

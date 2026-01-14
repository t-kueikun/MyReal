import { env } from './config';
import { logError, logInfo } from './logger';
import { removeNearWhiteBackground } from './image';

export async function removeBackground(buffer: Buffer) {
  // 1. remove.bg API (High Quality)
  if (env.removeBgApiKey) {
    try {
      const formData = new FormData();
      formData.append('image_file', new Blob([buffer as BlobPart]));
      formData.append('size', 'auto');

      const res = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': env.removeBgApiKey
        },
        body: formData
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        logInfo('remove.bg success');
        return Buffer.from(arrayBuffer);
      } else {
        const err = await res.text();
        logError('remove.bg failed', { status: res.status, body: err });
        // Fallthrough to local fallback
      }
    } catch (error) {
      logError('remove.bg error', { error: String(error) });
      // Fallthrough to local fallback
    }
  }

  // 2. Local Fallback (Heuristic)
  if (!env.removeBgApiKey) {
    logInfo('No remove.bg API key, using local fallback');
  }
  // onnxruntime-node is too heavy for Vercel Serverless (exceeds 250MB limit).
  // Falling back to simple heuristic removal which works well for generated images with simple backgrounds.
  return await removeNearWhiteBackground(buffer);
}

import { env } from '../lib/config';
import { deleteMeta, listExpired } from '../lib/metadata';
import { deleteImage } from '../lib/storage';
import { logInfo, logError } from '../lib/logger';

async function run() {
  const now = Date.now();
  const expired = await listExpired(now);
  const retentionMs = env.imageRetentionHours * 60 * 60 * 1000;

  const toDelete = expired.filter((meta) => {
    const createdAt = new Date(meta.createdAt).getTime();
    return now - createdAt > retentionMs || now > new Date(meta.expiresAt).getTime();
  });

  for (const meta of toDelete) {
    try {
      await deleteImage(meta.imageKey);
      await deleteMeta(meta.token);
      logInfo('cleanup removed', { token: meta.token });
    } catch (error) {
      logError('cleanup failed', { error: String(error) });
    }
  }

  logInfo('cleanup done', { count: toDelete.length });
}

run().catch((error) => {
  logError('cleanup crashed', { error: String(error) });
  process.exit(1);
});

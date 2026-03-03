import fs from 'fs/promises';
import path from 'path';
import { env } from './config';
import { getSupabaseAdmin, isSupabaseEnabled } from './supabase';
import { logWarn } from './logger';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_DIR = path.join(DATA_DIR, 'storage');

function s3Client() {
  return new S3Client({
    region: env.s3Region,
    endpoint: env.s3Endpoint || undefined,
    credentials: env.s3AccessKeyId
      ? {
          accessKeyId: env.s3AccessKeyId,
          secretAccessKey: env.s3SecretAccessKey
        }
      : undefined
  });
}

function ensureLocalPath(key: string) {
  return path.join(LOCAL_DIR, key);
}

export async function saveImage(
  buffer: Buffer,
  contentType: string,
  prefix = 'generated'
) {
  const filename = `${prefix}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.png`;
  return await saveFileWithKey(filename, buffer, contentType);
}

export async function saveFile(
  buffer: Buffer,
  contentType: string,
  prefix = 'generated',
  extension = 'bin'
) {
  const ext = extension.replace(/^\./, '') || 'bin';
  const filename = `${prefix}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  return await saveFileWithKey(filename, buffer, contentType);
}

async function saveFileWithKey(
  filename: string,
  buffer: Buffer,
  contentType: string
) {
  const localFallbackKey = `local-fallback/${filename}`;
  if (
    env.storageProvider === 'supabase' &&
    isSupabaseEnabled() &&
    env.supabaseBucket
  ) {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage
        .from(env.supabaseBucket)
        .upload(filename, buffer, {
          contentType,
          cacheControl: '3600',
          upsert: false
        });
      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
      }
      return { key: filename };
    } catch (error) {
      logWarn('Supabase upload failed, falling back to local storage', {
        error: String(error)
      });
    }
  }
  if (env.storageProvider === 's3' && env.s3Bucket) {
    try {
      const client = s3Client();
      await client.send(
        new PutObjectCommand({
          Bucket: env.s3Bucket,
          Key: filename,
          Body: buffer,
          ContentType: contentType
        })
      );
      return { key: filename };
    } catch (error) {
      logWarn('S3 upload failed, falling back to local storage', {
        error: String(error)
      });
      await fs.mkdir(LOCAL_DIR, { recursive: true });
      const localPath = ensureLocalPath(localFallbackKey);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, buffer);
      return { key: localFallbackKey };
    }
  }

  await fs.mkdir(LOCAL_DIR, { recursive: true });
  const localPath = ensureLocalPath(
    env.storageProvider === 'supabase' ? localFallbackKey : filename
  );
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);
  return { key: env.storageProvider === 'supabase' ? localFallbackKey : filename };
}

export async function getImageUrl(key: string, expiresInSec = 60 * 60) {
  if (key.startsWith('local-fallback/')) {
    return `/api/file/${key}`;
  }
  if (
    env.storageProvider === 'supabase' &&
    isSupabaseEnabled() &&
    env.supabaseBucket
  ) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(env.supabaseBucket)
        .createSignedUrl(key, expiresInSec);
      if (error || !data?.signedUrl) {
        throw new Error(`Supabase signed URL failed: ${error?.message || 'unknown'}`);
      }
      return data.signedUrl;
    } catch (error) {
      logWarn('Supabase signed URL failed, using local file URL', {
        error: String(error),
        key
      });
      return `/api/file/${key}`;
    }
  }
  if (env.storageProvider === 's3' && env.s3Bucket) {
    if (env.s3PublicUrl) {
      return `${env.s3PublicUrl.replace(/\/$/, '')}/${key}`;
    }
    const client = s3Client();
    const command = new GetObjectCommand({
      Bucket: env.s3Bucket,
      Key: key
    });
    return await getSignedUrl(client, command, { expiresIn: expiresInSec });
  }
  return `/api/file/${key}`;
}

export async function deleteImage(key: string) {
  if (key.startsWith('local-fallback/')) {
    const localPath = ensureLocalPath(key);
    await fs.rm(localPath, { force: true });
    return;
  }
  if (
    env.storageProvider === 'supabase' &&
    isSupabaseEnabled() &&
    env.supabaseBucket
  ) {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(env.supabaseBucket).remove([key]);
    return;
  }
  if (env.storageProvider === 's3' && env.s3Bucket) {
    const client = s3Client();
    await client.send(
      new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: key })
    );
    return;
  }
  const localPath = ensureLocalPath(key);
  await fs.rm(localPath, { force: true });
}

export async function readLocalFile(key: string) {
  const localPath = ensureLocalPath(key);
  return await fs.readFile(localPath);
}

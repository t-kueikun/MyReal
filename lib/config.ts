import fs from 'fs';
import path from 'path';
import { z } from 'zod';

type EnvMap = Record<string, string>;

function readEnvLocal(): EnvMap {
  if (process.env.NODE_ENV !== 'development') return {};
  try {
    const content = fs.readFileSync(
      path.join(process.cwd(), '.env.local'),
      'utf8'
    );
    const entries: EnvMap = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (key) entries[key] = value;
    }
    return entries;
  } catch {
    return {};
  }
}

const envLocal = readEnvLocal();

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  OPENROUTER_REFERER: z.string().optional(),
  OPENROUTER_TITLE: z.string().optional(),
  TOKEN_SECRET: z.string().optional(),
  STORAGE_PROVIDER: z.enum(['s3', 'local', 'supabase']).optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  ADMIN_USER: z.string().optional(),
  ADMIN_PASS: z.string().optional(),
  EVENT_MODE: z.string().optional(),
  PRIORITY_CODE: z.string().optional(),
  GEN_CONCURRENCY: z.string().optional(),
  RATE_LIMIT_PER_MIN: z.string().optional(),
  TOKEN_TTL_HOURS: z.string().optional(),
  IMAGE_RETENTION_HOURS: z.string().optional(),
  MAINTENANCE_MODE: z.string().optional(),
  BACKGROUND_REMOVAL_MODEL_PATH: z.string().optional(),
  LOG_LEVEL: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

const raw = parsed.success ? parsed.data : {};

export const env = {
  appUrl: raw.NEXT_PUBLIC_APP_URL || envLocal.NEXT_PUBLIC_APP_URL || '',
  geminiApiKey: raw.GEMINI_API_KEY || envLocal.GEMINI_API_KEY || '',
  geminiModel:
    raw.GEMINI_MODEL ||
    envLocal.GEMINI_MODEL ||
    'gemini-2.0-flash-exp-image-generation',
  openRouterApiKey:
    raw.OPENROUTER_API_KEY || envLocal.OPENROUTER_API_KEY || '',
  openRouterModel:
    raw.OPENROUTER_MODEL ||
    envLocal.OPENROUTER_MODEL ||
    'google/gemini-2.5-flash-image',
  openRouterReferer:
    raw.OPENROUTER_REFERER || envLocal.OPENROUTER_REFERER || '',
  openRouterTitle:
    raw.OPENROUTER_TITLE || envLocal.OPENROUTER_TITLE || '',
  tokenSecret: raw.TOKEN_SECRET || envLocal.TOKEN_SECRET || '',
  storageProvider: raw.STORAGE_PROVIDER || envLocal.STORAGE_PROVIDER || 'local',
  supabaseUrl: raw.SUPABASE_URL || envLocal.SUPABASE_URL || '',
  supabaseServiceRoleKey:
    raw.SUPABASE_SERVICE_ROLE_KEY || envLocal.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseBucket: raw.SUPABASE_BUCKET || envLocal.SUPABASE_BUCKET || 'myreal',
  s3Endpoint: raw.S3_ENDPOINT || envLocal.S3_ENDPOINT || '',
  s3Region: raw.S3_REGION || envLocal.S3_REGION || 'auto',
  s3Bucket: raw.S3_BUCKET || envLocal.S3_BUCKET || '',
  s3AccessKeyId:
    raw.S3_ACCESS_KEY_ID || envLocal.S3_ACCESS_KEY_ID || '',
  s3SecretAccessKey:
    raw.S3_SECRET_ACCESS_KEY || envLocal.S3_SECRET_ACCESS_KEY || '',
  s3PublicUrl: raw.S3_PUBLIC_URL || envLocal.S3_PUBLIC_URL || '',
  upstashUrl: raw.UPSTASH_REDIS_REST_URL || envLocal.UPSTASH_REDIS_REST_URL || '',
  upstashToken:
    raw.UPSTASH_REDIS_REST_TOKEN || envLocal.UPSTASH_REDIS_REST_TOKEN || '',
  adminUser: raw.ADMIN_USER || envLocal.ADMIN_USER || '',
  adminPass: raw.ADMIN_PASS || envLocal.ADMIN_PASS || '',
  eventMode: (raw.EVENT_MODE || envLocal.EVENT_MODE) === 'true',
  priorityCode: raw.PRIORITY_CODE || envLocal.PRIORITY_CODE || '',
  concurrency: Math.max(
    1,
    Number(raw.GEN_CONCURRENCY || envLocal.GEN_CONCURRENCY || '2')
  ),
  rateLimitPerMin: Math.max(
    1,
    Number(raw.RATE_LIMIT_PER_MIN || envLocal.RATE_LIMIT_PER_MIN || '1')
  ),
  tokenTtlHours: Math.max(
    1,
    Number(raw.TOKEN_TTL_HOURS || envLocal.TOKEN_TTL_HOURS || '24')
  ),
  imageRetentionHours: Math.max(
    1,
    Number(raw.IMAGE_RETENTION_HOURS || envLocal.IMAGE_RETENTION_HOURS || '48')
  ),
  maintenanceMode:
    (raw.MAINTENANCE_MODE || envLocal.MAINTENANCE_MODE) === 'true',
  bgRemovalModelPath:
    raw.BACKGROUND_REMOVAL_MODEL_PATH || envLocal.BACKGROUND_REMOVAL_MODEL_PATH || '',
  logLevel: raw.LOG_LEVEL || envLocal.LOG_LEVEL || 'info'
};

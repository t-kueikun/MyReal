import fs from 'fs/promises';
import path from 'path';
import { env } from './config';
import { getSupabaseAdmin, isSupabaseEnabled } from './supabase';

export type TokenMeta = {
  token: string;
  imageKey: string;
  createdAt: string;
  expiresAt: string;
  palette: string[];
  source: 'draw' | 'upload';
};

const DATA_DIR = path.join(process.cwd(), 'data');
const META_PATH = path.join(DATA_DIR, 'meta.json');
let localCache: Record<string, TokenMeta> | null = null;
let writing = Promise.resolve();
const META_TABLE = 'myreal_meta';

function mapRow(row: any): TokenMeta {
  return {
    token: row.token,
    imageKey: row.image_key,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    palette: Array.isArray(row.palette) ? row.palette : row.palette || [],
    source: row.source === 'upload' ? 'upload' : 'draw'
  };
}

async function loadLocal() {
  if (localCache) return localCache;
  try {
    const raw = await fs.readFile(META_PATH, 'utf-8');
    localCache = JSON.parse(raw) as Record<string, TokenMeta>;
  } catch {
    localCache = {};
  }
  return localCache;
}

async function saveLocal() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const data = JSON.stringify(localCache ?? {}, null, 2);
  writing = writing.then(() => fs.writeFile(META_PATH, data));
  await writing;
}

async function upstash(command: string[]) {
  const res = await fetch(env.upstashUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.upstashToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    throw new Error('Upstash request failed');
  }
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

export async function saveMeta(meta: TokenMeta) {
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from(META_TABLE).upsert(
      {
        token: meta.token,
        image_key: meta.imageKey,
        created_at: meta.createdAt,
        expires_at: meta.expiresAt,
        palette: meta.palette,
        source: meta.source
      },
      { onConflict: 'token' }
    );
    if (error) throw new Error(`Supabase meta save failed: ${error.message}`);
    return;
  }
  if (env.upstashUrl && env.upstashToken) {
    const ttl = Math.max(60, env.tokenTtlHours * 3600);
    await upstash(['SET', `myreal:${meta.token}`, JSON.stringify(meta), 'EX', String(ttl)]);
    return;
  }
  const local = await loadLocal();
  local[meta.token] = meta;
  await saveLocal();
}

export async function getMeta(token: string) {
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(META_TABLE)
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  }
  if (env.upstashUrl && env.upstashToken) {
    const result = await upstash(['GET', `myreal:${token}`]);
    if (!result) return null;
    return JSON.parse(result as string) as TokenMeta;
  }
  const local = await loadLocal();
  return local[token] ?? null;
}

export async function deleteMeta(token: string) {
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAdmin();
    await supabase.from(META_TABLE).delete().eq('token', token);
    return;
  }
  if (env.upstashUrl && env.upstashToken) {
    await upstash(['DEL', `myreal:${token}`]);
    return;
  }
  const local = await loadLocal();
  delete local[token];
  await saveLocal();
}

export async function listExpired(now = Date.now()) {
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from(META_TABLE)
      .select('*')
      .lt('expires_at', new Date(now).toISOString());
    return (data ?? []).map(mapRow);
  }
  if (env.upstashUrl && env.upstashToken) {
    return [] as TokenMeta[];
  }
  const local = await loadLocal();
  return Object.values(local).filter((meta) =>
    now > new Date(meta.expiresAt).getTime()
  );
}

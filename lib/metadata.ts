import fs from 'fs/promises';
import path from 'path';
import { env } from './config';

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
  if (env.upstashUrl && env.upstashToken) {
    const result = await upstash(['GET', `myreal:${token}`]);
    if (!result) return null;
    return JSON.parse(result as string) as TokenMeta;
  }
  const local = await loadLocal();
  return local[token] ?? null;
}

export async function deleteMeta(token: string) {
  if (env.upstashUrl && env.upstashToken) {
    await upstash(['DEL', `myreal:${token}`]);
    return;
  }
  const local = await loadLocal();
  delete local[token];
  await saveLocal();
}

export async function listExpired(now = Date.now()) {
  if (env.upstashUrl && env.upstashToken) {
    return [] as TokenMeta[];
  }
  const local = await loadLocal();
  return Object.values(local).filter((meta) =>
    now > new Date(meta.expiresAt).getTime()
  );
}

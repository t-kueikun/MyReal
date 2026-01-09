'use client';

import { getDb } from './db';

const STORE_NAME = 'images';

export async function saveImageBlob(key: string, blob: Blob) {
  const db = await getDb();
  await db.put(STORE_NAME, blob, key);
}

export async function loadImageBlob(key: string): Promise<Blob | null> {
  const db = await getDb();
  const blob = await db.get(STORE_NAME, key);
  return (blob as Blob) ?? null;
}

export async function deleteImageBlob(key: string) {
  const db = await getDb();
  await db.delete(STORE_NAME, key);
}

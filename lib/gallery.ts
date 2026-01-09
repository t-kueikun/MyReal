'use client';

import { getDb } from './db';

const STORE_NAME = 'gallery';

export type GalleryItem = {
  id?: number;
  dataUrl: string;
  createdAt: string;
  token: string;
};

export async function saveCapture(item: GalleryItem) {
  const db = await getDb();
  await db.add(STORE_NAME, item);
}

export async function listCaptures() {
  const db = await getDb();
  return (await db.getAll(STORE_NAME)) as GalleryItem[];
}

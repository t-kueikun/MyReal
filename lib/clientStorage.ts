'use client';

import { getDb } from './db';

const STORE_NAME = 'images';

// IndexedDB Wrapper with localStorage fallback for small images/reliability across tabs

// Helper to convert Blob to Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper to convert Base64 to Blob
async function base64ToBlob(base64: string): Promise<Blob> {
  const res = await fetch(base64);
  return await res.blob();
}

export async function saveImageBlob(key: string, blob: Blob, draftId?: string) {
  const dbKey = draftId ? `${key}_${draftId}` : key;

  // Try forcing localStorage for drafts to ensure immediate cross-tab availability
  // (Limitation: 5MB quota, but usually enough for optimized input images)
  try {
    const base64 = await blobToBase64(blob);
    localStorage.setItem(`img:${dbKey}`, base64);
    return;
  } catch (e) {
    console.warn('LocalStorage save failed (quota?), falling back to IndexedDB', e);
  }

  const db = await getDb();
  await db.put(STORE_NAME, blob, dbKey);
}

export async function loadImageBlob(key: string, draftId?: string): Promise<Blob | null> {
  const dbKey = draftId ? `${key}_${draftId}` : key;

  // Try localStorage first
  const base64 = localStorage.getItem(`img:${dbKey}`);
  if (base64) {
    return base64ToBlob(base64);
  }

  const db = await getDb();
  const blob = await db.get(STORE_NAME, dbKey);
  return (blob as Blob) ?? null;
}

export async function deleteImageBlob(key: string, draftId?: string) {
  const dbKey = draftId ? `${key}_${draftId}` : key;
  localStorage.removeItem(`img:${dbKey}`);

  const db = await getDb();
  await db.delete(STORE_NAME, dbKey);
}

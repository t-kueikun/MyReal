'use client';

import { openDB } from 'idb';

const DB_NAME = 'myreal';
const DB_VERSION = 2;

export async function getDb() {
  return await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }
      if (!db.objectStoreNames.contains('gallery')) {
        db.createObjectStore('gallery', { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

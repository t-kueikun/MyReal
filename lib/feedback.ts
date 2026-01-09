import fs from 'fs/promises';
import path from 'path';

export type FeedbackEntry = {
  score: number;
  comment: string;
  createdAt: string;
  token?: string;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const FEEDBACK_PATH = path.join(DATA_DIR, 'feedback.json');
let cache: FeedbackEntry[] | null = null;
let writing = Promise.resolve();

async function loadLocal() {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(FEEDBACK_PATH, 'utf-8');
    cache = JSON.parse(raw) as FeedbackEntry[];
  } catch {
    cache = [];
  }
  return cache;
}

async function saveLocal() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  writing = writing.then(() =>
    fs.writeFile(FEEDBACK_PATH, JSON.stringify(cache ?? [], null, 2))
  );
  await writing;
}

export async function addFeedback(entry: FeedbackEntry) {
  const list = await loadLocal();
  list.push(entry);
  await saveLocal();
}

export async function listFeedback() {
  return await loadLocal();
}

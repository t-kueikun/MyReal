import fs from 'fs/promises';
import path from 'path';
import { getSupabaseAdmin, isSupabaseEnabled } from './supabase';

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
const FEEDBACK_TABLE = 'myreal_feedback';

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
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from(FEEDBACK_TABLE).insert({
      score: entry.score,
      comment: entry.comment,
      created_at: entry.createdAt,
      token: entry.token ?? null
    });
    if (error) throw new Error(`Supabase feedback failed: ${error.message}`);
    return;
  }
  const list = await loadLocal();
  list.push(entry);
  await saveLocal();
}

export async function listFeedback() {
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(FEEDBACK_TABLE)
      .select('score,comment,created_at,token')
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map((row) => ({
      score: row.score,
      comment: row.comment || '',
      createdAt: row.created_at,
      token: row.token || undefined
    })) as FeedbackEntry[];
  }
  return await loadLocal();
}

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const METRICS_PATH = path.join(DATA_DIR, 'metrics.json');

export type Metrics = {
  generated: number;
  failures: number;
  totalMs: number;
  avgMs: number;
  lastGeneratedAt?: string;
  feedbackCount: number;
  feedbackAvg: number;
};

let metrics: Metrics = {
  generated: 0,
  failures: 0,
  totalMs: 0,
  avgMs: 0,
  feedbackCount: 0,
  feedbackAvg: 0
};

let loaded = false;
let writing = Promise.resolve();

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await fs.readFile(METRICS_PATH, 'utf-8');
    metrics = { ...metrics, ...JSON.parse(raw) };
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function persist() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  writing = writing.then(() =>
    fs.writeFile(METRICS_PATH, JSON.stringify(metrics, null, 2))
  );
  await writing;
}

export async function getMetrics() {
  await ensureLoaded();
  return metrics;
}

export async function recordGeneration(durationMs: number) {
  await ensureLoaded();
  metrics.generated += 1;
  metrics.totalMs += durationMs;
  metrics.avgMs = Math.round(metrics.totalMs / metrics.generated);
  metrics.lastGeneratedAt = new Date().toISOString();
  await persist();
}

export async function recordFailure() {
  await ensureLoaded();
  metrics.failures += 1;
  await persist();
}

export async function recordFeedback(score: number) {
  await ensureLoaded();
  const totalScore = metrics.feedbackAvg * metrics.feedbackCount + score;
  metrics.feedbackCount += 1;
  metrics.feedbackAvg = Number((totalScore / metrics.feedbackCount).toFixed(2));
  await persist();
}

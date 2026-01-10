import fs from 'fs/promises';
import path from 'path';
import { getSupabaseAdmin, isSupabaseEnabled } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const METRICS_PATH = path.join(DATA_DIR, 'metrics.json');
const RUNS_TABLE = 'myreal_runs';
const FEEDBACK_TABLE = 'myreal_feedback';

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
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAdmin();
    const { data: runs, error: runsError } = await supabase
      .from(RUNS_TABLE)
      .select('success,duration_ms,created_at')
      .order('created_at', { ascending: false })
      .limit(10000);
    if (runsError || !runs) {
      return metrics;
    }
    let generated = 0;
    let failures = 0;
    let totalMs = 0;
    let lastGeneratedAt: string | undefined;
    for (const run of runs) {
      if (run.success) {
        generated += 1;
        totalMs += Number(run.duration_ms || 0);
        if (!lastGeneratedAt) {
          lastGeneratedAt = run.created_at;
        }
      } else {
        failures += 1;
      }
    }
    const avgMs = generated ? Math.round(totalMs / generated) : 0;
    const { data: feedback } = await supabase
      .from(FEEDBACK_TABLE)
      .select('score')
      .limit(10000);
    const feedbackCount = feedback?.length ?? 0;
    const feedbackAvg = feedbackCount
      ? Number(
          (
            feedback!.reduce((sum, row) => sum + Number(row.score || 0), 0) /
            feedbackCount
          ).toFixed(2)
        )
      : 0;
    return {
      generated,
      failures,
      totalMs,
      avgMs,
      lastGeneratedAt,
      feedbackCount,
      feedbackAvg
    } satisfies Metrics;
  }
  await ensureLoaded();
  return metrics;
}

export async function recordGeneration(durationMs: number) {
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAdmin();
    await supabase.from(RUNS_TABLE).insert({
      success: true,
      duration_ms: durationMs,
      created_at: new Date().toISOString()
    });
    return;
  }
  await ensureLoaded();
  metrics.generated += 1;
  metrics.totalMs += durationMs;
  metrics.avgMs = Math.round(metrics.totalMs / metrics.generated);
  metrics.lastGeneratedAt = new Date().toISOString();
  await persist();
}

export async function recordFailure() {
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAdmin();
    await supabase.from(RUNS_TABLE).insert({
      success: false,
      created_at: new Date().toISOString()
    });
    return;
  }
  await ensureLoaded();
  metrics.failures += 1;
  await persist();
}

export async function recordFeedback(score: number) {
  if (isSupabaseEnabled()) {
    return;
  }
  await ensureLoaded();
  const totalScore = metrics.feedbackAvg * metrics.feedbackCount + score;
  metrics.feedbackCount += 1;
  metrics.feedbackAvg = Number((totalScore / metrics.feedbackCount).toFixed(2));
  await persist();
}

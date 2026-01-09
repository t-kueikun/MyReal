import { env } from './config';

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;

type Level = (typeof LEVELS)[number];

const levelIndex = LEVELS.indexOf(env.logLevel as Level);

function shouldLog(level: Level) {
  const idx = LEVELS.indexOf(level);
  return idx >= (levelIndex === -1 ? 1 : levelIndex);
}

export function log(level: Level, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...meta
  };
  console.log(JSON.stringify(payload));
}

export const logInfo = (message: string, meta?: Record<string, unknown>) =>
  log('info', message, meta);
export const logWarn = (message: string, meta?: Record<string, unknown>) =>
  log('warn', message, meta);
export const logError = (message: string, meta?: Record<string, unknown>) =>
  log('error', message, meta);
export const logDebug = (message: string, meta?: Record<string, unknown>) =>
  log('debug', message, meta);

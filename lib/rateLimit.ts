import crypto from 'crypto';
import { env } from './config';

type RateRecord = { count: number; windowStart: number };
const records = new Map<string, RateRecord>();

export function hashIp(ip: string) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

export function checkRateLimit(ipHash: string) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = Math.max(1, env.rateLimitPerMin);
  const record = records.get(ipHash);
  if (!record || now - record.windowStart > windowMs) {
    records.set(ipHash, { count: 1, windowStart: now });
    return { allowed: true, retryAfter: 0 };
  }
  if (record.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((windowMs - (now - record.windowStart)) / 1000)
    };
  }
  record.count += 1;
  records.set(ipHash, record);
  return { allowed: true, retryAfter: 0 };
}

export function getRateLimitConfig() {
  return { limitPerMin: env.rateLimitPerMin };
}

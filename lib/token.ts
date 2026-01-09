import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { env } from './config';
import { logWarn } from './logger';

let cachedSecret = '';

function getSecret() {
  if (cachedSecret) return cachedSecret;
  if (env.tokenSecret) {
    cachedSecret = env.tokenSecret;
    return cachedSecret;
  }
  cachedSecret = crypto.randomBytes(32).toString('hex');
  logWarn('TOKEN_SECRET is not set; using ephemeral secret');
  return cachedSecret;
}

function sign(data: string) {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createToken(ttlHours: number) {
  const id = nanoid(20);
  const exp = Date.now() + ttlHours * 60 * 60 * 1000;
  const payload = `${id}.${exp}`;
  const sig = sign(payload);
  return { token: `${payload}.${sig}`, exp };
}

export function verifyToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false };
  const [id, expStr, sig] = parts;
  const payload = `${id}.${expStr}`;
  const expected = sign(payload);
  if (sig.length !== expected.length) {
    return { valid: false };
  }
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return { valid: false };
  }
  const exp = Number(expStr);
  if (Number.isNaN(exp)) return { valid: false };
  if (Date.now() > exp) return { valid: false, expired: true, exp };
  return { valid: true, exp };
}

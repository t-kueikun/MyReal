import { NextRequest } from 'next/server';
import { env } from './config';

export function isAdminConfigured() {
  return Boolean(env.adminUser && env.adminPass);
}

export function checkBasicAuth(request: NextRequest) {
  if (!isAdminConfigured()) return true;
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.replace('Basic ', ''), 'base64').toString();
  const [user, pass] = decoded.split(':');
  return user === env.adminUser && pass === env.adminPass;
}

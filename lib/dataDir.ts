import path from 'path';

function resolveDataDir() {
  const explicitDir = process.env.AREAL_DATA_DIR?.trim();
  if (explicitDir) return explicitDir;

  // Vercel Serverless can write only under /tmp.
  if (process.env.VERCEL === '1') {
    return '/tmp/areal-data';
  }

  return path.join(process.cwd(), 'data');
}

export const DATA_DIR = resolveDataDir();

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './config';

let client: SupabaseClient | null = null;

export function isSupabaseEnabled() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function getSupabaseAdmin() {
  if (!isSupabaseEnabled()) {
    throw new Error('Supabase is not configured');
  }
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          'X-Client-Info': 'myreal-server'
        }
      }
    });
  }
  return client;
}

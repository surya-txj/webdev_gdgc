import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
dotenv.config({ path: path.resolve(path.dirname(__filename), '../../.env') });

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.warn('Supabase environment is not configured. Public demo routes still load, but data routes need .env.');
}

export const supabaseAdmin = createClient(url || 'https://example.supabase.co', serviceKey || 'placeholder', {
  auth: { autoRefreshToken: false, persistSession: false }
});

export const supabaseAnon = createClient(url || 'https://example.supabase.co', anonKey || 'placeholder');

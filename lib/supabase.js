import { createClient } from '@supabase/supabase-js';

// Server-side only. The service-role key bypasses RLS, so this client
// must never be imported into client components. All data access goes
// through API route handlers.

let _client = null;

export function db() {
  if (!_client) {
    _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

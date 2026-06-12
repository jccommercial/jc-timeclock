import { createClient } from '@supabase/supabase-js';

// Server-side only. The service-role key bypasses RLS, so this client
// must never be imported into client components. All data access goes
// through API route handlers.

let _client = null;

export function db() {
  if (!_client) {
    _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      global: {
        // Never let Next.js cache database responses — the dashboard
        // must always reflect the live database (deletes, edits, punches).
        fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
      },
    });
  }
  return _client;
}

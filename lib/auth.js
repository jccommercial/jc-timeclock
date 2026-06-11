// Admin session token = HMAC-SHA256(ADMIN_PASSWORD, AUTH_SECRET).
// Works in both Node and Edge runtimes (Web Crypto only).

export const ADMIN_COOKIE = 'jc_admin';

export async function adminToken() {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(process.env.AUTH_SECRET || 'dev-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(process.env.ADMIN_PASSWORD || ''));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

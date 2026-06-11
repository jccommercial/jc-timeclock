import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// Public endpoint hit after a QR scan. Returns the site name and the
// list of active contractor names (no PINs, no other data).
export async function GET(req, { params }) {
  const { token } = params;

  const { data: site, error } = await db()
    .from('sites')
    .select('id, name')
    .eq('qr_token', token)
    .eq('active', true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 });
  if (!site) return NextResponse.json({ error: 'Invalid or inactive QR code' }, { status: 404 });

  const { data: contractors } = await db()
    .from('contractors')
    .select('id, name')
    .eq('active', true)
    .order('name');

  return NextResponse.json({ site: { name: site.name }, contractors: contractors || [] });
}

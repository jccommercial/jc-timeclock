import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Public endpoint hit after a QR scan. Returns the site name only —
// cleaners identify themselves with their own phone number + PIN,
// so no contractor list is ever exposed publicly.
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

  return NextResponse.json({ site: { name: site.name } });
}

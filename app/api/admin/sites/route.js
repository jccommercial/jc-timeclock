import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await db()
    .from('sites')
    .select('id, name, address, qr_token, expected_hours_per_week, lat, lng, active, created_at')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sites: data || [] });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.name?.trim()) return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
  const { data, error } = await db()
    .from('sites')
    .insert({
      name: body.name.trim(),
      address: body.address?.trim() || null,
      expected_hours_per_week: body.expected_hours_per_week === '' || body.expected_hours_per_week == null
        ? null : Number(body.expected_hours_per_week),
      lat: body.lat === '' || body.lat == null ? null : Number(body.lat),
      lng: body.lng === '' || body.lng == null ? null : Number(body.lng),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ site: data });
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await db()
    .from('contractors')
    .select('id, name, pin, phone, active, created_at')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contractors: data || [] });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!/^\d{4}$/.test(String(body.pin || ''))) {
    return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
  }
  const { data, error } = await db()
    .from('contractors')
    .insert({
      name: body.name.trim(),
      pin: String(body.pin),
      phone: body.phone?.trim() || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contractor: data });
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { normalizePhone } from '@/lib/util';

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
  const normPhone = normalizePhone(body.phone);
  if (!normPhone) {
    return NextResponse.json({ error: 'A valid mobile number is required — it’s how cleaners sign in.' }, { status: 400 });
  }

  // No two contractors can share a mobile number
  const { data: existing } = await db().from('contractors').select('id, name, phone');
  const dup = (existing || []).find((c) => normalizePhone(c.phone) === normPhone);
  if (dup) {
    return NextResponse.json({ error: `That mobile number is already used by ${dup.name}.` }, { status: 409 });
  }

  const { data, error } = await db()
    .from('contractors')
    .insert({
      name: body.name.trim(),
      pin: String(body.pin),
      phone: body.phone.trim(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contractor: data });
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function PATCH(req, { params }) {
  const body = await req.json().catch(() => ({}));
  const allowed = {};
  if ('name' in body) allowed.name = body.name?.trim();
  if ('phone' in body) allowed.phone = body.phone?.trim() || null;
  if ('active' in body) allowed.active = !!body.active;
  if ('pin' in body) {
    if (!/^\d{4}$/.test(String(body.pin))) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }
    allowed.pin = String(body.pin);
  }
  const { error } = await db().from('contractors').update(allowed).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const { error } = await db().from('contractors').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json(
      { error: 'This contractor has shift history, so they can\'t be deleted. Deactivate them instead — they disappear from the clock-in list and history is kept.' },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}

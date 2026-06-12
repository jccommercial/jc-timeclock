import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { normalizePhone } from '@/lib/util';

export async function PATCH(req, { params }) {
  const body = await req.json().catch(() => ({}));
  const allowed = {};
  if ('name' in body) allowed.name = body.name?.trim();
  if ('active' in body) allowed.active = !!body.active;
  if ('pin' in body) {
    if (!/^\d{4}$/.test(String(body.pin))) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }
    allowed.pin = String(body.pin);
  }
  if ('phone' in body) {
    const normPhone = normalizePhone(body.phone);
    if (!normPhone) {
      return NextResponse.json({ error: 'That doesn’t look like a valid mobile number.' }, { status: 400 });
    }
    const { data: existing } = await db().from('contractors').select('id, name, phone');
    const dup = (existing || []).find((c) => c.id !== params.id && normalizePhone(c.phone) === normPhone);
    if (dup) {
      return NextResponse.json({ error: `That mobile number is already used by ${dup.name}.` }, { status: 409 });
    }
    allowed.phone = body.phone.trim();
  }

  const { error } = await db().from('contractors').update(allowed).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const { error } = await db().from('contractors').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json(
      { error: 'This contractor has shift history, so they can\'t be deleted. Deactivate them instead — they can no longer clock in and history is kept.' },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}

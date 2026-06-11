import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function PATCH(req, { params }) {
  const body = await req.json().catch(() => ({}));
  const allowed = {};
  if ('name' in body) allowed.name = body.name?.trim();
  if ('address' in body) allowed.address = body.address?.trim() || null;
  if ('expected_hours_per_week' in body) {
    allowed.expected_hours_per_week =
      body.expected_hours_per_week === '' || body.expected_hours_per_week == null
        ? null : Number(body.expected_hours_per_week);
  }
  if ('lat' in body) allowed.lat = body.lat === '' || body.lat == null ? null : Number(body.lat);
  if ('lng' in body) allowed.lng = body.lng === '' || body.lng == null ? null : Number(body.lng);
  if ('active' in body) allowed.active = !!body.active;

  const { error } = await db().from('sites').update(allowed).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const { error } = await db().from('sites').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json(
      { error: 'This site has shift history, so it can\'t be deleted. Deactivate it instead — its QR code stops working and history is kept.' },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}

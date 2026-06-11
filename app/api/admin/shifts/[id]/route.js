import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// Admin edits: close a forgotten shift, adjust times, clear/set flags.
export async function PATCH(req, { params }) {
  const body = await req.json().catch(() => ({}));
  const allowed = {};
  if ('clock_in' in body) allowed.clock_in = body.clock_in;
  if ('clock_out' in body) allowed.clock_out = body.clock_out;
  if ('flagged' in body) allowed.flagged = !!body.flagged;
  if ('flag_reason' in body) allowed.flag_reason = body.flag_reason;
  if ('has_issue' in body) allowed.has_issue = !!body.has_issue;
  if ('note' in body) allowed.note = body.note;
  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }
  allowed.edited_by_admin = true;

  const { error } = await db().from('shifts').update(allowed).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const { error } = await db().from('shifts').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { haversineMetres, normalizePhone } from '@/lib/util';

export const dynamic = 'force-dynamic';

const GPS_FLAG_DISTANCE_M = 500; // flag punches further than this from the site
const LONG_SHIFT_HOURS = 14;     // flag shifts longer than this at clock-out

// Single endpoint for the cleaner flow.
// action: 'status' | 'in' | 'out'
// Every action requires a valid site qr_token + the cleaner's own
// mobile number + PIN.
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { token, phone, pin, action, lat, lng, accuracy, note, has_issue } = body;
  if (!token || !phone || !pin || !action) {
    return NextResponse.json({ error: 'Missing details' }, { status: 400 });
  }

  const normPhone = normalizePhone(phone);
  if (!normPhone) {
    return NextResponse.json({ error: 'That doesn’t look like a valid mobile number.' }, { status: 400 });
  }

  // Validate site
  const { data: site } = await db()
    .from('sites')
    .select('id, name, lat, lng')
    .eq('qr_token', token)
    .eq('active', true)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Invalid or inactive QR code' }, { status: 404 });

  // Find the contractor by mobile number (matched on normalised digits,
  // so 04xx, +61 4xx and spaced formats all work), then check the PIN.
  const { data: allActive } = await db()
    .from('contractors')
    .select('id, name, pin, phone')
    .eq('active', true);

  const contractor = (allActive || []).find((c) => normalizePhone(c.phone) === normPhone);
  if (!contractor) {
    return NextResponse.json(
      { error: 'Mobile number not recognised. Check the number, or contact Jordan to get set up.' },
      { status: 401 }
    );
  }
  if (String(contractor.pin) !== String(pin)) {
    return NextResponse.json({ error: 'Wrong PIN. Check with Jordan if you’ve forgotten it.' }, { status: 401 });
  }

  // Find any open shift for this contractor (any site)
  const { data: openShift } = await db()
    .from('shifts')
    .select('id, site_id, clock_in, sites(name)')
    .eq('contractor_id', contractor.id)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (action === 'status') {
    return NextResponse.json({
      contractor: { name: contractor.name },
      open_shift: openShift
        ? {
            id: openShift.id,
            site_id: openShift.site_id,
            site_name: openShift.sites?.name || '',
            clock_in: openShift.clock_in,
            same_site: openShift.site_id === site.id,
          }
        : null,
    });
  }

  // Distance from site, if we have both site coords and a phone fix
  let distance = null;
  if (site.lat != null && site.lng != null && lat != null && lng != null) {
    distance = haversineMetres(lat, lng, site.lat, site.lng);
  }

  if (action === 'in') {
    if (openShift) {
      return NextResponse.json(
        { error: `You're already clocked in at ${openShift.sites?.name || 'another site'}. Clock out first.` },
        { status: 409 }
      );
    }
    const flagged = distance != null && distance > GPS_FLAG_DISTANCE_M;
    const { data: shift, error } = await db()
      .from('shifts')
      .insert({
        contractor_id: contractor.id,
        site_id: site.id,
        in_lat: lat ?? null,
        in_lng: lng ?? null,
        in_accuracy: accuracy ?? null,
        in_distance_m: distance,
        flagged,
        flag_reason: flagged ? `Clock-in GPS was ${Math.round(distance)}m from site` : null,
      })
      .select('id, clock_in')
      .single();
    if (error) return NextResponse.json({ error: 'Could not clock in. Try again.' }, { status: 500 });
    return NextResponse.json({ ok: true, action: 'in', clock_in: shift.clock_in, site_name: site.name });
  }

  if (action === 'out') {
    if (!openShift) {
      return NextResponse.json({ error: 'No open shift found. You may already be clocked out.' }, { status: 409 });
    }

    const hours = (Date.now() - new Date(openShift.clock_in).getTime()) / 3600000;
    const reasons = [];
    if (distance != null && distance > GPS_FLAG_DISTANCE_M) {
      reasons.push(`Clock-out GPS was ${Math.round(distance)}m from site`);
    }
    if (hours > LONG_SHIFT_HOURS) {
      reasons.push(`Shift length ${hours.toFixed(1)}h — possible forgotten clock-out`);
    }
    if (openShift.site_id !== site.id) {
      reasons.push(`Clocked out via a different site's QR (${site.name})`);
    }

    const update = {
      clock_out: new Date().toISOString(),
      out_lat: lat ?? null,
      out_lng: lng ?? null,
      out_accuracy: accuracy ?? null,
      out_distance_m: distance,
      note: note ? String(note).slice(0, 2000) : null,
      has_issue: !!has_issue,
    };
    if (reasons.length) {
      update.flagged = true;
      update.flag_reason = reasons.join('; ');
    }

    const { error } = await db().from('shifts').update(update).eq('id', openShift.id);
    if (error) return NextResponse.json({ error: 'Could not clock out. Try again.' }, { status: 500 });

    return NextResponse.json({
      ok: true,
      action: 'out',
      clock_in: openShift.clock_in,
      clock_out: update.clock_out,
      site_name: openShift.sites?.name || site.name,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

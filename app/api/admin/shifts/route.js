import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// List shifts in a date range, optionally filtered by site/contractor.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const siteId = searchParams.get('site_id');
  const contractorId = searchParams.get('contractor_id');

  let q = db()
    .from('shifts')
    .select('id, clock_in, clock_out, note, has_issue, flagged, flag_reason, in_distance_m, out_distance_m, edited_by_admin, contractor_id, site_id, contractors(name), sites(name, expected_hours_per_week)')
    .order('clock_in', { ascending: false })
    .limit(2000);

  if (from) q = q.gte('clock_in', from);
  if (to) q = q.lt('clock_in', to);
  if (siteId) q = q.eq('site_id', siteId);
  if (contractorId) q = q.eq('contractor_id', contractorId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shifts: data || [] });
}

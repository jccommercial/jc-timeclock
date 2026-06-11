import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Live dashboard data: who's clocked in now, today's completed shifts,
// and recent flags/issues.
export async function GET() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sel = 'id, clock_in, clock_out, note, has_issue, flagged, flag_reason, in_distance_m, contractors(name), sites(name)';

  const [open, today, flags] = await Promise.all([
    db().from('shifts').select(sel).is('clock_out', null).order('clock_in', { ascending: true }),
    db().from('shifts').select(sel).not('clock_out', 'is', null)
      .gte('clock_in', startOfToday.toISOString()).order('clock_in', { ascending: false }),
    db().from('shifts').select(sel).or('flagged.eq.true,has_issue.eq.true')
      .order('clock_in', { ascending: false }).limit(15),
  ]);

  return NextResponse.json({
    open: open.data || [],
    today: today.data || [],
    flags: flags.data || [],
  });
}

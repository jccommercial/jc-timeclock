'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { fmtDate, fmtTime, fmtHours, hoursBetween } from '@/lib/util';

// Logs & reports: weekly/monthly views, expected vs actual by site,
// totals by contractor, flag log, CSV export, fix forgotten clock-outs.

function startOfWeek(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function rangeForPeriod(period) {
  const now = new Date();
  if (period === 'this_week') {
    const from = startOfWeek(now);
    const to = new Date(from); to.setDate(to.getDate() + 7);
    return [from, to];
  }
  if (period === 'last_week') {
    const to = startOfWeek(now);
    const from = new Date(to); from.setDate(from.getDate() - 7);
    return [from, to];
  }
  if (period === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return [from, to];
  }
  if (period === 'last_month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 1);
    return [from, to];
  }
  return [startOfWeek(now), new Date(now.getFullYear(), now.getMonth() + 1, 1)];
}

export default function LogsPage() {
  const [period, setPeriod] = useState('this_week');
  const [siteId, setSiteId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [sites, setSites] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/admin/sites').then((r) => r.json()).then((j) => setSites(j.sites || []));
    fetch('/api/admin/contractors').then((r) => r.json()).then((j) => setContractors(j.contractors || []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    const [from, to] = rangeForPeriod(period);
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    if (siteId) qs.set('site_id', siteId);
    if (contractorId) qs.set('contractor_id', contractorId);
    try {
      const res = await fetch(`/api/admin/shifts?${qs}`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setShifts(j.shifts);
    } catch (e) {
      setErr(e.message || 'Could not load shifts.');
    } finally {
      setLoading(false);
    }
  }, [period, siteId, contractorId]);

  useEffect(() => { load(); }, [load]);

  const weeksInPeriod = useMemo(() => {
    const [from, to] = rangeForPeriod(period);
    return (to - from) / (7 * 24 * 3600000);
  }, [period]);

  // Summaries
  const bySite = useMemo(() => {
    const m = new Map();
    for (const s of shifts) {
      const key = s.site_id;
      if (!m.has(key)) {
        m.set(key, {
          name: s.sites?.name || '—',
          expectedPerWeek: s.sites?.expected_hours_per_week,
          hours: 0, count: 0,
        });
      }
      const row = m.get(key);
      row.hours += hoursBetween(s.clock_in, s.clock_out);
      row.count += 1;
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [shifts]);

  const byContractor = useMemo(() => {
    const m = new Map();
    for (const s of shifts) {
      const key = s.contractor_id;
      if (!m.has(key)) m.set(key, { name: s.contractors?.name || '—', hours: 0, count: 0 });
      const row = m.get(key);
      row.hours += hoursBetween(s.clock_in, s.clock_out);
      row.count += 1;
    }
    return [...m.values()].sort((a, b) => b.hours - a.hours);
  }, [shifts]);

  const issues = useMemo(() => shifts.filter((s) => s.has_issue || s.flagged), [shifts]);

  function exportCsv() {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Date', 'Contractor', 'Site', 'Clock In', 'Clock Out', 'Hours', 'Note', 'Issue', 'Flagged', 'Flag Reason', 'GPS distance in (m)', 'Edited by admin'];
    const rows = shifts.map((s) => [
      fmtDate(s.clock_in), s.contractors?.name, s.sites?.name,
      fmtTime(s.clock_in), s.clock_out ? fmtTime(s.clock_out) : 'OPEN',
      s.clock_out ? hoursBetween(s.clock_in, s.clock_out).toFixed(2) : '',
      s.note, s.has_issue ? 'Yes' : '', s.flagged ? 'Yes' : '', s.flag_reason,
      s.in_distance_m != null ? Math.round(s.in_distance_m) : '',
      s.edited_by_admin ? 'Yes' : '',
    ]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `jc-timesheets-${period}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function closeShift(shift) {
    const suggestion = new Date(new Date(shift.clock_in).getTime() + 4 * 3600000);
    const input = prompt(
      `Set clock-out time for ${shift.contractors?.name} at ${shift.sites?.name}.\nFormat: YYYY-MM-DD HH:MM (24h, Adelaide time)`,
      suggestion.toISOString().slice(0, 16).replace('T', ' ')
    );
    if (!input) return;
    const dt = new Date(input.replace(' ', 'T'));
    if (isNaN(dt)) { alert('Could not read that date/time.'); return; }
    const res = await fetch(`/api/admin/shifts/${shift.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clock_out: dt.toISOString(), flagged: true, flag_reason: 'Clock-out set manually by admin' }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Update failed (${res.status}): ${j.error || 'unknown error'}`);
    }
    load();
  }

  async function deleteShift(id) {
    if (!confirm('Delete this shift record? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/shifts/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Delete failed (${res.status}): ${j.error || 'unknown error'}`);
    }
    load();
  }

  async function clearFlag(id) {
    const res = await fetch(`/api/admin/shifts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagged: false, flag_reason: null }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Update failed (${res.status}): ${j.error || 'unknown error'}`);
    }
    load();
  }

  return (
    <>
      <div className="page-title">Logs & Reports</div>
      <div className="page-sub">Hours by site and contractor, expected vs actual, and the full shift log.</div>

      <div className="filters">
        <div className="field">
          <label>Period</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="this_week">This week</option>
            <option value="last_week">Last week</option>
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
          </select>
        </div>
        <div className="field">
          <label>Site</label>
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">All sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Contractor</label>
          <select value={contractorId} onChange={(e) => setContractorId(e.target.value)}>
            <option value="">All contractors</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={exportCsv} disabled={!shifts.length}>
          Export CSV ({shifts.length})
        </button>
      </div>

      {err && <p className="error-text">{err}</p>}
      {loading && <p>Loading…</p>}

      {!loading && (
        <>
          <div className="card">
            <h3>Hours by site — expected vs actual</h3>
            <div className="table-scroll">
              <table className="data">
                <thead><tr><th>Site</th><th>Shifts</th><th>Actual hours</th><th>Expected ({weeksInPeriod.toFixed(1)} wk)</th><th>Variance</th></tr></thead>
                <tbody>
                  {bySite.map((r) => {
                    const expected = r.expectedPerWeek != null ? r.expectedPerWeek * weeksInPeriod : null;
                    const variance = expected != null ? r.hours - expected : null;
                    return (
                      <tr key={r.name}>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.count}</td>
                        <td>{fmtHours(r.hours)}</td>
                        <td>{expected != null ? fmtHours(expected) : '—'}</td>
                        <td>
                          {variance == null ? '—' : (
                            <span className={variance < -0.25 ? 'variance-neg' : 'variance-pos'}>
                              {variance >= 0 ? '+' : '−'}{fmtHours(Math.abs(variance))}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {bySite.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--grey-text)' }}>No shifts in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3>Hours by contractor</h3>
            <div className="table-scroll">
              <table className="data">
                <thead><tr><th>Contractor</th><th>Shifts</th><th>Hours</th></tr></thead>
                <tbody>
                  {byContractor.map((r) => (
                    <tr key={r.name}><td>{r.name}</td><td>{r.count}</td><td>{fmtHours(r.hours)}</td></tr>
                  ))}
                  {byContractor.length === 0 && <tr><td colSpan={3} style={{ color: 'var(--grey-text)' }}>No shifts in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {issues.length > 0 && (
            <div className="card">
              <h3>Flags & issues in this period ({issues.length})</h3>
              <div className="table-scroll">
                <table className="data">
                  <thead><tr><th>Date</th><th>Contractor</th><th>Site</th><th>Detail</th><th></th></tr></thead>
                  <tbody>
                    {issues.map((s) => (
                      <tr key={s.id}>
                        <td>{fmtDate(s.clock_in)}</td>
                        <td>{s.contractors?.name}</td>
                        <td>{s.sites?.name}</td>
                        <td>
                          {s.has_issue && <span className="badge badge-red">Issue</span>}{' '}
                          {s.flagged && <span className="badge badge-amber">Flag</span>}{' '}
                          {[s.note, s.flag_reason].filter(Boolean).join(' — ')}
                        </td>
                        <td>{s.flagged && <button className="btn-link" onClick={() => clearFlag(s.id)}>Clear flag</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card">
            <h3>All shifts ({shifts.length})</h3>
            <div className="table-scroll">
              <table className="data">
                <thead><tr><th>Date</th><th>Contractor</th><th>Site</th><th>In</th><th>Out</th><th>Hours</th><th>Note</th><th></th></tr></thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id}>
                      <td>{fmtDate(s.clock_in)}</td>
                      <td>{s.contractors?.name}</td>
                      <td>{s.sites?.name}</td>
                      <td>{fmtTime(s.clock_in)}</td>
                      <td>
                        {s.clock_out ? fmtTime(s.clock_out) : (
                          <button className="btn-link" onClick={() => closeShift(s)}>Open — set clock-out</button>
                        )}
                      </td>
                      <td>{s.clock_out ? fmtHours(hoursBetween(s.clock_in, s.clock_out)) : '—'}</td>
                      <td style={{ maxWidth: 260 }}>
                        {s.has_issue && <span className="badge badge-red">Issue</span>}{' '}
                        {s.edited_by_admin && <span className="badge badge-grey">Edited</span>}{' '}
                        {s.note || ''}
                      </td>
                      <td><button className="btn-danger-text" onClick={() => deleteShift(s.id)}>Delete</button></td>
                    </tr>
                  ))}
                  {shifts.length === 0 && <tr><td colSpan={8} style={{ color: 'var(--grey-text)' }}>No shifts in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

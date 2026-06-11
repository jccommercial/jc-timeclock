'use client';

import { useEffect, useState } from 'react';
import { fmtTime, fmtDateTime, fmtHours, hoursBetween } from '@/lib/util';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/admin/live', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setErr('Could not load dashboard.');
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // refresh every minute
    return () => clearInterval(t);
  }, []);

  if (err) return <p className="error-text">{err}</p>;
  if (!data) return <p>Loading…</p>;

  const totalTodayHours = data.today.reduce((s, r) => s + hoursBetween(r.clock_in, r.clock_out), 0)
    + data.open.reduce((s, r) => s + hoursBetween(r.clock_in), 0);

  return (
    <>
      <div className="page-title">Dashboard</div>
      <div className="page-sub">Live view — refreshes every minute. Times shown in Adelaide time.</div>

      <div className="stat-row">
        <div className="stat"><div className="num">{data.open.length}</div><div className="lbl">On the clock now</div></div>
        <div className="stat"><div className="num">{data.today.length}</div><div className="lbl">Shifts completed today</div></div>
        <div className="stat"><div className="num">{fmtHours(totalTodayHours)}</div><div className="lbl">Hours worked today</div></div>
      </div>

      <div className="card">
        <h3>Currently clocked in</h3>
        {data.open.length === 0 ? (
          <p style={{ color: 'var(--grey-text)' }}>No one is on the clock right now.</p>
        ) : (
          <div className="table-scroll">
            <table className="data">
              <thead><tr><th>Cleaner</th><th>Site</th><th>Clocked in</th><th>Duration</th><th>GPS</th></tr></thead>
              <tbody>
                {data.open.map((r) => {
                  const hrs = hoursBetween(r.clock_in);
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.contractors?.name}</strong></td>
                      <td>{r.sites?.name}</td>
                      <td>{fmtTime(r.clock_in)}</td>
                      <td>
                        {fmtHours(hrs)}{' '}
                        {hrs > 14 && <span className="badge badge-amber">Check — forgot to clock out?</span>}
                      </td>
                      <td>{gpsBadge(r.in_distance_m, r.flagged)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Completed today</h3>
        {data.today.length === 0 ? (
          <p style={{ color: 'var(--grey-text)' }}>No completed shifts yet today.</p>
        ) : (
          <div className="table-scroll">
            <table className="data">
              <thead><tr><th>Cleaner</th><th>Site</th><th>In</th><th>Out</th><th>Hours</th><th>Note</th></tr></thead>
              <tbody>
                {data.today.map((r) => (
                  <tr key={r.id}>
                    <td>{r.contractors?.name}</td>
                    <td>{r.sites?.name}</td>
                    <td>{fmtTime(r.clock_in)}</td>
                    <td>{fmtTime(r.clock_out)}</td>
                    <td>{fmtHours(hoursBetween(r.clock_in, r.clock_out))}</td>
                    <td>
                      {r.has_issue && <span className="badge badge-red">Issue</span>}{' '}
                      {r.note || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Recent flags & issues</h3>
        {data.flags.length === 0 ? (
          <p style={{ color: 'var(--grey-text)' }}>Nothing flagged. All clear.</p>
        ) : (
          <div className="table-scroll">
            <table className="data">
              <thead><tr><th>When</th><th>Cleaner</th><th>Site</th><th>What</th></tr></thead>
              <tbody>
                {data.flags.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDateTime(r.clock_in)}</td>
                    <td>{r.contractors?.name}</td>
                    <td>{r.sites?.name}</td>
                    <td>
                      {r.has_issue && <span className="badge badge-red">Issue</span>}{' '}
                      {r.flagged && <span className="badge badge-amber">Flag</span>}{' '}
                      {[r.note, r.flag_reason].filter(Boolean).join(' — ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function gpsBadge(distance, flagged) {
  if (distance == null) return <span className="badge badge-grey">No GPS</span>;
  if (flagged || distance > 500) return <span className="badge badge-red">{Math.round(distance)}m away</span>;
  return <span className="badge badge-green">On site</span>;
}

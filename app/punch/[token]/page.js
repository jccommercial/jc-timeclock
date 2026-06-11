'use client';

import { useEffect, useState, useCallback } from 'react';
import { fmtTime, fmtHours, hoursBetween } from '@/lib/util';

// Cleaner-facing screen, opened by scanning the site QR code.
// Flow: pick name -> enter PIN -> Clock In, or (note + issue?) -> Clock Out.

export default function PunchPage({ params }) {
  const token = params.token;

  const [phase, setPhase] = useState('loading'); // loading | invalid | identify | punch | done
  const [site, setSite] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [contractorId, setContractorId] = useState('');
  const [pin, setPin] = useState('');
  const [openShift, setOpenShift] = useState(null);
  const [note, setNote] = useState('');
  const [hasIssue, setHasIssue] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`/api/site/${token}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) { setPhase('invalid'); setError(j.error || 'Invalid QR code'); return; }
        setSite(j.site);
        setContractors(j.contractors);
        const last = typeof window !== 'undefined' ? localStorage.getItem('jc_last_contractor') : null;
        if (last && j.contractors.some((c) => c.id === last)) setContractorId(last);
        setPhase('identify');
      })
      .catch(() => { setPhase('invalid'); setError('Could not load. Check your signal and rescan the code.'); });
  }, [token]);

  const getLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve({});
      const timer = setTimeout(() => resolve({}), 6000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => { clearTimeout(timer); resolve({}); },
        { enableHighAccuracy: true, timeout: 5500, maximumAge: 60000 }
      );
    });
  }, []);

  async function callPunch(action, extra = {}) {
    const res = await fetch('/api/punch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, contractor_id: contractorId, pin, action, ...extra }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || 'Something went wrong');
    return j;
  }

  async function handleContinue(e) {
    e.preventDefault();
    setError('');
    if (!contractorId) { setError('Select your name first.'); return; }
    if (!/^\d{4}$/.test(pin)) { setError('Enter your 4-digit PIN.'); return; }
    setBusy(true);
    try {
      const j = await callPunch('status');
      localStorage.setItem('jc_last_contractor', contractorId);
      setOpenShift(j.open_shift);
      setPhase('punch');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePunch(action) {
    setError('');
    setBusy(true);
    try {
      const loc = await getLocation();
      const j = await callPunch(action, { ...loc, note, has_issue: hasIssue });
      setResult(j);
      setPhase('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const selectedName = contractors.find((c) => c.id === contractorId)?.name || '';

  return (
    <div className="punch-wrap">
      <div className="punch-brand">JC Commercial</div>
      <div className="punch-site">{site ? site.name : 'Time Clock'}</div>

      <div className="punch-card">
        {phase === 'loading' && <p style={{ textAlign: 'center', padding: '20px 0' }}>Loading…</p>}

        {phase === 'invalid' && (
          <div className="punch-error">{error}</div>
        )}

        {phase === 'identify' && (
          <form onSubmit={handleContinue}>
            <label htmlFor="who">Your name</label>
            <select id="who" value={contractorId} onChange={(e) => setContractorId(e.target.value)}>
              <option value="">Select your name…</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <label htmlFor="pin">Your PIN</label>
            <input
              id="pin"
              className="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />

            {error && <div className="punch-error">{error}</div>}
            <button type="submit" className="btn-big btn-neutral" disabled={busy}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}

        {phase === 'punch' && !openShift && (
          <div>
            <p style={{ textAlign: 'center', fontSize: 17 }}>
              G&apos;day <strong>{selectedName}</strong>
            </p>
            {error && <div className="punch-error">{error}</div>}
            <button className="btn-big btn-in" disabled={busy} onClick={() => handlePunch('in')}>
              {busy ? 'Clocking in…' : 'Clock In'}
            </button>
            <p className="muted-small">Your location is recorded with each clock-in.</p>
          </div>
        )}

        {phase === 'punch' && openShift && (
          <div>
            <p style={{ textAlign: 'center', fontSize: 16 }}>
              <strong>{selectedName}</strong> — on the clock at{' '}
              <strong>{openShift.site_name}</strong> since {fmtTime(openShift.clock_in)}{' '}
              ({fmtHours(hoursBetween(openShift.clock_in))})
            </p>

            {!openShift.same_site && (
              <div className="open-shift-note">
                Heads up: you scanned the QR for <strong>{site?.name}</strong>, but your open shift
                is at <strong>{openShift.site_name}</strong>. Clocking out will close that shift.
              </div>
            )}

            <label htmlFor="note">Anything to report? (optional)</label>
            <textarea
              id="note"
              placeholder="e.g. bin room light not working, ran out of bags…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <label className="issue-row" htmlFor="issue">
              <input
                id="issue"
                type="checkbox"
                checked={hasIssue}
                onChange={(e) => setHasIssue(e.target.checked)}
              />
              <span>Flag this as an issue for Jordan</span>
            </label>

            {error && <div className="punch-error">{error}</div>}
            <button className="btn-big btn-out" disabled={busy} onClick={() => handlePunch('out')}>
              {busy ? 'Clocking out…' : 'Clock Out'}
            </button>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="punch-success">
            <div className="tick">{result.action === 'in' ? '✅' : '👋'}</div>
            {result.action === 'in' ? (
              <>
                <h2>Clocked in</h2>
                <p>{result.site_name} at {fmtTime(result.clock_in)}</p>
                <p style={{ marginTop: 10 }}>Scan this code again when you leave to clock out.</p>
              </>
            ) : (
              <>
                <h2>Clocked out</h2>
                <p>{result.site_name} at {fmtTime(result.clock_out)}</p>
                <p style={{ marginTop: 6 }}>
                  Shift length: <strong>{fmtHours(hoursBetween(result.clock_in, result.clock_out))}</strong>
                </p>
                <p style={{ marginTop: 10 }}>Thanks for your work today.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

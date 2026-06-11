'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SitesPage() {
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({ name: '', address: '', expected_hours_per_week: '', lat: '', lng: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/sites', { cache: 'no-store' });
    const j = await res.json();
    setSites(j.sites || []);
  }
  useEffect(() => { load(); }, []);

  async function addSite(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const res = await fetch('/api/admin/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(j.error); return; }
    setForm({ name: '', address: '', expected_hours_per_week: '', lat: '', lng: '' });
    load();
  }

  async function toggleActive(site) {
    await fetch(`/api/admin/sites/${site.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !site.active }),
    });
    load();
  }

  async function updateExpected(site) {
    const v = prompt(`Expected hours per week for ${site.name}:`, site.expected_hours_per_week ?? '');
    if (v === null) return;
    await fetch(`/api/admin/sites/${site.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expected_hours_per_week: v }),
    });
    load();
  }

  async function removeSite(site) {
    if (!confirm(`Delete ${site.name}? If it has shift history you'll be asked to deactivate instead.`)) return;
    const res = await fetch(`/api/admin/sites/${site.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json();
      alert(j.error);
    }
    load();
  }

  return (
    <>
      <div className="page-title">Sites & QR Codes</div>
      <div className="page-sub">
        Add a site, then print its QR code and stick it somewhere cleaners can scan on arrival
        (inside a cupboard door or store room works well). Coordinates are optional — paste them
        from Google Maps (right-click the site &gt; copy coordinates) to enable the GPS distance check.
      </div>

      <div className="card">
        <h3>Add a site</h3>
        <form onSubmit={addSite}>
          <div className="form-grid">
            <div className="field">
              <label>Site name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Norwood Office Building" />
            </div>
            <div className="field">
              <label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, suburb" />
            </div>
            <div className="field">
              <label>Expected hours / week</label>
              <input type="number" step="0.5" min="0" value={form.expected_hours_per_week} onChange={(e) => setForm({ ...form, expected_hours_per_week: e.target.value })} placeholder="e.g. 15" />
            </div>
            <div className="field">
              <label>Latitude (optional)</label>
              <input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="-34.92" />
            </div>
            <div className="field">
              <label>Longitude (optional)</label>
              <input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="138.60" />
            </div>
          </div>
          {err && <div className="error-text">{err}</div>}
          <button className="btn" style={{ marginTop: 12 }} disabled={busy}>{busy ? 'Adding…' : 'Add site'}</button>
        </form>
      </div>

      <div className="card">
        <h3>Sites ({sites.length})</h3>
        <div className="table-scroll">
          <table className="data">
            <thead><tr><th>Site</th><th>Address</th><th>Expected hrs/wk</th><th>GPS</th><th>Status</th><th>QR code</th><th></th></tr></thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.address || '—'}</td>
                  <td>
                    {s.expected_hours_per_week ?? '—'}{' '}
                    <button className="btn-link" onClick={() => updateExpected(s)}>edit</button>
                  </td>
                  <td>{s.lat != null ? <span className="badge badge-green">Set</span> : <span className="badge badge-grey">Not set</span>}</td>
                  <td>{s.active ? <span className="badge badge-green">Active</span> : <span className="badge badge-grey">Inactive</span>}</td>
                  <td><Link href={`/admin/sites/${s.id}/qr`}>View / print QR</Link></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn-link" onClick={() => toggleActive(s)}>{s.active ? 'Deactivate' : 'Reactivate'}</button>{' '}
                    <button className="btn-danger-text" onClick={() => removeSite(s)}>Delete</button>
                  </td>
                </tr>
              ))}
              {sites.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--grey-text)' }}>No sites yet — add your first one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

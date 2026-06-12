'use client';

import { useEffect, useState } from 'react';

export default function ContractorsPage() {
  const [contractors, setContractors] = useState([]);
  const [form, setForm] = useState({ name: '', pin: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPins, setShowPins] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/contractors', { cache: 'no-store' });
    const j = await res.json();
    setContractors(j.contractors || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const res = await fetch('/api/admin/contractors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(j.error); return; }
    setForm({ name: '', pin: '', phone: '' });
    load();
  }

  async function toggleActive(c) {
    await fetch(`/api/admin/contractors/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    });
    load();
  }

  async function resetPin(c) {
    const v = prompt(`New 4-digit PIN for ${c.name}:`);
    if (v === null) return;
    const res = await fetch(`/api/admin/contractors/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: v }),
    });
    if (!res.ok) alert((await res.json()).error);
    load();
  }

  async function editPhone(c) {
    const v = prompt(`New mobile number for ${c.name}:`, c.phone || '');
    if (v === null) return;
    const res = await fetch(`/api/admin/contractors/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: v }),
    });
    if (!res.ok) alert((await res.json()).error);
    load();
  }

  async function remove(c) {
    if (!confirm(`Delete ${c.name}? If they have shift history you'll be asked to deactivate instead.`)) return;
    const res = await fetch(`/api/admin/contractors/${c.id}`, { method: 'DELETE' });
    if (!res.ok) alert((await res.json()).error);
    load();
  }

  return (
    <>
      <div className="page-title">Contractors</div>
      <div className="page-sub">
        Cleaners sign in at the site with their <strong>mobile number + PIN</strong>, so both are
        required and the mobile must be unique. Text each person their PIN privately.
      </div>

      <div className="card">
        <h3>Add a contractor</h3>
        <form onSubmit={add}>
          <div className="form-grid">
            <div className="field">
              <label>Full name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Maria Santos" />
            </div>
            <div className="field">
              <label>Mobile number * (their sign-in)</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="04xx xxx xxx" />
            </div>
            <div className="field">
              <label>4-digit PIN *</label>
              <input inputMode="numeric" maxLength={4} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 4827" />
            </div>
          </div>
          {err && <div className="error-text">{err}</div>}
          <button className="btn" style={{ marginTop: 12 }} disabled={busy}>{busy ? 'Adding…' : 'Add contractor'}</button>
        </form>
      </div>

      <div className="card">
        <h3>
          Contractors ({contractors.length}){' '}
          <button className="btn-link" onClick={() => setShowPins(!showPins)}>
            {showPins ? 'Hide PINs' : 'Show PINs'}
          </button>
        </h3>
        <div className="table-scroll">
          <table className="data">
            <thead><tr><th>Name</th><th>Mobile (sign-in)</th><th>PIN</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {contractors.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>
                    {c.phone || <span className="badge badge-red">Missing — can&apos;t clock in</span>}{' '}
                    <button className="btn-link" onClick={() => editPhone(c)}>edit</button>
                  </td>
                  <td>{showPins ? c.pin : '••••'} <button className="btn-link" onClick={() => resetPin(c)}>reset</button></td>
                  <td>{c.active ? <span className="badge badge-green">Active</span> : <span className="badge badge-grey">Inactive</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn-link" onClick={() => toggleActive(c)}>{c.active ? 'Deactivate' : 'Reactivate'}</button>{' '}
                    <button className="btn-danger-text" onClick={() => remove(c)}>Delete</button>
                  </td>
                </tr>
              ))}
              {contractors.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--grey-text)' }}>No contractors yet — add your first one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

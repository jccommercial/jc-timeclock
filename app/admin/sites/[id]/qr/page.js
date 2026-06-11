'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';

// Printable QR poster for one site. Print straight from the browser
// (the buttons are hidden on paper) or download the QR as a PNG.

export default function SiteQrPage({ params }) {
  const [site, setSite] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [punchUrl, setPunchUrl] = useState('');

  useEffect(() => {
    fetch('/api/admin/sites', { cache: 'no-store' })
      .then((r) => r.json())
      .then(async (j) => {
        const s = (j.sites || []).find((x) => x.id === params.id);
        if (!s) return;
        setSite(s);
        const url = `${window.location.origin}/punch/${s.qr_token}`;
        setPunchUrl(url);
        setQrDataUrl(await QRCode.toDataURL(url, { width: 800, margin: 2 }));
      });
  }, [params.id]);

  if (!site) return <div className="qr-page"><p>Loading…</p></div>;

  return (
    <div className="qr-page">
      <div className="no-print">
        <Link href="/admin/sites" className="btn btn-secondary" style={{ textDecoration: 'none' }}>← Back to sites</Link>
        <button className="btn" onClick={() => window.print()}>Print this page</button>
        {qrDataUrl && (
          <a className="btn btn-secondary" style={{ textDecoration: 'none' }} href={qrDataUrl} download={`QR - ${site.name}.png`}>
            Download PNG
          </a>
        )}
      </div>

      <h1>{site.name}</h1>
      {site.address && <div className="addr">{site.address}</div>}

      {qrDataUrl && <img className="qr" src={qrDataUrl} alt={`QR code for ${site.name}`} />}

      <div className="qr-steps">
        <strong>Clock in &amp; out here</strong><br />
        1. Open your phone camera and scan this code<br />
        2. Tap the link that pops up<br />
        3. Select your name and enter your PIN<br />
        4. Tap <strong>Clock In</strong> when you arrive, <strong>Clock Out</strong> when you leave
      </div>

      <div className="qr-brandline">JC Commercial — Time Clock</div>
      <p style={{ fontSize: 11, color: '#999', marginTop: 8, wordBreak: 'break-all' }}>{punchUrl}</p>
    </div>
  );
}

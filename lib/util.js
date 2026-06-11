// Shared helpers (safe for client and server).

export function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const TZ = 'Australia/Adelaide';

export function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-AU', {
    timeZone: TZ, hour: 'numeric', minute: '2-digit',
  });
}

export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short',
  });
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  return `${fmtDate(iso)} ${fmtTime(iso)}`;
}

export function hoursBetween(inIso, outIso) {
  if (!inIso) return 0;
  const end = outIso ? new Date(outIso) : new Date();
  return (end - new Date(inIso)) / 3600000;
}

export function fmtHours(h) {
  if (h == null || isNaN(h)) return '—';
  const mins = Math.round(h * 60);
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
}

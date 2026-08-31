function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) return String(forwarded[0]).trim();
  return (
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    ''
  );
}

function clientUserAgent(req) {
  return String(req.headers['user-agent'] || '').slice(0, 512);
}

function normalizeLocation(raw = {}) {
  if (!raw || typeof raw !== 'object') return undefined;
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return {
    lat,
    lng,
    city: String(raw.city || '').trim() || undefined,
    sector: String(raw.sector || raw.neighbourhood || raw.suburb || '').trim() || undefined,
    locality: String(raw.locality || raw.suburb || '').trim() || undefined,
    state: String(raw.state || '').trim() || undefined,
    country: String(raw.country || '').trim() || undefined,
    displayName: String(raw.displayName || raw.display_name || '').trim() || undefined,
  };
}

function formatLocationLabel(loc) {
  if (!loc) return 'Location unavailable';
  const parts = [loc.sector, loc.locality, loc.city, loc.state].filter(Boolean);
  if (parts.length) return parts.join(', ');
  if (Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
    return `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
  }
  return 'Location unavailable';
}

module.exports = {
  clientIp,
  clientUserAgent,
  normalizeLocation,
  formatLocationLabel,
};

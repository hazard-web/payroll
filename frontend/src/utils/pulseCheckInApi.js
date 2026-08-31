import api from '../api'
import { peekPulseLocation, capturePulseLocation } from './pulseLocation'

function dayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Sync Pulse check-in events to backend.
 * Never waits on GPS — uses cache only so UI stays responsive.
 */
export async function syncPulseCheckInEvent(kind, { email, activeMs, date } = {}) {
  try {
    const location = peekPulseLocation()
    // Warm cache for a later event; do not await.
    if (location.lat == null) {
      void capturePulseLocation(3000)
    }

    const body = {
      email,
      activeMs: Math.max(0, Number(activeMs) || 0),
      date: date || dayKey(),
      location,
    }
    if (kind === 'check-in') {
      await api.post('/pulse-checkin/check-in', body)
    } else if (kind === 'check-out') {
      await api.post('/pulse-checkin/check-out', body)
    } else if (kind === 'finalize') {
      await api.post('/pulse-checkin/finalize-day', body)
    } else if (kind === 'sync') {
      await api.post('/pulse-checkin/sync', body)
    }
  } catch {
    /* offline / unauthorized — keep local session */
  }
}

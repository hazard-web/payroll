/**
 * Fast location for check-in — cache + short timeout, geocode off the critical path.
 */

const empty = () => ({
  lat: null,
  lng: null,
  city: '',
  sector: '',
  locality: '',
  state: '',
  country: '',
  displayName: '',
})

let cached = null
let inflight = null

function readCoords(timeoutMs, highAccuracy) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new Error('no-geo'))
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: highAccuracy,
      timeout: timeoutMs,
      maximumAge: 300_000,
    })
  })
}

async function reverseGeocode(lat, lng) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('zoom', '18')
  url.searchParams.set('addressdetails', '1')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', 'Accept-Language': 'en' },
  })
  if (!res.ok) return empty()
  const data = await res.json()
  const addr = data?.address || {}
  const sector =
    addr.neighbourhood ||
    addr.suburb ||
    addr.residential ||
    addr.quarter ||
    addr.city_district ||
    addr.county ||
    ''
  const city =
    addr.city || addr.town || addr.village || addr.municipality || addr.county || ''
  return {
    lat,
    lng,
    city: String(city || ''),
    sector: String(sector || ''),
    locality: String(addr.suburb || addr.neighbourhood || addr.hamlet || ''),
    state: String(addr.state || ''),
    country: String(addr.country || ''),
    displayName: String(data?.display_name || ''),
  }
}

/** Instant: last known location (may be empty). */
export function peekPulseLocation() {
  return cached ? { ...cached } : empty()
}

/**
 * Best-effort location. Prefer cache; never wait long.
 * Geocode runs in background and refreshes cache for the next event.
 */
export async function capturePulseLocation(timeoutMs = 2500) {
  if (cached?.lat != null && cached?.lng != null) {
    return { ...cached }
  }

  if (inflight) {
    try {
      return await Promise.race([
        inflight,
        new Promise((resolve) => setTimeout(() => resolve(peekPulseLocation()), Math.min(timeoutMs, 800))),
      ])
    } catch {
      return empty()
    }
  }

  inflight = (async () => {
    try {
      let coords
      try {
        coords = await readCoords(timeoutMs, false)
      } catch {
        coords = await readCoords(Math.min(timeoutMs, 2000), true)
      }
      const lat = coords.coords.latitude
      const lng = coords.coords.longitude
      const base = { ...empty(), lat, lng }
      cached = base

      // Enrich in background — do not block check-in/out
      void reverseGeocode(lat, lng)
        .then((full) => {
          if (full?.lat != null) cached = full
        })
        .catch(() => {})

      return base
    } catch {
      return empty()
    } finally {
      inflight = null
    }
  })()

  try {
    return await inflight
  } catch {
    return empty()
  }
}

/** Warm cache early without competing with first paint. */
export function prefetchPulseLocation() {
  if (typeof window === 'undefined') return
  const run = () => {
    void capturePulseLocation(4000)
  }
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 5000 })
  } else {
    window.setTimeout(run, 2000)
  }
}

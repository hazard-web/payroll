/** Local Electron companion (always-on-top timer). */
export const PULSE_DESKTOP_BRIDGE = 'http://127.0.0.1:39217'

function withTimeout(ms) {
  const controller = new AbortController()
  const id = window.setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, clear: () => window.clearTimeout(id) }
}

export async function isPulseDesktopRunning() {
  const t = withTimeout(400)
  try {
    const res = await fetch(`${PULSE_DESKTOP_BRIDGE}/health`, {
      method: 'GET',
      signal: t.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    t.clear()
  }
}

async function postDesktop(path, body) {
  const t = withTimeout(600)
  try {
    const res = await fetch(`${PULSE_DESKTOP_BRIDGE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: t.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    t.clear()
  }
}

function normalizeSession(email, sessionOrTs) {
  if (!sessionOrTs) return null
  if (typeof sessionOrTs === 'number') {
    const checkedInAt = sessionOrTs
    return {
      email: email || null,
      checkedInAt,
      activeMs: 0,
      lastTickAt: checkedInAt,
    }
  }
  // Stopped / inactive sessions must hide the widget — never treat as check-in.
  if (sessionOrTs.status === 'stopped') return null
  if (!sessionOrTs.checkedInAt) return null
  if (sessionOrTs.status && sessionOrTs.status !== 'active') return null
  return {
    email: email || sessionOrTs.email || null,
    checkedInAt: Number(sessionOrTs.checkedInAt),
    activeMs: Math.max(0, Number(sessionOrTs.activeMs) || 0),
    lastTickAt: Number(sessionOrTs.lastTickAt) || Number(sessionOrTs.checkedInAt),
  }
}

/**
 * Sync check-in to the desktop companion immediately (local HTTP).
 * Check-in → show widget with live elapsed. Check-out → hide widget.
 */
export async function syncPulseDesktopCheckIn(email, sessionOrTs) {
  const session = normalizeSession(email, sessionOrTs)
  if (session) {
    const ok = await postDesktop('/checkin', session)
    if (!ok) {
      window.setTimeout(() => {
        void postDesktop('/checkin', session)
      }, 400)
    }
    return ok
  }

  const ok = await postDesktop('/checkout', { email: null, checkedInAt: null })
  if (!ok) {
    window.setTimeout(() => {
      void postDesktop('/checkout', { email: null, checkedInAt: null })
    }, 400)
  }
  return ok
}

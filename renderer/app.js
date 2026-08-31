function formatElapsed(total) {
  const safe = Math.max(0, Math.floor(Number(total) || 0))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

const timeEl = document.getElementById('time')
let session = null
let tickId = null

function render() {
  if (!session?.checkedInAt) {
    timeEl.textContent = '00:00:00'
    return
  }
  const elapsed =
    typeof session.elapsedSeconds === 'number'
      ? session.elapsedSeconds
      : Math.max(0, Math.floor((Number(session.activeMs) || 0) / 1000))
  timeEl.textContent = formatElapsed(elapsed)
}

function startTick() {
  if (tickId) window.clearInterval(tickId)
  render()
  // Main process reconciles; ask for fresh state each second.
  tickId = window.setInterval(() => {
    window.pulseDesktop.getState().then(applyState)
  }, 1000)
}

function applyState(next) {
  if (!next?.checkedInAt) {
    session = null
    if (tickId) {
      window.clearInterval(tickId)
      tickId = null
    }
    render()
    return
  }
  session = next
  startTick()
}

window.pulseDesktop.getState().then(applyState)
window.pulseDesktop.onState(applyState)

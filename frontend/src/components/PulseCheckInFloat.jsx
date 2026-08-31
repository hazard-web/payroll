import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ExpandOutlined, HolderOutlined } from '@ant-design/icons'
import { Badge, Button, Tooltip } from 'antd'
import { useAuth } from '../context/AuthContext'
import {
  formatElapsed,
  getElapsedSeconds,
  PULSE_CHECKIN_EVENT,
  readCheckInAt,
  readFloatPosition,
  writeFloatPosition,
} from '../utils/pulseCheckIn'
import {
  closeCheckInPip,
  isCheckInPipOpen,
  openCheckInPip,
  PULSE_PIP_EVENT,
} from '../utils/pulseCheckInPip'
import { isPulseDesktopRunning } from '../utils/pulseDesktopBridge'
import './pulse-checkin-float.css'

const DEFAULT_POS = { x: null, y: null }
const FLOAT_MARGIN = 10
const FLOAT_BOTTOM_RESERVE = 42

function clampPos(x, y, width, height) {
  const maxX = Math.max(FLOAT_MARGIN, window.innerWidth - width - FLOAT_MARGIN)
  const maxY = Math.max(FLOAT_MARGIN, window.innerHeight - height - FLOAT_BOTTOM_RESERVE)
  return {
    x: Math.min(maxX, Math.max(FLOAT_MARGIN, x)),
    y: Math.min(maxY, Math.max(FLOAT_MARGIN, y)),
  }
}

/** In-page check-in chip; can open a separate timer window. */
export default function PulseCheckInFloat() {
  const { user } = useAuth()
  const email = user?.email
  const rootRef = useRef(null)
  const dragRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const [checkedInAt, setCheckedInAt] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [pos, setPos] = useState(() => readFloatPosition() || DEFAULT_POS)
  const posRef = useRef(pos)
  const [dragging, setDragging] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [pipOpen, setPipOpen] = useState(() => isCheckInPipOpen())
  const [desktopRunning, setDesktopRunning] = useState(false)

  const syncFromStorage = useCallback(() => {
    setCheckedInAt(readCheckInAt(email))
  }, [email])

  useEffect(() => {
    let alive = true
    const poll = async () => {
      const running = await isPulseDesktopRunning()
      if (alive) setDesktopRunning(running)
    }
    poll()
    const id = window.setInterval(poll, 2500)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    syncFromStorage()
  }, [syncFromStorage])

  useEffect(() => {
    const onChange = (event) => {
      if (event?.detail?.email && email && event.detail.email !== email) return
      const next = event?.detail?.checkedInAt ?? readCheckInAt(email)
      setCheckedInAt(next)
      if (!next) closeCheckInPip()
    }
    const onStorage = (event) => {
      if (!email) return
      if (event.key && event.key.startsWith('pulseMySpaceCheckIn:')) syncFromStorage()
    }
    const onPip = (event) => setPipOpen(Boolean(event?.detail?.open))
    window.addEventListener(PULSE_CHECKIN_EVENT, onChange)
    window.addEventListener(PULSE_PIP_EVENT, onPip)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(PULSE_CHECKIN_EVENT, onChange)
      window.removeEventListener(PULSE_PIP_EVENT, onPip)
      window.removeEventListener('storage', onStorage)
    }
  }, [email, syncFromStorage])

  useEffect(() => {
    if (!checkedInAt || !email) {
      setElapsed(0)
      return undefined
    }
    const tick = () => setElapsed(getElapsedSeconds(email))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [checkedInAt, email])

  useEffect(() => {
    posRef.current = pos
  }, [pos])

  const applyPosition = useCallback((node, next) => {
    if (!node || typeof next?.x !== 'number' || typeof next?.y !== 'number') return
    node.style.left = `${next.x}px`
    node.style.top = `${next.y}px`
    node.style.right = 'auto'
    node.style.bottom = 'auto'
  }, [])

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    if (event.target.closest('.pulse-checkin-float-action')) return
    const node = rootRef.current
    if (!node) return

    const rect = node.getBoundingClientRect()
    const baseX = typeof posRef.current?.x === 'number' ? posRef.current.x : rect.left
    const baseY = typeof posRef.current?.y === 'number' ? posRef.current.y : rect.top

    if (typeof posRef.current?.x !== 'number') {
      const anchored = { x: baseX, y: baseY }
      posRef.current = anchored
      applyPosition(node, anchored)
    }

    dragRef.current = {
      offsetX: event.clientX - baseX,
      offsetY: event.clientY - baseY,
      width: rect.width,
      height: rect.height,
      lastPos: { x: baseX, y: baseY },
    }
    setDragging(true)
    node.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event) => {
    if (!dragRef.current) return
    const next = clampPos(
      event.clientX - dragRef.current.offsetX,
      event.clientY - dragRef.current.offsetY,
      dragRef.current.width,
      dragRef.current.height,
    )
    dragRef.current.lastPos = next
    posRef.current = next
    applyPosition(rootRef.current, next)
  }

  const onPointerUp = (event) => {
    if (!dragRef.current) return
    const finalPos = dragRef.current.lastPos
    dragRef.current = null
    setDragging(false)
    try {
      rootRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
    if (finalPos) {
      posRef.current = finalPos
      setPos(finalPos)
      writeFloatPosition(finalPos)
    }
  }

  const togglePip = (event) => {
    event.stopPropagation()
    if (pipOpen) {
      closeCheckInPip()
      return
    }
    void openCheckInPip(email)
  }

  if (!email || !checkedInAt) return null

  // Desktop companion owns the on-screen timer — avoid a second chip in the browser.
  if (desktopRunning) return null

  // Separate popup/pip window is the cross-tab timer.
  if (pipOpen) return null

  const timeLabel = formatElapsed(elapsed)
  const activePos = dragging ? posRef.current : pos
  const showExpanded = expanded || dragging

  const style =
    typeof activePos?.x === 'number' && typeof activePos?.y === 'number'
      ? { left: activePos.x, top: activePos.y, right: 'auto', bottom: 'auto' }
      : undefined

  const shell = (
    <div
      ref={rootRef}
      className={[
        'pulse-checkin-float',
        dragging ? 'is-dragging' : '',
        showExpanded ? 'is-expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        if (!dragRef.current) setExpanded(false)
      }}
      onFocus={() => setExpanded(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false)
      }}
      role="status"
      aria-live="polite"
      aria-label={`Checked in ${timeLabel}`}
    >
      <Badge status="processing" color="#34d399" className="pulse-checkin-float-badge" />

      <span className="pulse-checkin-float-time">{timeLabel}</span>

      <AnimatePresence initial={false}>
        {showExpanded ? (
          <motion.div
            key="actions"
            className="pulse-checkin-float-actions"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.18 }}
          >
            <Tooltip title="Drag to move" mouseEnterDelay={0.4}>
              <span className="pulse-checkin-float-action pulse-checkin-float-grip" aria-hidden="true">
                <HolderOutlined />
              </span>
            </Tooltip>
            <Tooltip title="Open timer">
              <Button
                type="text"
                size="small"
                className="pulse-checkin-float-action pulse-checkin-float-pip"
                icon={<ExpandOutlined />}
                aria-label="Open timer"
                onClick={togglePip}
              />
            </Tooltip>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )

  return createPortal(shell, document.body)
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CloseOutlined,
  HolderOutlined,
  PlusOutlined,
  ReloadOutlined,
  SlidersOutlined,
} from '@ant-design/icons'
import {
  Badge,
  Button,
  Empty,
  Popover,
  Switch,
  Typography,
} from 'antd'

const STORAGE_KEY = 'pulseMySpaceDashWidgets'
const DRAG_THRESHOLD = 4

const DEMO = {
  birthday: [
    { id: 'b1', title: 'Priya Sharma', meta: 'Today · Design' },
    { id: 'b2', title: 'Amit Verma', meta: '22 Aug · Engineering' },
    { id: 'b3', title: 'Neha Kapoor', meta: '24 Aug · People' },
    { id: 'b4', title: 'Karan Joshi', meta: '28 Aug · Sales' },
    { id: 'b5', title: 'Sara Ali', meta: '1 Sep · Finance' },
    { id: 'b6', title: 'Vikram Rao', meta: '4 Sep · Ops' },
  ],
  newHires: [
    { id: 'n1', title: 'Ananya Gupta', meta: 'Joined 11 Aug · Product' },
    { id: 'n2', title: 'Rohan Das', meta: 'Joined 4 Aug · Engineering' },
    { id: 'n3', title: 'Meera Iyer', meta: 'Joined 28 Jul · Design' },
    { id: 'n4', title: 'Dev Patel', meta: 'Joined 21 Jul · Sales' },
    { id: 'n5', title: 'Ishita Khan', meta: 'Joined 14 Jul · People' },
  ],
  favorites: [
    { id: 'f1', title: 'Attendance', meta: 'Module' },
    { id: 'f2', title: 'Leave Tracker', meta: 'Module' },
    { id: 'f3', title: 'Timesheets', meta: 'Module' },
    { id: 'f4', title: 'Directory', meta: 'People' },
    { id: 'f5', title: 'Payslips', meta: 'Finance' },
  ],
  quickLinks: [
    { id: 'ql1', title: 'Employee handbook', meta: 'Policy · PDF' },
    { id: 'ql2', title: 'Leave policy 2026', meta: 'HR · Doc' },
    { id: 'ql3', title: 'Office map · Noida', meta: 'Facilities' },
    { id: 'ql4', title: 'IT helpdesk', meta: 'Support portal' },
    { id: 'ql5', title: 'Payroll calendar', meta: 'Finance' },
    { id: 'ql6', title: 'Benefits enrollment', meta: 'HR' },
    { id: 'ql7', title: 'Travel desk', meta: 'Ops' },
    { id: 'ql8', title: 'Learning hub', meta: 'L&D' },
  ],
  announcements: [
    { id: 'a1', title: 'Independence Day — office closed', meta: '15 Aug · All hands' },
    { id: 'a2', title: 'Q2 town hall recording', meta: '12 Aug · Leadership' },
    { id: 'a3', title: 'New parking levels open', meta: '10 Aug · Facilities' },
    { id: 'a4', title: 'Update your emergency contacts', meta: '8 Aug · HR' },
    { id: 'a5', title: 'Wifi maintenance Sunday', meta: '7 Aug · IT' },
    { id: 'a6', title: 'Performance cycle kickoff', meta: '5 Aug · People' },
  ],
  leaveReport: [
    { id: 'l1', title: 'Casual leave', meta: '6 used · 6 left' },
    { id: 'l2', title: 'Sick leave', meta: '2 used · 6 left' },
    { id: 'l3', title: 'Earned leave', meta: '5 used · 10 left' },
    { id: 'l4', title: 'Comp-off', meta: '1 used · 2 left' },
    { id: 'l5', title: 'Work from home', meta: '3 used · 9 left' },
    { id: 'l6', title: 'Bereavement', meta: '0 used · 5 left' },
  ],
  holidays: [
    { id: 'h1', title: 'Independence Day', meta: 'Fri · 15 Aug 2026' },
    { id: 'h2', title: 'Gandhi Jayanti', meta: 'Fri · 2 Oct 2026' },
    { id: 'h3', title: 'Diwali', meta: 'Thu · 29 Oct 2026' },
    { id: 'h4', title: 'Christmas', meta: 'Fri · 25 Dec 2026' },
    { id: 'h5', title: 'Republic Day', meta: 'Tue · 26 Jan 2027' },
    { id: 'h6', title: 'Holi', meta: 'Wed · 3 Mar 2027' },
  ],
  tasks: [
    { id: 't1', title: 'Approve casual leave — Asha Mehta', meta: 'Due today' },
    { id: 't2', title: 'Review timesheet · Week 33', meta: 'Due today' },
    { id: 't3', title: 'Expense · Client travel ₹4,200', meta: 'Due 20 Aug' },
    { id: 't4', title: 'Confirm WFH for Rahul', meta: 'Due 22 Aug' },
    { id: 't5', title: 'Sign offer letter checklist', meta: 'Due 25 Aug' },
    { id: 't6', title: 'Complete mid-year goals draft', meta: 'Due 28 Aug' },
    { id: 't7', title: 'Submit training feedback', meta: 'Due 30 Aug' },
  ],
  files: [
    { id: 'file1', title: 'Offer_Letter_Template.pdf', meta: 'Organization · 240 KB' },
    { id: 'file2', title: 'Code_of_Conduct.pdf', meta: 'Organization · 1.1 MB' },
    { id: 'file3', title: 'WFH_Guidelines.docx', meta: 'Organization · 88 KB' },
    { id: 'file4', title: 'Onboarding_Checklist.xlsx', meta: 'Organization · 56 KB' },
    { id: 'file5', title: 'ID_Proof_Scan.pdf', meta: 'Employee · 2.4 MB' },
    { id: 'file6', title: 'Bank_Mandate.pdf', meta: 'Employee · 310 KB' },
  ],
  workAnniv: [
    { id: 'w1', title: 'Rahul Iyer · 4 years', meta: '18 Aug · Engineering' },
    { id: 'w2', title: 'Asha Mehta · 2 years', meta: '21 Aug · People' },
    { id: 'w3', title: 'Suresh Nair · 7 years', meta: '2 Sep · Ops' },
    { id: 'w4', title: 'Fatima Noor · 1 year', meta: '9 Sep · Design' },
  ],
  weddingAnniv: [
    { id: 'wa1', title: 'Deepak & Riya', meta: '20 Aug' },
    { id: 'wa2', title: 'Pooja & Arjun', meta: '27 Aug' },
    { id: 'wa3', title: 'Nikhil & Sana', meta: '3 Sep' },
  ],
  engagement: [
    { id: 'e1', title: 'Pulse check · August', meta: 'Due 31 Aug' },
    { id: 'e2', title: 'Manager effectiveness survey', meta: 'Due 5 Sep' },
    { id: 'e3', title: 'Office experience feedback', meta: 'Due 12 Sep' },
    { id: 'e4', title: 'Benefits satisfaction', meta: 'Due 20 Sep' },
  ],
}

const MY_WIDGETS = [
  { id: 'birthday', label: 'Birthday', dataKey: 'birthday', empty: 'No birthdays today', showAvatar: true },
  { id: 'newHires', label: 'New Hires', dataKey: 'newHires', empty: 'No new joinees in past 15 days', showAvatar: true },
  { id: 'favorites', label: 'Favorites', dataKey: 'favorites', empty: 'No favorites yet', addable: true },
  { id: 'quickLinks', label: 'Quick Links', dataKey: 'quickLinks', empty: 'No quick links', addable: true },
  { id: 'announcements', label: 'Announcements', dataKey: 'announcements', empty: 'No announcements', addable: true },
  { id: 'leaveReport', label: 'Leave Report', dataKey: 'leaveReport', empty: 'No leave data yet' },
  { id: 'holidays', label: 'Upcoming Holidays', dataKey: 'holidays', empty: 'No upcoming holidays' },
  { id: 'tasks', label: 'My Pending Tasks', dataKey: 'tasks', empty: 'There are no tasks available', badge: true },
  { id: 'files', label: 'My Files', dataKey: 'files', empty: 'No files found', showTotal: true, scrollable: true },
  { id: 'workAnniv', label: 'Work Anniversary', dataKey: 'workAnniv', empty: 'No work anniversaries today', showAvatar: true },
  { id: 'weddingAnniv', label: 'Wedding Anniversary', dataKey: 'weddingAnniv', empty: 'No wedding anniversaries today', showAvatar: true },
  { id: 'engagement', label: 'Employee Engagement', dataKey: 'engagement', empty: 'No pending surveys', badge: true },
]

function defaultPrefs() {
  return {
    order: MY_WIDGETS.map((w) => w.id),
    enabled: Object.fromEntries(MY_WIDGETS.map((w) => [w.id, true])),
  }
}

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPrefs()
    const parsed = JSON.parse(raw)
    const base = defaultPrefs()
    return {
      order: Array.isArray(parsed.order) && parsed.order.length ? parsed.order : base.order,
      enabled: { ...base.enabled, ...(parsed.enabled || {}) },
    }
  } catch {
    return defaultPrefs()
  }
}

function writePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

function rowInitial(title = '') {
  const part = String(title).trim().split(/\s+/)[0] || '?'
  return part.charAt(0).toUpperCase()
}

function moveId(list, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return list
  const next = [...list]
  const from = next.indexOf(fromId)
  const to = next.indexOf(toId)
  if (from < 0 || to < 0) return list
  next.splice(from, 1)
  next.splice(to, 0, fromId)
  return next
}

function hitIdFromPoint(ids, refs, clientX, clientY) {
  let best = null
  let bestDist = Infinity
  for (const id of ids) {
    const el = refs.current.get(id)
    if (!el) continue
    const r = el.getBoundingClientRect()
    const inside =
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    if (inside) return id
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const dist = (clientX - cx) ** 2 + (clientY - cy) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = id
    }
  }
  return best
}

function DashListWidget({
  title,
  items = [],
  empty,
  addable,
  onAdd,
  badgeCount,
  showTotal,
  showAvatar,
  scrollable,
  cardRef,
  isPlaceholder,
  placeholderHeight,
  floating,
  onGripPointerDown,
}) {
  const total = items.length

  if (isPlaceholder) {
    return (
      <div
        ref={cardRef}
        className="pulse-dash-placeholder"
        style={{ minHeight: placeholderHeight || 188 }}
        aria-hidden="true"
      />
    )
  }

  let headExtra = null
  if (addable) {
    headExtra = (
      <Button
        type="text"
        size="small"
        className="pulse-dash-add"
        icon={<PlusOutlined />}
        aria-label={`Add ${title}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onAdd?.()
        }}
      />
    )
  } else if (badgeCount != null) {
    headExtra = (
      <span className="pulse-dash-badge">
        <span className="pulse-dash-badge-label">Pending</span>
        <Badge count={badgeCount} showZero overflowCount={99} />
      </span>
    )
  } else if (showTotal) {
    headExtra = (
      <Typography.Text className="pulse-dash-meta">
        Total <strong>{total}</strong>
      </Typography.Text>
    )
  }

  return (
    <article
      ref={cardRef}
      className={[
        'pulse-dash-card',
        floating ? 'is-floating' : '',
        scrollable ? 'is-scroll' : '',
        total === 0 ? 'is-empty' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="pulse-dash-card-head">
        <div className="pulse-dash-card-title-row">
          <button
            type="button"
            className="pulse-dash-card-grip"
            aria-label={`Drag ${title}`}
            onPointerDown={floating ? undefined : onGripPointerDown}
            tabIndex={floating ? -1 : 0}
          >
            <HolderOutlined />
          </button>
          <h3 className="pulse-dash-card-title">{title}</h3>
        </div>
        {headExtra}
      </header>

      {total === 0 ? (
        <div className="pulse-dash-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty || 'No data'} />
        </div>
      ) : (
        <ul className="pulse-dash-rows">
          {items.map((item) => (
            <li key={item.id} className="pulse-dash-row">
              {showAvatar ? (
                <span className="pulse-dash-avatar" aria-hidden="true">
                  {rowInitial(item.title)}
                </span>
              ) : null}
              <div className="pulse-dash-row-copy">
                <p className="pulse-dash-row-title">{item.title}</p>
                {item.meta ? <p className="pulse-dash-row-meta">{item.meta}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function CustomizePanel({ prefs, setPrefs, onClose }) {
  const [tab, setTab] = useState('my')
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const rowRefs = useRef(new Map())
  const dragRef = useRef(null)

  const myList = useMemo(() => {
    const byId = Object.fromEntries(MY_WIDGETS.map((w) => [w.id, w]))
    const ordered = prefs.order.map((id) => byId[id]).filter(Boolean)
    const missing = MY_WIDGETS.filter((w) => !prefs.order.includes(w.id))
    return [...ordered, ...missing]
  }, [prefs.order])

  const toggleMy = (id, on) => {
    setPrefs((prev) => {
      const next = {
        ...prev,
        enabled: { ...prev.enabled, [id]: on },
      }
      writePrefs(next)
      return next
    })
  }

  const commitOrder = useCallback((fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return
    setPrefs((prev) => {
      const order = moveId(prev.order, fromId, toId)
      if (order === prev.order) return prev
      const next = { ...prev, order }
      writePrefs(next)
      return next
    })
  }, [setPrefs])

  useEffect(() => {
    if (!dragId) return undefined

    const onMove = (e) => {
      const session = dragRef.current
      if (!session) return
      const dx = e.clientX - session.startX
      const dy = e.clientY - session.startY
      if (!session.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      session.active = true
      const ids = myList.map((w) => w.id)
      const hit = hitIdFromPoint(ids, rowRefs, e.clientX, e.clientY)
      if (hit && hit !== session.fromId) {
        setOverId(hit)
        commitOrder(session.fromId, hit)
      }
    }

    const onUp = () => {
      dragRef.current = null
      setDragId(null)
      setOverId(null)
      document.body.classList.remove('pulse-dash-dragging')
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragId, myList, commitOrder])

  const startRowDrag = (id, e) => {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    dragRef.current = { fromId: id, startX: e.clientX, startY: e.clientY, active: false }
    setDragId(id)
    setOverId(null)
    document.body.classList.add('pulse-dash-dragging')
  }

  return (
    <div className="pulse-dash-customize">
      <header className="pulse-dash-customize-head">
        <Typography.Text strong>Customize widgets</Typography.Text>
        <Button
          type="text"
          size="small"
          className="pulse-dash-customize-close"
          icon={<CloseOutlined />}
          aria-label="Close"
          onClick={onClose}
        />
      </header>

      <div className="pulse-dash-customize-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'my'}
          className={`pulse-dash-customize-tab${tab === 'my' ? ' is-on' : ''}`}
          onClick={() => setTab('my')}
        >
          My Widgets
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'org'}
          className={`pulse-dash-customize-tab${tab === 'org' ? ' is-on' : ''}`}
          onClick={() => setTab('org')}
        >
          Org Widgets
        </button>
      </div>

      <div className="pulse-dash-customize-scroll">
        {tab === 'org' ? (
          <div className="pulse-dash-customize-soon">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Organization widgets coming soon"
            />
          </div>
        ) : (
          <ul className="pulse-dash-customize-list">
            {myList.map((item) => (
              <li
                key={item.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(item.id, el)
                  else rowRefs.current.delete(item.id)
                }}
                className={[
                  'pulse-dash-customize-row',
                  dragId === item.id ? 'is-dragging' : '',
                  overId === item.id && dragId !== item.id ? 'is-drop-target' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  type="button"
                  className="pulse-dash-customize-grip-btn"
                  aria-label={`Reorder ${item.label}`}
                  onPointerDown={(e) => startRowDrag(item.id, e)}
                >
                  <HolderOutlined className="pulse-dash-customize-grip" aria-hidden="true" />
                </button>
                <span className="pulse-dash-customize-label">{item.label}</span>
                <Switch
                  size="small"
                  checked={prefs.enabled[item.id] !== false}
                  onChange={(on) => toggleMy(item.id, on)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** My Space → Dashboard with sticky tools, customizable grip drag. */
export default function PulseMySpaceDashboard({ onSoon, useSample = true }) {
  const soon = (label) => (typeof onSoon === 'function' ? onSoon(label) : undefined)
  const [prefs, setPrefs] = useState(() => readPrefs())
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [tick, setTick] = useState(0)
  const [ghost, setGhost] = useState(null)
  const cardRefs = useRef(new Map())
  const dragRef = useRef(null)
  const ghostPosRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(0)

  const data = useSample
    ? DEMO
    : Object.fromEntries(Object.keys(DEMO).map((k) => [k, []]))

  const catalog = useMemo(() => Object.fromEntries(MY_WIDGETS.map((w) => [w.id, w])), [])

  const visibleWidgets = useMemo(() => {
    const seen = new Set()
    const list = []
    prefs.order.forEach((id) => {
      if (prefs.enabled[id] === false) return
      const def = catalog[id]
      if (!def || seen.has(id)) return
      seen.add(id)
      list.push(def)
    })
    MY_WIDGETS.forEach((def) => {
      if (seen.has(def.id) || prefs.enabled[def.id] === false) return
      list.push(def)
    })
    return list
  }, [prefs, catalog])

  const visibleIds = useMemo(() => visibleWidgets.map((w) => w.id), [visibleWidgets])
  const visibleIdsRef = useRef(visibleIds)
  visibleIdsRef.current = visibleIds

  const applyOrder = useCallback((fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return
    setPrefs((prev) => {
      const order = moveId(prev.order, fromId, toId)
      if (order === prev.order) return prev
      const next = { ...prev, order }
      writePrefs(next)
      return next
    })
  }, [])

  const paintGhost = useCallback(() => {
    rafRef.current = 0
    const session = dragRef.current
    if (!session?.active) return
    const { x, y } = ghostPosRef.current
    setGhost((prev) =>
      prev
        ? {
            ...prev,
            x,
            y,
            pending: false,
          }
        : prev,
    )
  }, [])

  useEffect(() => {
    if (!ghost?.id) return undefined

    const onMove = (e) => {
      const session = dragRef.current
      if (!session) return
      const dx = e.clientX - session.startX
      const dy = e.clientY - session.startY
      if (!session.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return

      if (!session.active) {
        session.active = true
        document.body.classList.add('pulse-dash-dragging')
      }

      ghostPosRef.current = {
        x: e.clientX - session.offsetX,
        y: e.clientY - session.offsetY,
      }
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(paintGhost)
      }

      const hit = hitIdFromPoint(visibleIdsRef.current, cardRefs, e.clientX, e.clientY)
      if (hit && hit !== session.fromId) {
        applyOrder(session.fromId, hit)
      }
    }

    const onUp = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      dragRef.current = null
      setGhost(null)
      document.body.classList.remove('pulse-dash-dragging')
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      document.body.classList.remove('pulse-dash-dragging')
    }
  }, [ghost?.id, applyOrder, paintGhost])

  const startCardDrag = (id, e) => {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const card = cardRefs.current.get(id)
    if (!card) return
    const rect = card.getBoundingClientRect()
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
    dragRef.current = {
      fromId: id,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      active: false,
    }
    // Seed ghost id so listeners attach; position appears after threshold.
    setGhost({
      id,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      x: rect.left,
      y: rect.top,
      pending: true,
    })
  }

  const refresh = useCallback(() => {
    setTick((n) => n + 1)
    soon('Refresh dashboard')
  }, [soon])

  const draggingId = ghost && !ghost.pending ? ghost.id : null
  const dragWidget = draggingId ? catalog[draggingId] : null

  const chip = (
    <div className="pulse-dash-chip" role="toolbar" aria-label="Dashboard tools">
      <Button
        type="text"
        className="pulse-dash-chip-btn"
        icon={<ReloadOutlined />}
        aria-label="Refresh"
        onClick={refresh}
      />
      <span className="pulse-dash-chip-divider" aria-hidden="true" />
      <Popover
        trigger="click"
        placement="bottomRight"
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        arrow={false}
        destroyTooltipOnHide
        getPopupContainer={() => document.body}
        overlayClassName="pulse-dash-customize-pop"
        content={
          <CustomizePanel
            prefs={prefs}
            setPrefs={setPrefs}
            onClose={() => setCustomizeOpen(false)}
          />
        }
      >
        <Button
          type="text"
          className={`pulse-dash-chip-btn${customizeOpen ? ' is-on' : ''}`}
          icon={<SlidersOutlined />}
          aria-label="Customize widgets"
          aria-expanded={customizeOpen}
        />
      </Popover>
    </div>
  )

  const [toolsHost, setToolsHost] = useState(null)
  useLayoutEffect(() => {
    setToolsHost(document.getElementById('pulse-dash-sub-tools'))
  })

  return (
    <div className={`pulse-dash${draggingId ? ' is-reordering' : ''}`} key={tick}>
      {toolsHost ? createPortal(chip, toolsHost) : null}

      <div className="pulse-dash-grid">
        {visibleWidgets.length === 0 ? (
          <div className="pulse-dash-card pulse-dash-card-empty-board">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No widgets enabled. Open Customize to turn some on."
            />
          </div>
        ) : (
          visibleWidgets.map((widget) => {
            const items = data[widget.dataKey] || []
            const isSlot = draggingId === widget.id
            return (
              <DashListWidget
                key={widget.id}
                title={widget.label}
                items={items}
                empty={widget.empty}
                addable={widget.addable}
                onAdd={() => soon(widget.label)}
                badgeCount={widget.badge ? items.length : undefined}
                showTotal={widget.showTotal}
                showAvatar={widget.showAvatar}
                scrollable={widget.scrollable}
                isPlaceholder={isSlot}
                placeholderHeight={ghost?.height}
                cardRef={(el) => {
                  if (el) cardRefs.current.set(widget.id, el)
                  else cardRefs.current.delete(widget.id)
                }}
                onGripPointerDown={(e) => startCardDrag(widget.id, e)}
              />
            )
          })
        )}
      </div>

      {draggingId && dragWidget && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="pulse-dash-ghost"
              style={{
                width: ghost.width,
                left: ghost.x,
                top: ghost.y,
              }}
            >
              <DashListWidget
                title={dragWidget.label}
                items={data[dragWidget.dataKey] || []}
                empty={dragWidget.empty}
                addable={dragWidget.addable}
                badgeCount={dragWidget.badge ? (data[dragWidget.dataKey] || []).length : undefined}
                showTotal={dragWidget.showTotal}
                showAvatar={dragWidget.showAvatar}
                scrollable={dragWidget.scrollable}
                floating
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

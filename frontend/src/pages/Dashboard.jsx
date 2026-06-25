import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, UserCheck, UserX, Calendar, ClipboardList, Clock,
  AlertTriangle, X, BarChart2
} from 'lucide-react'
import api from '../api'
import PageShell, { PageHeader, PageLoading } from '../components/PageShell'
import { useAuth } from '../context/AuthContext'
import { Modal, StatCard, Avatar } from '../components/UI'

// ── Helpers ────────────────────────────────────────────────────────
const LATE_START_HOUR = 10
const LATE_START_MINUTE = 30
const LATE_CUTOFF_HOUR = 11
const LATE_CUTOFF_MINUTE = 0

const fmtTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const getLateInfo = (punchIn) => {
  if (!punchIn) return { isLate: false, lateByMinutes: 0 }
  const d = new Date(punchIn)
  const minutesSinceMidnight = d.getHours() * 60 + d.getMinutes()
  const startMinutes = LATE_START_HOUR * 60 + LATE_START_MINUTE
  const cutoffMinutes = LATE_CUTOFF_HOUR * 60 + LATE_CUTOFF_MINUTE

  if (minutesSinceMidnight <= cutoffMinutes) {
    return { isLate: false, lateByMinutes: 0 }
  }
  return { isLate: true, lateByMinutes: Math.max(0, minutesSinceMidnight - startMinutes) }
}

const calcWorkedTime = (record, now) => {
  if (!record.punchIn) return '—'
  const start = new Date(record.punchIn)
  const end = record.punchOut ? new Date(record.punchOut) : now
  const diffMs = Math.max(0, end - start)
  const h = Math.floor(diffMs / 3600000)
  const m = Math.floor((diffMs % 3600000) / 60000)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

const fmtLateDuration = (mins) => {
  const total = Math.max(0, Number(mins) || 0)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const monthValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const parseMonthValue = (value) => {
  const [year, month] = String(value || '').split('-').map(Number)
  const now = new Date()
  return {
    year: Number.isFinite(year) ? year : now.getFullYear(),
    month: Number.isFinite(month) ? month : now.getMonth() + 1,
  }
}

const shiftMonthValue = (value, delta) => {
  const { year, month } = parseMonthValue(value)
  return monthValue(new Date(year, month - 1 + delta, 1))
}

const formatHours = (hours) => {
  const safe = Math.max(0, Number(hours) || 0)
  return safe >= 100 ? `${safe.toFixed(0)}h` : `${safe.toFixed(1)}h`
}

const buildMonthOptions = (count = 18) => {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: monthValue(date),
      label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
    }
  })
}

// ── Attention Required (3-up cards) ───────────────────────────────
const AttentionRequired = ({ leaveToday, pendingLeaveCount, absentCount, onViewLeave, onViewPending, onViewAbsent }) => {
  const cards = [
    { title: 'Absent Today', value: absentCount, icon: UserX, color: '#b91c1c', onClick: onViewAbsent },
    { title: 'Employees on Leave', value: leaveToday, icon: Calendar, color: '#1d4ed8', onClick: onViewLeave },
    { title: 'Pending Leave Requests', value: pendingLeaveCount, icon: AlertTriangle, color: '#c2410c', onClick: onViewPending },
  ]

  return (
    <div className="panel" style={{ height: 'auto', minHeight: 350 }}>
      <div className="panel-head" style={{ borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={17} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Attention Required</span>
        </div>
      </div>
      <div className="form-grid-3" style={{ padding: '0 var(--space-6) var(--space-6)' }}>
        {cards.map(card => {
          const Icon = card.icon
          return (
            <button
              key={card.title}
              onClick={card.onClick}
              className="btn-hover"
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--surface)',
                padding: 'var(--space-5) var(--space-6)',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 128,
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="stat-icon" style={{ background: `${card.color}15`, color: card.color, width: 32, height: 32 }}>
                  <Icon size={16} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                  {card.title}
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', marginTop: 12 }}>
                {card.value}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Punch Row (used in modals) ─────────────────────────────────────
const PunchRow = ({ name, designation, meta, badge, bg, color }) => (
  <div className="punch-row">
    <Avatar name={name} style={{ background: bg, color }} />
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{meta}</div>
      {designation && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{designation}</div>}
    </div>
    {badge}
  </div>
)

// ── Attendance Row (used in main panel + modal) ───────────────────
const AttendanceRow = ({ record, now }) => {
  const { isLate: late, lateByMinutes } = getLateInfo(record.punchIn)
  const active = !record.punchOut
  const worked = calcWorkedTime(record, now)
  const avatarBg = late ? '#fff7ed' : active ? '#eff6ff' : '#f1f5f9'
  const avatarColor = late ? '#c2410c' : active ? '#1d4ed8' : '#475569'

  return (
    <div className="att-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <Avatar name={record.staff?.fullName} style={{ background: avatarBg, color: avatarColor, width: 32, height: 32, fontSize: 12 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.staff?.fullName || 'Unknown'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{record.staff?.designation || 'Team Member'}</div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: late ? '#c2410c' : 'var(--text)' }}>
        {fmtTime(record.punchIn)}
        {late && <div style={{ fontSize: 10, color: '#c2410c', fontWeight: 500 }}>Late by {fmtLateDuration(lateByMinutes)}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {worked}
        {active && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#636B2F' }} />}
      </div>
      <span className={`pill ${active ? 'pill-blue' : late ? 'pill-orange' : 'pill-green'}`}>
        {active ? 'Active' : late ? 'Late' : 'On Time'}
      </span>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [staffData, setStaffData] = useState([])
  const [activeCount, setActiveCount] = useState(0)
  const [todayPunchins, setTodayPunchins] = useState([])
  const [approvedLeaves, setApprovedLeaves] = useState([])
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [now, setNow] = useState(new Date())
  const [showNotActiveModal, setShowNotActiveModal] = useState(false)
  const [showAllAttendance, setShowAllAttendance] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showActiveModal, setShowActiveModal] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [attendanceMonth, setAttendanceMonth] = useState(() => monthValue(new Date()))
  const [monthlyAttendance, setMonthlyAttendance] = useState([])
  const [previousMonthlyAttendance, setPreviousMonthlyAttendance] = useState([])
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlyError, setMonthlyError] = useState('')

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // Pull all the parallel fetches into a stable callback so the effect's
  // dependency array stays minimal and we don't refetch on every render.
  const fetchData = useCallback(async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      setLoading(true)
      setLoadError('')
      // Note: the GET cache + dedup in api.js means a rapid second mount
      // (e.g. StrictMode) won't trigger 5 more network calls.
      const requests = await Promise.allSettled([
        api.get('/staff', { signal: controller.signal }),
        api.get('/attendance/admin/active', { signal: controller.signal }),
        api.get('/attendance/admin/today-punchins', { signal: controller.signal }),
        api.get('/leaves/admin/pending', { params: { status: 'Approved' }, signal: controller.signal }),
        api.get('/leaves/admin/pending', { params: { status: 'Pending' }, signal: controller.signal })
      ])
      const [staffRes, activeRes, punchinsRes, approvedLeaveRes, pendingLeaveRes] = requests

      if (staffRes.status === 'fulfilled') setStaffData(staffRes.value.data.data || [])
      if (activeRes.status === 'fulfilled') setActiveCount(activeRes.value.data?.activeCount || 0)
      if (punchinsRes.status === 'fulfilled') setTodayPunchins(punchinsRes.value.data?.data || [])
      if (approvedLeaveRes.status === 'fulfilled') setApprovedLeaves(approvedLeaveRes.value.data?.data || [])
      if (pendingLeaveRes.status === 'fulfilled') setPendingLeaves(pendingLeaveRes.value.data?.data || [])

      const firstError = requests.find((result) => result.status === 'rejected')
      const allFailed = requests.every((result) => result.status === 'rejected')
      if (firstError && allFailed) {
        setLoadError(firstError.reason?.message || 'Some dashboard data could not be loaded.')
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
      setLoadError(
        err.name === 'CanceledError' || err.message === 'canceled'
          ? 'Dashboard data request timed out. Please check backend and MongoDB Atlas connection.'
          : err.message || 'Dashboard data could not be loaded.'
      )
    } finally {
      clearTimeout(timer)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const controller = new AbortController()
    const fetchMonthlyAttendance = async () => {
      const { month, year } = parseMonthValue(attendanceMonth)
      const previous = parseMonthValue(shiftMonthValue(attendanceMonth, -1))

      try {
        setMonthlyLoading(true)
        setMonthlyError('')
        const [currentRes, previousRes] = await Promise.all([
          api.get('/attendance/admin/monthly', {
            params: { month, year },
            signal: controller.signal,
          }),
          api.get('/attendance/admin/monthly', {
            params: { month: previous.month, year: previous.year },
            signal: controller.signal,
          }),
        ])
        setMonthlyAttendance(currentRes.data?.data || [])
        setPreviousMonthlyAttendance(previousRes.data?.data || [])
      } catch (err) {
        if (err.name === 'CanceledError' || err.message === 'canceled') return
        console.error('Monthly attendance overview error:', err)
        setMonthlyError(err.response?.data?.message || err.message || 'Monthly attendance could not be loaded.')
        setMonthlyAttendance([])
        setPreviousMonthlyAttendance([])
      } finally {
        setMonthlyLoading(false)
      }
    }

    fetchMonthlyAttendance()
    return () => controller.abort()
  }, [attendanceMonth])

  // ── Compute Stats (memoized) ────────────────────────────────────
  // All these derived values previously recomputed on every render
  // (timer tick, modal open/close, etc.). Wrapping them in useMemo
  // keyed on the underlying inputs keeps them stable.
  // NOTE: useMemo must be called UNCONDITIONALLY on every render — it
  // must be declared BEFORE any early `return` so the hooks count stays
  // stable between the loading-state render and the data-loaded render.
  const stats = useMemo(() => {
    const totalEmployees = staffData.length
    const safeActive = Math.min(Math.max(activeCount, 0), totalEmployees)
    const totalPresentToday = todayPunchins.length

    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
    const isLeaveOverlappingToday = (leave) => {
      const start = new Date(leave.startDate)
      const end = new Date(leave.endDate)
      return start <= endOfToday && end >= startOfToday
    }
    const approvedOnLeaveToday = approvedLeaves.filter(isLeaveOverlappingToday)
    const onLeave = approvedOnLeaveToday.length

    const latePunchins = todayPunchins.filter(r => getLateInfo(r.punchIn).isLate)
    const validPunchins = todayPunchins.filter(r => r.punchIn)
    const punchedInStaffIds = new Set(todayPunchins.map(r => String(r.staff?._id || '')))
    const notActiveStaff = staffData.filter(s => !punchedInStaffIds.has(String(s._id)))
    const notActiveCount = notActiveStaff.length

    return {
      totalEmployees,
      safeActive,
      totalPresentToday,
      onLeave,
      latePunchins,
      validPunchins,
      notActiveStaff,
      notActiveCount,
      approvedOnLeaveToday,
    }
  }, [staffData, activeCount, todayPunchins, approvedLeaves])

  // Sorting the punch-in list used to allocate a new array + sort on every
  // render. Memoize so the modals opening don't re-sort.
  // NOTE: declared at top-level (before any early return) so the hooks
  // count stays stable across renders. Previously this lived AFTER the
  // `if (loading) return …` line which caused the
  // "Rendered more hooks than during the previous render" error.
  const sortedAttendance = useMemo(() => {
    return [...todayPunchins].sort((a, b) => {
      const aLate = getLateInfo(a.punchIn).isLate ? 1 : 0
      const bLate = getLateInfo(b.punchIn).isLate ? 1 : 0
      if (aLate !== bLate) return bLate - aLate
      const aActive = !a.punchOut ? 1 : 0
      const bActive = !b.punchOut ? 1 : 0
      if (aActive !== bActive) return bActive - aActive
      return new Date(b.punchIn) - new Date(a.punchIn)
    })
  }, [todayPunchins])
  const activeAttendance = useMemo(() => sortedAttendance.filter((r) => !r.punchOut), [sortedAttendance])

  // Computed inside useMemo (no hook) so it stays stable across renders.
  const avgLoginTime = useMemo(() => {
    if (!stats.validPunchins.length) return null
    const avgSec = stats.validPunchins.reduce((sum, r) => {
      const d = new Date(r.punchIn)
      return sum + d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
    }, 0) / stats.validPunchins.length
    const h = Math.floor(avgSec / 3600)
    const m = Math.floor((avgSec % 3600) / 60)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
  }, [stats.validPunchins])

  const monthOptions = useMemo(() => buildMonthOptions(18), [])

  const monthlyOverview = useMemo(() => {
    const { month, year } = parseMonthValue(attendanceMonth)
    const daysInMonth = new Date(year, month, 0).getDate()
    const today = new Date()
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
    const elapsedDays = isCurrentMonth ? today.getDate() : daysInMonth

    const createDays = () => Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      label: `${i + 1} ${MONTH_NAMES[month - 1].slice(0, 3)}`,
      present: 0,
      hours: 0,
      full: 0,
      half: 0,
      lop: 0,
      active: 0,
      late: 0,
    }))

    const days = createDays()
    const staffIds = new Set()
    let totalHours = 0
    let fullDays = 0
    let halfDays = 0
    let lopDays = 0
    let activeDays = 0
    let lateCount = 0

    monthlyAttendance.forEach((record) => {
      const date = new Date(record.date)
      const day = date.getUTCDate()
      const bucket = days[day - 1]
      if (!bucket) return

      const workedHours = record.punchIn && !record.punchOut
        ? Math.max(0, (now.getTime() - new Date(record.punchIn).getTime()) / 3600000)
        : Number(record.totalHours) || 0
      const workStatus = record.punchOut ? record.workStatus : 'Active'
      const isLate = getLateInfo(record.punchIn).isLate

      bucket.present += 1
      bucket.hours += workedHours
      if (workStatus === 'Full Day') bucket.full += 1
      if (workStatus === 'Half Day') bucket.half += 1
      if (workStatus === 'LOP') bucket.lop += 1
      if (workStatus === 'Active') bucket.active += 1
      if (isLate) bucket.late += 1

      totalHours += workedHours
      if (workStatus === 'Full Day') fullDays += 1
      if (workStatus === 'Half Day') halfDays += 1
      if (workStatus === 'LOP') lopDays += 1
      if (workStatus === 'Active') activeDays += 1
      if (isLate) lateCount += 1
      if (record.staff?._id) staffIds.add(String(record.staff._id))
    })

    const previousPresent = previousMonthlyAttendance.length
    const present = monthlyAttendance.length
    const trend = previousPresent
      ? ((present - previousPresent) / previousPresent) * 100
      : present > 0 ? 100 : 0
    const maxPresent = Math.max(1, ...days.map(day => day.present))
    const maxHours = Math.max(1, ...days.map(day => day.hours))
    const peakDay = days.reduce((best, day) => day.present > best.present ? day : best, days[0])

    return {
      month,
      year,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      days,
      elapsedDays,
      present,
      previousPresent,
      trend,
      maxPresent,
      maxHours,
      totalHours,
      avgPresentPerDay: present ? present / elapsedDays : 0,
      staffCount: staffIds.size,
      fullDays,
      halfDays,
      lopDays,
      activeDays,
      lateCount,
      peakDay,
    }
  }, [attendanceMonth, monthlyAttendance, previousMonthlyAttendance, now])

  if (loading) return <PageLoading label="Loading dashboard…" />

  if (loadError) {
    return (
      <PageShell>
        <div className="panel" style={{ padding: 24, maxWidth: 760 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertTriangle size={20} color="#c2410c" />
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>Dashboard data not loaded</h2>
          </div>
          <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: 14 }}>
            {loadError}
          </p>
          <button type="button" className="btn btn-primary" onClick={fetchData}>
            Retry
          </button>
        </div>
      </PageShell>
    )
  }

  const { totalEmployees, safeActive, totalPresentToday, onLeave, latePunchins, notActiveStaff, notActiveCount, approvedOnLeaveToday } = stats
  const monthlyTrendPositive = monthlyOverview.trend >= 0
  const monthlyTrendLabel = monthlyOverview.previousPresent === 0 && monthlyOverview.present === 0
    ? '0%'
    : `${monthlyTrendPositive ? '+' : ''}${monthlyOverview.trend.toFixed(1)}%`

  return (
    <PageShell>
      {/* ── Welcome Greeting ── */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.02em' }}>
          Welcome back, {user?.companyName || 'BDA'}! 👋
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Here's an overview of your payroll dashboard.
        </p>
      </div>

      {/* ── Stat Row ─────────────────────────────────────────────── */}
      <div className="stat-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard
          icon={Users} label="Total Employees" value={totalEmployees}
          trend="All registered team members" color="var(--primary)"
          onClick={() => navigate('/staff')}
        />
        <StatCard
          icon={UserCheck} label="Active Today" value={safeActive}
          trend="Currently punched in" color="#1d4ed8"
          onClick={() => setShowActiveModal(true)}
        />
        <StatCard
          icon={Calendar} label="On Leave Today" value={onLeave}
          trend="Approved leave today" color="#d97706"
          onClick={() => setShowLeaveModal(true)}
        />
        <StatCard
          icon={UserX} label="Not Active" value={notActiveCount}
          trend="Not punched in today" color="#b91c1c"
          onClick={() => setShowNotActiveModal(true)}
        />
      </div>

      {/* ── Middle Row ───────────────────────────────────────────── */}
      <div className="form-grid-2" style={{ marginBottom: 'var(--space-6)', alignItems: 'stretch' }}>
        <AttentionRequired
          leaveToday={onLeave}
          pendingLeaveCount={pendingLeaves.length}
          absentCount={notActiveCount}
          onViewLeave={() => setShowLeaveModal(true)}
          onViewPending={() => navigate('/leave-requests')}
          onViewAbsent={() => setShowNotActiveModal(true)}
        />

        {/* Recent Punch-In */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={17} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Recent Punch-In</span>
              {latePunchins.length > 0 && (
                <span className="pill pill-orange">
                  <AlertTriangle size={10} />
                  {latePunchins.length} late
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{todayPunchins.length} present</span>
              <button
                onClick={() => setShowAllAttendance(true)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: 0 }}
              >
                View all →
              </button>
            </div>
          </div>

          {avgLoginTime && (
            <div className="panel-subhead" style={{ padding: '6px 20px' }}>
              <Clock size={12} color="var(--text-muted)" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Avg login: <strong style={{ color: 'var(--text)' }}>{avgLoginTime}</strong>
              </span>
            </div>
          )}

          <div className="att-table-head" style={{ padding: '8px 20px' }}>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Login</div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Worked</div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
          </div>

          <div className="scroll-list" style={{ flex: 1, maxHeight: 220, minHeight: 160 }}>
            {sortedAttendance.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div className="stat-icon" style={{ width: 40, height: 40, marginBottom: 10 }}>
                  <ClipboardList size={18} color="var(--text-light)" />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>No punch-ins recorded today.</div>
              </div>
            ) : sortedAttendance.map(record => <AttendanceRow key={record._id} record={record} now={now} />)}
          </div>

          {sortedAttendance.length > 0 && (
            <div style={{ padding: '8px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Present: <strong style={{ color: 'var(--text)' }}>{totalPresentToday}</strong></span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active: <strong style={{ color: '#1d4ed8' }}>{safeActive}</strong></span>
              {latePunchins.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Late: <strong style={{ color: '#c2410c' }}>{latePunchins.length}</strong></span>
              )}
            </div>
          )}
        </div>
      </div>


      {/* ── Modals ── */}
      <Modal
        open={showAllAttendance}
        onClose={() => setShowAllAttendance(false)}
        title={`All Punch-Ins · ${sortedAttendance.length} total`}
        size="lg"
      >
        <div className="att-table-head" style={{ padding: '8px 16px' }}>
          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Employee</div>
          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Login</div>
          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Worked</div>
          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Status</div>
        </div>
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {sortedAttendance.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No punch-ins recorded today.</div>
          ) : sortedAttendance.map(record => <AttendanceRow key={`m-${record._id}`} record={record} now={now} />)}
        </div>
      </Modal>

      <Modal
        open={showNotActiveModal}
        onClose={() => setShowNotActiveModal(false)}
        title="Not Active & Late Team"
        size="md"
      >
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not Active: <strong style={{ color: '#b91c1c' }}>{notActiveCount}</strong></span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Late Punch-In: <strong style={{ color: '#c2410c' }}>{latePunchins.length}</strong></span>
        </div>
        <div style={{ maxHeight: 480, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '0 20px 8px', fontSize: 12, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>Not Punched In Today</div>
          {notActiveStaff.length === 0 ? (
            <div style={{ padding: '0 20px 14px', fontSize: 13, color: 'var(--text-muted)' }}>All team members have punched in today.</div>
          ) : notActiveStaff.map(person => (
            <PunchRow
              key={person._id}
              name={person.fullName}
              designation={person.designation || 'Team Member'}
              meta={person.employeeId ? `${person.designation || 'Team Member'} · ${person.employeeId}` : (person.designation || 'Team Member')}
              bg="#fef2f2" color="#b91c1c"
            />
          ))}
          <div style={{ padding: '12px 20px 8px', fontSize: 12, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', borderTop: '1px solid var(--border)' }}>Late Punch-In Only</div>
          {latePunchins.length === 0 ? (
            <div style={{ padding: '0 20px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No late punch-ins today.</div>
          ) : latePunchins.map(record => {
            const { lateByMinutes } = getLateInfo(record.punchIn)
            return (
              <PunchRow
                key={record._id}
                name={record.staff?.fullName || 'Unknown'}
                meta={`${fmtTime(record.punchIn)} · Late by ${fmtLateDuration(lateByMinutes)}`}
                bg="#fff7ed" color="#c2410c"
                badge={<span className="pill pill-orange">Late</span>}
              />
            )
          })}
        </div>
      </Modal>

      <Modal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Leave Requests Overview"
        size="md"
      >
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Approved (Today): <strong style={{ color: '#636B2F' }}>{approvedOnLeaveToday.length}</strong></span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pending Approval: <strong style={{ color: '#c2410c' }}>{pendingLeaves.length}</strong></span>
        </div>
        <div style={{ maxHeight: 480, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '0 20px 8px', fontSize: 12, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>Pending Approval</div>
          {pendingLeaves.length === 0 ? (
            <div style={{ padding: '0 20px 14px', fontSize: 13, color: 'var(--text-muted)' }}>No pending leave requests.</div>
          ) : pendingLeaves.map((leave) => (
            <PunchRow
              key={leave._id}
              name={leave.staff?.fullName || 'Unknown'}
              meta={`${leave.type || 'Leave'} · ${new Date(leave.startDate).toLocaleDateString('en-GB')} to ${new Date(leave.endDate).toLocaleDateString('en-GB')}`}
              bg="#fff7ed" color="#c2410c"
              badge={<span className="pill pill-orange">Pending</span>}
            />
          ))}
          <div style={{ padding: '12px 20px 8px', fontSize: 12, fontWeight: 700, color: '#636B2F', textTransform: 'uppercase', borderTop: '1px solid var(--border)' }}>Approved Leave Requests</div>
          {approvedOnLeaveToday.length === 0 ? (
            <div style={{ padding: '0 20px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No approved leaves for today.</div>
          ) : approvedOnLeaveToday.map((leave) => (
            <div key={leave._id} className="punch-row">
              <Avatar name={leave.staff?.fullName} style={{ background: '#e5ebdd', color: '#636B2F' }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {leave.staff?.fullName || 'Unknown'} {leave.staff?.employeeId ? `· ${leave.staff.employeeId}` : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {leave.type || 'Leave'} · {new Date(leave.startDate).toLocaleDateString('en-GB')} to {new Date(leave.endDate).toLocaleDateString('en-GB')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 2 }}>Reason: {leave.reason || 'No reason provided'}</div>
              </div>
              <span className="pill pill-green">Approved</span>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={showActiveModal}
        onClose={() => setShowActiveModal(false)}
        title="Active Team Today"
        size="md"
      >
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active Count: <strong style={{ color: '#1d4ed8' }}>{activeAttendance.length}</strong></span>
        </div>
        <div style={{ maxHeight: 480, overflowY: 'auto', padding: '8px 0' }}>
          {activeAttendance.length === 0 ? (
            <div style={{ padding: 20, fontSize: 13, color: 'var(--text-muted)' }}>No active team members right now.</div>
          ) : activeAttendance.map((record) => (
            <PunchRow
              key={record._id}
              name={`${record.staff?.fullName || 'Unknown'} ${record.staff?.employeeId ? `· ${record.staff.employeeId}` : ''}`}
              meta={`Punch-In: ${fmtTime(record.punchIn)}`}
              bg="#eff6ff" color="#1d4ed8"
              badge={<span className="pill pill-blue">{calcWorkedTime(record, now)}</span>}
            />
          ))}
        </div>
      </Modal>
    </PageShell>
  )
}

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, UserCheck, UserX, Calendar, ClipboardList, Clock,
  AlertTriangle, TrendingUp, X
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
        {active && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />}
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

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staffRes, activeRes, punchinsRes, approvedLeaveRes, pendingLeaveRes] = await Promise.all([
          api.get('/staff'),
          api.get('/attendance/admin/active'),
          api.get('/attendance/admin/today-punchins'),
          api.get('/leaves/admin/pending', { params: { status: 'Approved' } }),
          api.get('/leaves/admin/pending', { params: { status: 'Pending' } })
        ])
        setStaffData(staffRes.data.data || [])
        setActiveCount(activeRes.data?.activeCount || 0)
        setTodayPunchins(punchinsRes.data?.data || [])
        setApprovedLeaves(approvedLeaveRes.data?.data || [])
        setPendingLeaves(pendingLeaveRes.data?.data || [])
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <PageLoading label="Loading dashboard…" />

  // ── Compute Stats ────────────────────────────────────────────────
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

  const avgLoginTime = (() => {
    if (!validPunchins.length) return null
    const avgSec = validPunchins.reduce((sum, r) => {
      const d = new Date(r.punchIn)
      return sum + d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
    }, 0) / validPunchins.length
    const h = Math.floor(avgSec / 3600)
    const m = Math.floor((avgSec % 3600) / 60)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
  })()

  const sortedAttendance = [...todayPunchins].sort((a, b) => {
    const aLate = getLateInfo(a.punchIn).isLate ? 1 : 0
    const bLate = getLateInfo(b.punchIn).isLate ? 1 : 0
    if (aLate !== bLate) return bLate - aLate
    const aActive = !a.punchOut ? 1 : 0
    const bActive = !b.punchOut ? 1 : 0
    if (aActive !== bActive) return bActive - aActive
    return new Date(b.punchIn) - new Date(a.punchIn)
  })
  const activeAttendance = sortedAttendance.filter((r) => !r.punchOut)

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
      <div className="form-grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        <AttentionRequired
          leaveToday={onLeave}
          pendingLeaveCount={pendingLeaves.length}
          absentCount={notActiveCount}
          onViewLeave={() => setShowLeaveModal(true)}
          onViewPending={() => navigate('/leave-requests')}
          onViewAbsent={() => setShowNotActiveModal(true)}
        />

        {/* Attendance Overview */}
        <div className="panel" style={{ height: 350, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ClipboardList size={17} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Recent Punch-In</span>
              {latePunchins.length > 0 && (
                <span className="pill pill-orange">
                  <AlertTriangle size={10} />
                  {latePunchins.length} late
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{todayPunchins.length} present today</span>
              <button
                onClick={() => setShowAllAttendance(true)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >
                View all →
              </button>
            </div>
          </div>

          {avgLoginTime && (
            <div className="panel-subhead" style={{ padding: '8px 20px' }}>
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

          <div className="scroll-list" style={{ maxHeight: 186, minHeight: 186, flex: 1 }}>
            {sortedAttendance.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                <div className="stat-icon" style={{ width: 44, height: 44, marginBottom: 12 }}>
                  <ClipboardList size={20} color="var(--text-light)" />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>No punch-ins recorded today.</div>
              </div>
            ) : sortedAttendance.map(record => <AttendanceRow key={record._id} record={record} now={now} />)}
          </div>

          {sortedAttendance.length > 0 && (
            <div style={{ padding: '8px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Present: <strong style={{ color: 'var(--text)' }}>{totalPresentToday}</strong></span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active: <strong style={{ color: '#1d4ed8' }}>{safeActive}</strong></span>
              {latePunchins.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Late: <strong style={{ color: '#c2410c' }}>{latePunchins.length}</strong></span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Monthly Attendance Chart ────────────────── */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div className="panel" style={{ padding: 'var(--space-5) var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <TrendingUp size={16} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Monthly Attendance Overview</span>
              <span className="pill pill-green">+8.4%</span>
            </div>
            <select className="input-field" style={{ padding: '4px 8px', fontSize: 11, fontWeight: 600, width: 'auto' }}>
              <option value="june_2026">June 2026</option>
            </select>
          </div>

          <div style={{ width: '100%', height: 240, position: 'relative' }}>
            <svg viewBox="0 0 800 220" width="100%" height="100%" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
                <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="var(--primary)" floodOpacity="0.2" />
                </filter>
              </defs>

              {[0, 2, 4, 6, 8, 10].map((val) => {
                const y = 20 + 160 * (1 - val / 10)
                return (
                  <g key={val}>
                    <text x="12" y={y + 4} fill="var(--text-muted)" fontSize="10.5" fontWeight="600" textAnchor="end">{val}</text>
                    {val > 0 && <line x1="25" y1={y} x2="785" y2={y} stroke="var(--border)" strokeWidth="0.5" opacity="0.6" strokeDasharray="3,3" />}
                    {val === 0 && <line x1="25" y1={y} x2="785" y2={y} stroke="var(--border)" strokeWidth="1" opacity="0.8" />}
                  </g>
                )
              })}

              {[
                { label: '1 Jun', x: 25 }, { label: '5 Jun', x: 151 }, { label: '10 Jun', x: 278 },
                { label: '15 Jun', x: 405 }, { label: '20 Jun', x: 531 }, { label: '25 Jun', x: 658 }, { label: '30 Jun', x: 785 }
              ].map((tick, i) => (
                <text key={i} x={tick.x} y="205" fill="var(--text-muted)" fontSize="10.5" fontWeight="600" textAnchor="middle">{tick.label}</text>
              ))}

              <path d="M 25,84 C 88,84 88,52 151,52 C 214,52 214,84 278,84 C 341.5,84 341.5,120 405,120 C 468.5,120 468.5,68 531,68 C 594.5,68 594.5,100 658,100 C 721.5,100 721.5,36 785,36 L 785,180 L 25,180 Z" fill="url(#chart-grad)" />
              <path d="M 25,84 C 88,84 88,52 151,52 C 214,52 214,84 278,84 C 341.5,84 341.5,120 405,120 C 468.5,120 468.5,68 531,68 C 594.5,68 594.5,100 658,100 C 721.5,100 721.5,36 785,36"
                fill="none" stroke="var(--primary)" strokeWidth="3" filter="url(#glow)" strokeLinecap="round" strokeLinejoin="round" />

              {[
                { x: 25, y: 84 }, { x: 151, y: 52 }, { x: 278, y: 84 }, { x: 405, y: 120 },
                { x: 531, y: 68 }, { x: 658, y: 100 }, { x: 785, y: 36 }
              ].map((pt, i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="var(--primary)" stroke="var(--surface)" strokeWidth="2" />
              ))}
            </svg>
          </div>
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
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Approved (Today): <strong style={{ color: '#15803d' }}>{approvedOnLeaveToday.length}</strong></span>
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
          <div style={{ padding: '12px 20px 8px', fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', borderTop: '1px solid var(--border)' }}>Approved Leave Requests</div>
          {approvedOnLeaveToday.length === 0 ? (
            <div style={{ padding: '0 20px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No approved leaves for today.</div>
          ) : approvedOnLeaveToday.map((leave) => (
            <div key={leave._id} className="punch-row">
              <Avatar name={leave.staff?.fullName} style={{ background: '#f0fdf4', color: '#15803d' }} />
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
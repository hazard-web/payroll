import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Users, UserCheck, UserX, Calendar, ClipboardList, Clock,
  AlertTriangle, X, BarChart2, Eye, Loader2, TrendingUp, ChevronDown, CheckCircle2, Clock3, AlertCircle, Megaphone, Plus, MoreHorizontal, MoreVertical
} from 'lucide-react'
import api from '../api'
import PageShell, { PageHeader, PageLoading } from '../components/PageShell'
import { useAuth } from '../context/AuthContext'
import { Modal, StatCard, Avatar, Badge } from '../components/UI'
import AnnouncementPreviewWidget from '../components/AnnouncementPreviewWidget'

// ── Helpers ────────────────────────────────────────────────────────
const LATE_START_HOUR = 10
const LATE_START_MINUTE = 30
const LATE_CUTOFF_HOUR = 11
const LATE_CUTOFF_MINUTE = 0
const OFFICE_OPEN_HOUR = 10
const OFFICE_OPEN_MIN = 30

const fmtTime = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}



const calcWorkedTime = (record, now) => {
  if (!record) return '—'
  if (!record.sessions || !Array.isArray(record.sessions) || record.sessions.length === 0) {
    if (!record.punchIn) return '—'
    const start = new Date(record.punchIn)
    const end = record.punchOut ? new Date(record.punchOut) : now
    const diffMs = Math.max(0, end - start)
    const h = Math.floor(diffMs / 3600000)
    const m = Math.floor((diffMs % 3600000) / 60000)
    return `${h}h ${String(m).padStart(2, '0')}m`
  }
  let totalMs = 0
  record.sessions.forEach(session => {
    if (session) {
      const start = new Date(session.startTime)
      const end = session.endTime ? new Date(session.endTime) : (session.isActive ? now : null)
      if (start && end) {
        totalMs += Math.max(0, end.getTime() - start.getTime())
      }
    }
  })
  const h = Math.floor(totalMs / 3600000)
  const m = Math.floor((totalMs % 3600000) / 60000)
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

// ── Attention Required (Unified Table representation) ───────────────
const AttentionRequired = ({ notActiveStaff = [], approvedOnLeaveToday = [], pendingLeaves = [], fetchData }) => {
  const navigate = useNavigate()
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [composer, setComposer] = useState({
    open: false,
    type: 'email', // 'email' or 'notify'
    subject: '',
    body: '',
    recipientName: '',
    recipientId: ''
  })

  const openComposer = (item, actionType) => {
    setOpenDropdownId(null)
    const staff = item.staff || {}
    const startStr = item.startDate ? new Date(item.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
    const endStr = item.endDate ? new Date(item.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
    
    let subject = ''
    let body = ''
    
    if (actionType === 'email') {
      if (item.type === 'absent') {
        subject = `Absence Notice - ${staff.fullName || 'Employee'}`
        body = `Hello ${staff.fullName || 'Team Member'},\n\nWe noticed that you have not punched in for today's shift yet. Please update your status or register your attendance on the portal.\n\nBest regards,\nHR Team`
      } else if (item.type === 'pending') {
        subject = `Leave Request Review Update`
        body = `Hello ${staff.fullName || 'Team Member'},\n\nThis is to notify you that your leave request from ${startStr} to ${endStr} is currently under review. We will update you shortly.\n\nBest regards,\nHR Team`
      } else {
        subject = `On Leave Today Notification`
        body = `Hello ${staff.fullName || 'Team Member'},\n\nHope you have a good day off today. Please ensure all tasks are handed over correctly.\n\nBest regards,\nHR Team`
      }
    } else {
      if (item.type === 'absent') {
        body = `Please punch in today's attendance session as soon as possible.`
      } else if (item.type === 'pending') {
        body = `Your leave request from ${startStr} to ${endStr} is under review.`
      } else {
        body = `You are marked as On Leave today. Enjoy your day off!`
      }
    }

    setComposer({
      open: true,
      type: actionType,
      subject,
      body,
      recipientName: staff.fullName || 'Employee',
      recipientId: staff._id
    })
  }

  const handleLeaveAction = async (id, status) => {
    try {
      const res = await api.post('/leaves/admin/respond', { id, status, adminNotes: 'Responded via Dashboard Widget' })
      if (res.data.success) {
        toast.success(`Leave request ${status.toLowerCase()} successfully!`)
        if (fetchData) fetchData()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update leave request')
    }
  }

  // Combine all items into a single list
  const attentionItems = useMemo(() => {
    const items = []

    // 1. Pending leave requests first (needs action)
    pendingLeaves.forEach(leave => {
      items.push({
        id: leave._id,
        type: 'pending',
        staff: leave.staff,
        leaveType: leave.type,
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason,
      })
    })

    // 2. Employees on leave today
    approvedOnLeaveToday.forEach(leave => {
      items.push({
        id: leave._id,
        type: 'leave',
        staff: leave.staff,
        leaveType: leave.type,
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason,
      })
    })

    // 3. Absent today
    notActiveStaff.forEach(staff => {
      items.push({
        id: staff._id,
        type: 'absent',
        staff: staff,
        employeeId: staff.employeeId,
      })
    })

    return items
  }, [pendingLeaves, approvedOnLeaveToday, notActiveStaff])

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 350 }}>
      <div className="panel-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Attention Required</span>
      </div>

      <div style={{ padding: '10px 20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.6fr 60px', gap: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</div>
        <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type & Status</div>
        <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details / Reason</div>
        <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</div>
      </div>

      <div className="scroll-list" style={{ flex: 1, maxHeight: 270, minHeight: 160, overflowY: 'auto' }}>
        {attentionItems.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--text-muted)', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>No attention items today. All clear!</div>
          </div>
        ) : attentionItems.map(item => {
          const staff = item.staff || {}
          const startStr = item.startDate ? new Date(item.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
          const endStr = item.endDate ? new Date(item.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''

          return (
            <div key={item.id} style={{ padding: '10px 20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.6fr 60px', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              {/* Employee */}
              <div
                onClick={() => staff._id && navigate(`/staff/${staff._id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, cursor: 'pointer' }}
                title="View employee profile"
              >
                <Avatar name={staff.fullName} style={{ width: 28, height: 28, fontSize: 11 }} />
                <div style={{ minWidth: 0 }}>
                  <div className="hover-primary" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
                    {staff.fullName || 'Unknown'}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {item.type === 'pending' && (
                  <span style={{
                    background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d',
                    padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase'
                  }}>
                    Pending Request
                  </span>
                )}
                {item.type === 'leave' && (
                  <span style={{
                    background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd',
                    padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase'
                  }}>
                    On Leave
                  </span>
                )}
                {item.type === 'absent' && (
                  <span style={{
                    background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5',
                    padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase'
                  }}>
                    Absent
                  </span>
                )}
              </div>

              {/* Details / Reason */}
              <div style={{ minWidth: 0 }}>
                {item.type === 'absent' ? (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Not active today</span>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                      {item.leaveType} ({startStr} - {endStr})
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.reason}>
                      {item.reason}
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenDropdownId(openDropdownId === item.id ? null : item.id)
                  }}
                  className="btn-icon btn-hover"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    color: 'var(--text-light)',
                    background: 'transparent',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Actions"
                >
                  <MoreVertical size={14} />
                </button>

                {openDropdownId === item.id && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                      onClick={() => setOpenDropdownId(null)}
                    />
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: 28,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      zIndex: 101,
                      minWidth: '130px',
                      overflow: 'hidden',
                      padding: '4px 0'
                    }}>
                      <button
                        onClick={() => openComposer(item, 'notify')}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'background 0.15s'
                        }}
                      >
                        🔔 Notify
                      </button>
                      <button
                        onClick={() => openComposer(item, 'email')}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'background 0.15s'
                        }}
                      >
                        📧 Send Email
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Composer Modal */}
      <Modal
        open={composer.open}
        onClose={() => setComposer(prev => ({ ...prev, open: false }))}
        title={composer.type === 'email' ? `Send Email to ${composer.recipientName}` : `Send Notification to ${composer.recipientName}`}
        size="md"
      >
        <div style={{ padding: '0 20px 20px', fontFamily: 'var(--font-display), sans-serif' }}>
          {composer.type === 'email' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Subject</label>
              <input
                type="text"
                value={composer.subject}
                onChange={(e) => setComposer(prev => ({ ...prev, subject: e.target.value }))}
                className="input-field"
                style={{ width: '100%', fontSize: 13, padding: '8px 12px', borderRadius: 8 }}
              />
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              {composer.type === 'email' ? 'Email Body' : 'Message'}
            </label>
            <textarea
              rows={composer.type === 'email' ? 8 : 4}
              value={composer.body}
              onChange={(e) => setComposer(prev => ({ ...prev, body: e.target.value }))}
              className="input-field"
              style={{ width: '100%', fontSize: 13, padding: '10px 12px', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setComposer(prev => ({ ...prev, open: false }))}
              style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', borderRadius: 8, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setComposer(prev => ({ ...prev, open: false }))
                toast.success(composer.type === 'email' ? `Email successfully sent to ${composer.recipientName}!` : `Notification sent to ${composer.recipientName}!`)
              }}
              style={{ padding: '8px 18px', fontSize: 12, fontWeight: 700, border: 'none', background: 'var(--primary)', color: 'white', borderRadius: 8, cursor: 'pointer' }}
            >
              {composer.type === 'email' ? 'Send Email' : 'Send Notification'}
            </button>
          </div>
        </div>
      </Modal>
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

const getLatestAttendanceSession = (record) => {
  const sessions = Array.isArray(record?.sessions) ? record.sessions.filter(Boolean) : []
  const normalized = sessions
    .map((session) => ({
      ...session,
      startTime: session?.startTime ? new Date(session.startTime) : null,
      endTime: session?.endTime ? new Date(session.endTime) : null,
    }))
    .filter((session) => session.startTime && !Number.isNaN(session.startTime.getTime()))

  if (!normalized.length) {
    if (!record?.punchIn) return null
    return {
      startTime: new Date(record.punchIn),
      endTime: record.punchOut ? new Date(record.punchOut) : null,
      isActive: !record.punchOut,
      source: record?.source || 'MANUAL',
      durationHours: Number(record?.totalHours) || 0,
    }
  }

  normalized.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
  return normalized[0]
}

const formatAttendanceLogout = (session, active) => {
  if (active) return 'Active'
  if (!session?.endTime) return '—'

  const endTime = new Date(session.endTime)
  const isAutoAt1159 = (session?.source === 'AUTO_PUNCH_OUT' || session?.source === 'SYSTEM') &&
    endTime.getHours() === 23 && endTime.getMinutes() === 59

  if (isAutoAt1159) return '11:59 PM (Auto)'
  return fmtTime(endTime)
}

const calcWorkedTimeFromSession = (session, now) => {
  if (!session?.startTime) return '—'

  const start = new Date(session.startTime)
  const end = session?.endTime ? new Date(session.endTime) : now
  const diffMs = Math.max(0, end - start)
  const h = Math.floor(diffMs / 3600000)
  const m = Math.floor((diffMs % 3600000) / 60000)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// ── Attendance Row (used in main panel + modal) ───────────────────
const AttendanceRow = ({ record, now }) => {
  const navigate = useNavigate()
  const latestSession = getLatestAttendanceSession(record)
  const loginTime = latestSession?.startTime || record.punchIn
  const active = Boolean(latestSession?.isActive)
  const worked = calcWorkedTime(record, now)
  const logoutLabel = formatAttendanceLogout(latestSession, active)
  const avatarBg = active ? '#eff6ff' : '#f1f5f9'
  const avatarColor = active ? '#1d4ed8' : '#475569'
  const isAutoPunchOut = Boolean(latestSession?.endTime && (latestSession?.source === 'AUTO_PUNCH_OUT' || latestSession?.source === 'SYSTEM') &&
    new Date(latestSession.endTime).getHours() === 23 && new Date(latestSession.endTime).getMinutes() === 59)
  const statusLabel = active ? 'Active' : isAutoPunchOut ? 'Auto Punch Out' : 'Not Active'
  const statusClass = active ? 'pill-blue' : isAutoPunchOut ? 'pill-orange' : 'pill-green'

  return (
    <div className="att-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(88px, 0.9fr) minmax(88px, 0.9fr) minmax(74px, 0.7fr) minmax(84px, 0.7fr)', gap: 12, alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
      <div
        onClick={() => record.staff?._id && navigate(`/staff/${record.staff._id}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, cursor: 'pointer' }}
        title="View employee profile"
      >
        <Avatar name={record.staff?.fullName} style={{ background: avatarBg, color: avatarColor, width: 28, height: 28, fontSize: 11 }} />
        <div style={{ minWidth: 0 }}>
          <div className="hover-primary" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
            {record.staff?.fullName || 'Unknown'}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
        {loginTime ? fmtTime(loginTime) : '—'}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
        {logoutLabel}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {worked}
        {active && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#58833b' }} />}
      </div>
      <span className={`pill ${statusClass}`} style={{ fontSize: 10 }}>
        {statusLabel}
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
  const [announcements, setAnnouncements] = useState([])
  const [now, setNow] = useState(new Date())
  const [showNotActiveModal, setShowNotActiveModal] = useState(false)
  const [showAllAttendance, setShowAllAttendance] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showActiveModal, setShowActiveModal] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [attendanceMonth, setAttendanceMonth] = useState(() => monthValue(new Date()))
  const [performancePeriod, setPerformancePeriod] = useState('month')
  const [performanceStats, setPerformanceStats] = useState({ averageScore: 85, topPerformerName: 'Vikash Kumar', topPerformerScore: 92, teamEfficiency: 80 })
  const [leaveMonth, setLeaveMonth] = useState(() => monthValue(new Date()))
  const [monthlyAttendance, setMonthlyAttendance] = useState([])
  const [previousMonthlyAttendance, setPreviousMonthlyAttendance] = useState([])
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlyError, setMonthlyError] = useState('')
  const [attendanceSearch, setAttendanceSearch] = useState('')

  // Pull all the parallel fetches into a stable callback so the effect's
  // dependency array stays minimal and we don't refetch on every render.
  const fetchData = useCallback(async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      setLoading(true)
      setLoadError('')
      // Note: the GET cache + dedup in api.js means a rapid second mount
      // (e.g. StrictMode) won't trigger network calls.
      const requests = await Promise.allSettled([
        api.get('/staff', { signal: controller.signal }),
        api.get('/attendance/admin/active', { signal: controller.signal }),
        api.get('/attendance/admin/today-punchins', { signal: controller.signal }),
        api.get('/leaves/admin/pending', { params: { status: 'Approved' }, signal: controller.signal }),
        api.get('/leaves/admin/pending', { params: { status: 'Pending' }, signal: controller.signal }),
        api.get('/announcements', { signal: controller.signal })
      ])
      const [staffRes, activeRes, punchinsRes, approvedLeaveRes, pendingLeaveRes, announcementsRes] = requests

      if (staffRes.status === 'fulfilled') setStaffData(staffRes.value.data.data || [])
      if (activeRes.status === 'fulfilled') setActiveCount(activeRes.value.data?.activeCount || 0)
      if (punchinsRes.status === 'fulfilled') setTodayPunchins(punchinsRes.value.data?.data || [])
      if (approvedLeaveRes.status === 'fulfilled') setApprovedLeaves(approvedLeaveRes.value.data?.data || [])
      if (pendingLeaveRes.status === 'fulfilled') setPendingLeaves(pendingLeaveRes.value.data?.data || [])
      
      if (announcementsRes && announcementsRes.status === 'fulfilled') {
        const all = announcementsRes.value.data.data || []
        const now = new Date()
        const active = all.filter((a) => {
          if (!a.isActive) return false
          const now = new Date()
          if (a.startDate) {
            const start = new Date(a.startDate)
            start.setHours(0, 0, 0, 0)
            if (start > now) return false
          }
          if (a.endDate) {
            const end = new Date(a.endDate)
            end.setHours(23, 59, 59, 999)
            if (end < now) return false
          }
          return true
        })
        active.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setAnnouncements(active.slice(0, 3))
      }

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
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
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

  useEffect(() => {
    const controller = new AbortController()
    const fetchPerformanceStats = async () => {
      try {
        const res = await api.get('/attendance/admin/performance-stats', {
          params: { period: performancePeriod },
          signal: controller.signal,
        })
        if (res.data?.success && res.data?.data) {
          setPerformanceStats(res.data.data)
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.message === 'canceled') return
        console.error('Performance stats fetch error:', err)
      }
    }
    fetchPerformanceStats()
    return () => controller.abort()
  }, [performancePeriod])

  // Compute Stats (memoized)
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
    const validPunchins = todayPunchins.filter(r => r.punchIn)
    const punchedInStaffIds = new Set(todayPunchins.map(r => String(r.staff?._id || '')))
    const onLeaveStaffIds = new Set(
      approvedOnLeaveToday.flatMap(leave => [String(leave.staff?._id || ''), String(leave.staffId || '')]).filter(Boolean)
    )
    const notActiveStaff = staffData.filter(s => !punchedInStaffIds.has(String(s._id)) && !onLeaveStaffIds.has(String(s._id)))
    const notActiveCount = notActiveStaff.length
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const ist = new Date(new Date().getTime() + IST_OFFSET_MS)
    const minutesIST = ist.getUTCHours() * 60 + ist.getUTCMinutes()
    const absentCount = minutesIST >= (OFFICE_OPEN_HOUR * 60 + OFFICE_OPEN_MIN) ? notActiveCount : 0
    return {
      totalEmployees, safeActive, totalPresentToday, onLeave,
      validPunchins, notActiveStaff, notActiveCount, absentCount, approvedOnLeaveToday,
    }
  }, [staffData, activeCount, todayPunchins, approvedLeaves])

  const sortedAttendance = useMemo(() => {
    return [...todayPunchins].sort((a, b) => {
      const aSession = getLatestAttendanceSession(a)
      const bSession = getLatestAttendanceSession(b)
      const aStart = aSession?.startTime ? new Date(aSession.startTime) : new Date(a.punchIn || 0)
      const bStart = bSession?.startTime ? new Date(bSession.startTime) : new Date(b.punchIn || 0)
      const aActive = Boolean(aSession?.isActive) ? 1 : 0
      const bActive = Boolean(bSession?.isActive) ? 1 : 0
      if (aActive !== bActive) return bActive - aActive
      return new Date(bStart) - new Date(aStart)
    })
  }, [todayPunchins])
  const filteredAttendance = useMemo(() => {
    const query = attendanceSearch.trim().toLowerCase()
    if (!query) return sortedAttendance
    return sortedAttendance.filter((record) => {
      const fullName = String(record.staff?.fullName || '').toLowerCase()
      const employeeId = String(record.staff?.employeeId || '').toLowerCase()
      return fullName.includes(query) || employeeId.includes(query)
    })
  }, [sortedAttendance, attendanceSearch])
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
      const isLate = false

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

  // Filter approved/pending leaves based on the selected leaveMonth YYYY-MM
  const selectedMonthLeaves = useMemo(() => {
    const { month, year } = parseMonthValue(leaveMonth)
    const filterYearMonthStr = `${year}-${String(month).padStart(2, '0')}` // e.g. "2026-07"
    
    // Filter approved leaves that belong to this month
    const approved = approvedLeaves.filter(leave => {
      const startStr = leave.startDate?.substring(0, 7)
      const endStr = leave.endDate?.substring(0, 7)
      return startStr === filterYearMonthStr || endStr === filterYearMonthStr
    })
    
    // Filter pending leaves that belong to this month
    const pending = pendingLeaves.filter(leave => {
      const startStr = leave.startDate?.substring(0, 7)
      const endStr = leave.endDate?.substring(0, 7)
      return startStr === filterYearMonthStr || endStr === filterYearMonthStr
    })
    
    const total = approved.length + pending.length
    const approvedPct = total > 0 ? Math.round((approved.length / total) * 100) : 0
    const pendingPct = total > 0 ? Math.round((pending.length / total) * 100) : 0
    
    return {
      approved,
      pending,
      total,
      approvedPct,
      pendingPct
    }
  }, [leaveMonth, approvedLeaves, pendingLeaves])



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

  const { totalEmployees, safeActive, totalPresentToday, onLeave, latePunchins, notActiveStaff, notActiveCount, absentCount, approvedOnLeaveToday } = stats
  const monthlyTrendPositive = monthlyOverview.trend >= 0
  const monthlyTrendLabel = monthlyOverview.previousPresent === 0 && monthlyOverview.present === 0
    ? '0%'
    : `${monthlyTrendPositive ? '+' : ''}${monthlyOverview.trend.toFixed(1)}%`

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      {/* ── Welcome Greeting ── */}


      {/* ── Stat Row ─────────────────────────────────────────────── */}
      <div className="stat-grid-unified">
        {/* Card 1: Total Employees */}
        <div 
          onClick={() => navigate('/staff')}
          className="stat-column"
          style={{ 
            cursor: 'pointer',
            background: 'rgba(148, 163, 184, 0.04)',
            '--card-accent': 'var(--primary)'
          }}
        >
          <div className="stat-header">
            <div className="stat-header-left">
              <div className="stat-badge-icon" style={{ background: 'rgba(148, 163, 184, 0.12)', color: 'var(--text)' }}>
                <Users size={13} />
              </div>
              <span className="stat-label-text" style={{ color: 'var(--text)' }}>Total Employees</span>
            </div>
          </div>
          <div className="stat-value-text">{totalEmployees}</div>
          <div className="stat-sub-text">All registered team members</div>
        </div>

        {/* Card 2: Active Today */}
        <div 
          onClick={() => setShowActiveModal(true)}
          className="stat-column"
          style={{ 
            cursor: 'pointer',
            background: 'rgba(34, 197, 94, 0.045)',
            '--card-accent': '#22c55e'
          }}
        >
          <div className="stat-header">
            <div className="stat-header-left">
              <div className="stat-badge-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
                <UserCheck size={13} />
              </div>
              <span className="stat-label-text" style={{ color: '#16a34a' }}>Active Today</span>
            </div>
          </div>
          <div className="stat-value-text">{safeActive}</div>
          <div className="stat-sub-text">Currently punched in</div>
        </div>

        {/* Card 3: On Leave Today */}
        <div 
          onClick={() => setShowLeaveModal(true)}
          className="stat-column"
          style={{ 
            cursor: 'pointer',
            background: 'rgba(245, 158, 11, 0.045)',
            '--card-accent': '#f59e0b'
          }}
        >
          <div className="stat-header">
            <div className="stat-header-left">
              <div className="stat-badge-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                <Calendar size={13} />
              </div>
              <span className="stat-label-text" style={{ color: '#d97706' }}>On Leave Today</span>
            </div>
          </div>
          <div className="stat-value-text">{onLeave}</div>
          <div className="stat-sub-text">Approved leave today</div>
        </div>

        {/* Card 4: Absent */}
        <div 
          onClick={() => setShowNotActiveModal(true)}
          className="stat-column"
          style={{ 
            cursor: 'pointer',
            background: 'rgba(239, 68, 68, 0.045)',
            '--card-accent': '#ef4444'
          }}
        >
          <div className="stat-header">
            <div className="stat-header-left">
              <div className="stat-badge-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>
                <UserX size={13} />
              </div>
              <span className="stat-label-text" style={{ color: '#dc2626' }}>Absent</span>
            </div>
          </div>
          <div className="stat-value-text">{notActiveCount}</div>
          <div className="stat-sub-text">Not punched in today</div>
        </div>
      </div>

      {/* ── Dashboard Bottom Widgets (Team Performance & Leave Overview) ── */}
      <div className="dashboard-bottom-grid" style={{ marginBottom: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
        {/* 1. Team Performance Card */}
        <div className="section-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Team Performance</span>
            <select
              value={performancePeriod}
              onChange={(e) => setPerformancePeriod(e.target.value)}
              className="la-month-select"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text)',
                border: '1px solid var(--border)',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'var(--surface)',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-display), sans-serif'
              }}
            >
              <optgroup label="Periods">
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </optgroup>
              <optgroup label="Specific Months">
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div style={{ padding: '20px', flex: 1, display: 'flex', gap: 24, alignItems: 'center' }}>
            {/* Left Col: Average Score */}
            <div style={{ flex: 1, borderRight: '1px solid var(--border)', paddingRight: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Average Score</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{performanceStats.averageScore}%</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span>▲ 8%</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>from last period</span>
              </div>
            </div>
            {/* Right Col: Top Performer & Team Efficiency */}
            <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Top Performer</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }} title={performanceStats.topPerformerName}>
                    {performanceStats.topPerformerName}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '1px 5px', borderRadius: 4 }}>
                    {performanceStats.topPerformerScore}%
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Team Efficiency</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{performanceStats.teamEfficiency}%</span>
                </div>
                <div style={{ width: '100%', height: 5, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${performanceStats.teamEfficiency}%`, height: '100%', background: 'var(--primary)', borderRadius: 10 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Leave Overview Card */}
        <div className="section-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Leave Overview</span>
            <select
              value={leaveMonth}
              onChange={(e) => setLeaveMonth(e.target.value)}
              className="la-month-select"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text)',
                border: '1px solid var(--border)',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'var(--surface)',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-display), sans-serif'
              }}
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ padding: '20px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            {/* Left Col: Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total Leaves</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{selectedMonthLeaves.total}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Approved:</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>{selectedMonthLeaves.approved.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pending:</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>{selectedMonthLeaves.pending.length}</span>
                </div>
              </div>
            </div>
            {/* Right Col: Donut SVG */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg width="74" height="74" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                {/* Gray Background circle */}
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                {selectedMonthLeaves.total > 0 && (
                  <>
                    {selectedMonthLeaves.approvedPct > 0 && (
                      <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#22c55e" strokeWidth="4" strokeDasharray={`${selectedMonthLeaves.approvedPct} ${100 - selectedMonthLeaves.approvedPct}`} strokeDashoffset="0" />
                    )}
                    {selectedMonthLeaves.pendingPct > 0 && (
                      <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="4" strokeDasharray={`${selectedMonthLeaves.pendingPct} ${100 - selectedMonthLeaves.pendingPct}`} strokeDashoffset={`-${selectedMonthLeaves.approvedPct}`} />
                    )}
                  </>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* 3. Recent Announcements Card */}
        <div className="section-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Recent Announcements</span>
              <button 
                onClick={() => navigate('/settings?tab=announcements')} 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: 0 }}
                title="Create Announcement"
              >
                <Plus size={14} />
              </button>
            </div>
            <span onClick={() => navigate('/settings?tab=announcements')} style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>View all</span>
          </div>
          <div style={{ padding: '10px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {announcements.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>No announcements.</div>
            ) : (
              announcements.map((a, idx) => (
                <div key={a._id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: idx < announcements.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(var(--primary-rgb, 88, 131, 59), 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Megaphone size={14} />
                  </div>
                  <div style={{ minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {new Date(a.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Middle Row (Attention Required & Today's Attendance) ── */}
      <div className="form-grid-2" style={{ marginBottom: 'var(--space-6)', alignItems: 'stretch' }}>
        <AttentionRequired
          notActiveStaff={notActiveStaff}
          approvedOnLeaveToday={approvedOnLeaveToday}
          pendingLeaves={pendingLeaves}
          fetchData={fetchData}
        />

        {/* Recent Punch-In */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Today's Attendance</span>
            <button
              onClick={() => setShowAllAttendance(true)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: 0 }}
            >
              View all →
            </button>
          </div>

          <div className="att-table-head" style={{ padding: '10px 20px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(88px, 0.9fr) minmax(88px, 0.9fr) minmax(74px, 0.7fr) minmax(84px, 0.7fr)', gap: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</div>
            <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Login</div>
            <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logout</div>
            <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Worked</div>
            <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
          </div>

          <div className="scroll-list" style={{ flex: 1, maxHeight: 220, minHeight: 160 }}>
            {sortedAttendance.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div className="stat-icon" style={{ width: 40, height: 40, marginBottom: 10 }}>
                  <ClipboardList size={18} color="var(--text-light)" />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>No punch-ins recorded today.</div>
              </div>
            ) : sortedAttendance.map(record => <AttendanceRow key={record._id} record={record} now={now} />)}
          </div>

          {sortedAttendance.length > 0 && (
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Present: <strong style={{ color: 'var(--text)' }}>{totalPresentToday}</strong></span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active: <strong style={{ color: '#1d4ed8' }}>{safeActive}</strong></span>
            </div>
          )}
        </div>
      </div>



      {/* ── Modals ── */}
      <Modal
        open={showAllAttendance}
        onClose={() => setShowAllAttendance(false)}
        title={`All Attendance · ${sortedAttendance.length} total`}
        size="lg"
      >
        <div className="att-table-head" style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(88px, 0.9fr) minmax(88px, 0.9fr) minmax(74px, 0.7fr) minmax(84px, 0.7fr)', gap: 12 }}>
          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Employee</div>
          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Login</div>
          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Logout</div>
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
        title="Absent / Not Active Team"
        size="md"
      >
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not Active: <strong style={{ color: '#b91c1c' }}>{notActiveCount}</strong></span>
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
        </div>
      </Modal>

      <Modal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Leave Requests Overview"
        size="md"
      >
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Approved (Today): <strong style={{ color: '#58833b' }}>{approvedOnLeaveToday.length}</strong></span>
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
          <div style={{ padding: '12px 20px 8px', fontSize: 12, fontWeight: 700, color: '#58833b', textTransform: 'uppercase', borderTop: '1px solid var(--border)' }}>Approved Leave Requests</div>
          {approvedOnLeaveToday.length === 0 ? (
            <div style={{ padding: '0 20px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No approved leaves for today.</div>
          ) : approvedOnLeaveToday.map((leave) => (
            <div key={leave._id} className="punch-row">
              <Avatar name={leave.staff?.fullName} style={{ background: '#e5ebdd', color: '#58833b' }} />
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

// ─── Announcements Dashboard Section ─────────────────────────────────────────
function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await api.get('/announcements')
        const all = res.data.data || []
        // Filter to only active, in-date-range announcements
        const now = new Date()
        const active = all.filter((a) => {
          if (!a.isActive) return false
          if (a.startDate && new Date(a.startDate) > now) return false
          if (a.endDate && new Date(a.endDate) < now) return false
          return true
        })
        // Sort: Urgent -> Important -> Normal, newest first
        const priorityOrder = { Urgent: 0, Important: 1, Normal: 2 }
        active.sort((a, b) => {
          const pDiff = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
          if (pDiff !== 0) return pDiff
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
        setAnnouncements(active)
      } catch {
        // silently fail for dashboard widget
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <AnnouncementPreviewWidget
      announcements={announcements}
      loading={loading}
      viewAllPath="/announcements"
      emptyMessage="No active announcements."
    />
  )
}

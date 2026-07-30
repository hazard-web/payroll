import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LogIn, LogOut, Clock, Loader2, X, Plus, Timer,
  Briefcase, Activity, CheckCircle2, ListChecks,
  Coffee, Zap, Radio, BellRing, Calendar, Megaphone, ChevronLeft, ChevronRight, UserCheck,
  CloudSun, Sun, Moon, Sparkles, Hourglass, Users, Video, FileText
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import PageShell from '../../components/PageShell'
import { motion, AnimatePresence } from 'framer-motion'
import { useStaffPortal } from '../../context/StaffPortalContext'
import { useNavigate } from 'react-router-dom'

// ── Mini stat card for the 4-metric row ──────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, accent, active }) {
  return (
    <div style={{
      padding: '16px 20px',
      borderRadius: 14,
      background: `linear-gradient(135deg, ${accent}12 0%, ${accent}03 100%)`,
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${accent}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.25s ease',
      boxShadow: active ? `0 8px 18px -4px ${accent}25` : 'var(--shadow-sm)',
    }} className="btn-hover">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16} color={accent} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, marginTop: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{sub}</div>
    </div>
  )
}

export default function PortalDashboard() {
  const { staffUser } = useStaffPortal()
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeShift, setActiveShift] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showProfilePopup, setShowProfilePopup] = useState(false)

  // Summary states for the current month
  const [history, setHistory] = useState([])
  const [leaves, setLeaves] = useState([])

  const fetchSummaryData = useCallback(async () => {
    if (!staffUser) return
    try {
      const today = new Date()
      const m = today.getMonth() + 1
      const y = today.getFullYear()
      const [historyRes, leavesRes] = await Promise.all([
        api.get('/attendance/history', { params: { month: m, year: y } }),
        api.get('/leaves/my-requests')
      ])
      setHistory(historyRes.data.history || [])
      setLeaves(leavesRes.data.data || [])
    } catch (err) {
      console.error('Failed to fetch summary statistics:', err)
    }
  }, [staffUser])

  useEffect(() => {
    if (staffUser) {
      fetchSummaryData()
    }
  }, [staffUser, fetchSummaryData])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchActiveShift = useCallback(async () => {
    try {
      const res = await api.get('/attendance/active')
      setActiveShift(res.data.activeShift || null)
    } catch (err) {
      console.error('Failed to fetch active shift:', err)
      setActiveShift(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActiveShift()
  }, [fetchActiveShift])

  useEffect(() => {
    if (activeShift?.date) {
      const shiftDate = new Date(activeShift.date).toDateString()
      const currentDate = currentTime.toDateString()
      if (shiftDate !== currentDate) {
        fetchActiveShift()
      }
    }
  }, [currentTime, activeShift, fetchActiveShift])

  useEffect(() => {
    if (staffUser && staffUser.profileCompleted === false) {
      setShowProfilePopup(true)
    } else {
      setShowProfilePopup(false)
    }
  }, [staffUser])

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskMode, setTaskMode] = useState('in')
  const [taskItems, setTaskItems] = useState([{ project: '', description: '', status: 'Pending', notes: '' }])
  const [taskSubmitting, setTaskSubmitting] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState({})

  // Announcements
  const [announcements, setAnnouncements] = useState([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)

  // Daily Schedule checklist states
  const dateStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const scheduleStorageKey = useMemo(() => `portal_schedule_${staffUser?.id || 'guest'}_${dateStr}`, [staffUser, dateStr])
  
  const [scheduleList, setScheduleList] = useState(() => {
    const defaultEvents = [
      { time: '10:30 AM', label: 'Daily Standup', desc: 'Team Sync', dot: '#22c55e', checked: false },
      { time: '01:00 PM', label: 'Lunch Break', desc: '45 mins', dot: '#3b82f6', checked: false },
      { time: '03:30 PM', label: 'Client Meeting', desc: 'Project Sync', dot: '#8b5cf6', checked: false },
      { time: '05:30 PM', label: 'Task Review', desc: 'Daily Wrap-up', dot: '#f59e0b', checked: false }
    ]
    try {
      const saved = localStorage.getItem(scheduleStorageKey)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.warn('Failed to parse schedule')
    }
    return defaultEvents
  })
  
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newEvent, setNewEvent] = useState({ time: '', label: '', desc: '', dot: '#22c55e' })

  useEffect(() => {
    localStorage.setItem(scheduleStorageKey, JSON.stringify(scheduleList))
  }, [scheduleList, scheduleStorageKey])

  // Calendar Widget states
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())

  // Fetch announcements via portal-auth endpoint
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true)
        const res = await api.get('/portal/announcements')
        setAnnouncements(res.data.data || [])
      } catch (err) {
        console.error('Failed to fetch announcements:', err)
        setAnnouncements([])
      } finally {
        setAnnouncementsLoading(false)
      }
    }
    fetchAnnouncements()
  }, [])

  const normalizeTasks = (items) => items.map(task => ({
    project: (task.project || '').trim(),
    description: (task.description || '').trim(),
    status: ['Pending', 'In Progress', 'Completed'].includes(task.status) ? task.status : 'Pending',
    notes: (task.notes || '').trim()
  }))

  const getLocation = async () => {
    if (!('geolocation' in navigator)) return null
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      return { lat: position.coords.latitude, lng: position.coords.longitude }
    } catch (geoErr) {
      console.warn('Geolocation failed:', geoErr)
      return null
    }
  }

  const openTaskModal = (mode) => {
    setTaskMode(mode)
    if (mode === 'in' || mode === 'add') {
      const preset = (staffUser?.clientAssignment || '').trim()
      setTaskItems([{ project: preset, description: '', status: 'Pending' }])
    } else {
      const existing = activeShift?.tasks?.map(task => ({
        project: task.project || '',
        description: task.description || '',
        status: task.status || 'Pending'
      }))
      setTaskItems(existing && existing.length > 0 ? existing : [{ project: '', description: '', status: 'Pending' }])
    }
    setShowTaskModal(true)
  }

  const updateTaskItem = (index, field, value) => {
    setTaskItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item))
  }

  const addTaskItem = () => {
    if (taskItems.length >= 8) {
      toast.error('Maximum 8 tasks can be added for one shift.')
      return
    }
    const preset = (staffUser?.clientAssignment || '').trim()
    setTaskItems(prev => [...prev, { project: preset, description: '', status: 'Pending' }])
  }

  const canAddMoreTask = taskItems.length < 8

  const removeTaskItem = (index) => {
    setTaskItems(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleDirectPunchIn = async () => {
    setTaskSubmitting(true)
    try {
      const coords = await getLocation()
      const existingTasks = activeShift?.tasks || []
      const endpoint = '/attendance/punch-in'
      const payload = { tasks: existingTasks, ...(coords || {}) }
      const res = await api.post(endpoint, payload)
      toast.success(res.data.message)
      await fetchActiveShift()
      await fetchSummaryData()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to punch in')
    } finally {
      setTaskSubmitting(false)
    }
  }

  const handleTaskSubmit = async () => {
    setTaskSubmitting(true)
    try {
      const cleanedTasks = normalizeTasks(taskItems)
      if (cleanedTasks.length === 0) {
        toast.error('Please add at least one task.')
        return
      }
      if (cleanedTasks.some(task => !task.project)) {
        toast.error('Please select a project.')
        return
      }
      if (cleanedTasks.some(task => !task.description)) {
        toast.error('Please add at least one task description.')
        return
      }

      if (taskMode === 'add') {
        for (const t of cleanedTasks) {
          await api.post('/attendance/tasks/add', {
            project: t.project,
            description: t.description,
            notes: t.notes || ''
          })
        }
        toast.success('Task(s) added successfully')
      } else {
        const coords = await getLocation()
        const endpoint = taskMode === 'in' ? '/attendance/punch-in' : '/attendance/punch-out'
        const payload = { tasks: cleanedTasks, ...(coords || {}) }
        const res = await api.post(endpoint, payload)
        toast.success(res.data.message)
      }
      setShowTaskModal(false)
      await fetchActiveShift()
      await fetchSummaryData()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || `Failed to ${taskMode === 'in' ? 'punch in' : taskMode === 'add' ? 'add task' : 'punch out'}`)
    } finally {
      setTaskSubmitting(false)
    }
  }

  const formatDuration = (start) => {
    const diff = Math.max(0, Math.floor((new Date() - new Date(start)) / 1000))
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const hour = currentTime.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const greetingEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙'
  const dayOfWeek = new Date().getDay()
  const isPunchedIn = Boolean(activeShift && activeShift.sessions?.some(s => s.isActive))

  const effectiveWorkDays = (staffUser?.workingDays && staffUser.workingDays.length)
    ? staffUser.workingDays
    : (staffUser?.defaultWorkDays || [1, 2, 3, 4, 5])

  const isWorkDay = effectiveWorkDays.includes(dayOfWeek)
  const isOffDay = !isWorkDay
  const clientName = staffUser?.clientAssignment || ''

  const sessions = Array.isArray(activeShift?.sessions) ? activeShift.sessions : []
  const workedHours = useMemo(() => {
    if (!activeShift?.date) return 0
    const shiftDate = new Date(activeShift.date).toDateString()
    const currentDate = currentTime.toDateString()
    if (shiftDate !== currentDate) return 0

    let totalMs = 0
    sessions.forEach(s => {
      const start = new Date(s.startTime)
      const end = s.endTime ? new Date(s.endTime) : currentTime
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        totalMs += Math.max(0, end - start)
      }
    })
    return totalMs / (1000 * 3600)
  }, [activeShift, sessions, currentTime])
  const remainingHours = Math.max(0, 8 - workedHours)
  const sessionCount = activeShift?.sessionCount ?? sessions.length
  const completedTasks = Array.isArray(activeShift?.tasks) ? activeShift.tasks.filter(task => task.status === 'Completed').length : 0
  const totalTasks = Array.isArray(activeShift?.tasks) ? activeShift.tasks.length : 0
  const pendingTasks = totalTasks - completedTasks
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
  const firstPunchIn = sessions.length > 0 ? sessions[0].startTime : null
  const lastPunchOut = sessions.filter(session => session.endTime).slice(-1)[0]?.endTime || null

  const formatHours = (hours) => {
    const totalMinutes = Math.round((hours || 0) * 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h}h ${String(m).padStart(2, '0')}m`
  }

  const formatTimeLabel = (value) => value
    ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '—'

  const getTaskStatusStyle = (status) => {
    if (status === 'Completed') return { bg: 'rgba(88,131,59,0.12)', color: '#58833b' }
    if (status === 'In Progress') return { bg: 'rgba(245,158,11,0.12)', color: '#d97706' }
    return { bg: 'rgba(107,114,128,0.1)', color: '#6b7280' }
  }

  const summaryStats = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() // 0-indexed

    let present = 0
    let late = 0
    let absent = 0

    // Check each day of the month up to today
    for (let d = 1; d <= today.getDate(); d++) {
      const date = new Date(year, month, d)
      const dayOfWeek = date.getDay()

      // If it's a working day
      if (effectiveWorkDays.includes(dayOfWeek)) {
        // Find attendance record for this day (date matches date)
        const record = history.find(r => {
          const rDate = new Date(r.date)
          return rDate.getDate() === d && rDate.getMonth() === month && rDate.getFullYear() === year
        })

        if (record) {
          if (record.workStatus === 'Absent' || record.workStatus === 'LOP') {
            absent++
          } else {
            present++
            // Check if late (punchIn after 10:30 AM IST)
            if (record.punchIn) {
              const pin = new Date(record.punchIn)
              const options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }
              const istString = pin.toLocaleTimeString('en-US', options)
              const [hStr, mStr] = istString.split(':')
              const pinHours = parseInt(hStr)
              const pinMins = parseInt(mStr)
              const minsSinceMidnight = pinHours * 60 + pinMins
              if (minsSinceMidnight > 630) {
                late++
              }
            }
          }
        } else {
          // Check if there was an approved leave for this day
          const hasLeave = leaves.some(l => {
            if (l.status !== 'Approved') return false
            const start = new Date(l.startDate)
            const end = new Date(l.endDate)
            const checkDate = new Date(year, month, d, 12, 0, 0)
            return checkDate >= start && checkDate <= end
          })

          if (!hasLeave) {
            absent++
          }
        }
      }
    }

    // Count approved leaves in the current month
    const approvedLeavesCount = leaves.filter(l => {
      if (l.status !== 'Approved') return false
      const start = new Date(l.startDate)
      const end = new Date(l.endDate)
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
      return start <= monthEnd && end >= monthStart
    }).length

    return {
      present,
      absent,
      leave: approvedLeavesCount,
      late
    }
  }, [history, leaves, effectiveWorkDays])

  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate()
  const getFirstDayOfMonth = (m, y) => {
    const day = new Date(y, m, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  const getBannerImage = () => {
    const hr = currentTime.getHours()
    if (hr < 12) return '/dashboard_banner_morning.png'
    if (hr < 17) return '/dashboard_banner_afternoon.png'
    return '/dashboard_banner_evening.png'
  }

  const getCalendarDays = () => {
    const prevMonthDaysCount = getFirstDayOfMonth(calMonth, calYear)
    const prevMonth = calMonth === 0 ? 11 : calMonth - 1
    const prevYear = calMonth === 0 ? calYear - 1 : calYear
    const totalDaysInPrevMonth = getDaysInMonth(prevMonth, prevYear)

    const prevDays = Array.from({ length: prevMonthDaysCount }).map((_, idx) => ({
      day: totalDaysInPrevMonth - prevMonthDaysCount + idx + 1,
      isCurrentMonth: false,
      isNextMonth: false,
      isPrevMonth: true
    }))

    const currDays = Array.from({ length: getDaysInMonth(calMonth, calYear) }).map((_, idx) => ({
      day: idx + 1,
      isCurrentMonth: true,
      isNextMonth: false,
      isPrevMonth: false
    }))

    const totalRendered = prevMonthDaysCount + currDays.length
    const totalSlots = totalRendered > 35 ? 42 : 35
    const nextMonthDaysCount = totalSlots - totalRendered

    const nextDays = Array.from({ length: nextMonthDaysCount }).map((_, idx) => ({
      day: idx + 1,
      isCurrentMonth: false,
      isNextMonth: true,
      isPrevMonth: false
    }))

    return [...prevDays, ...currDays, ...nextDays]
  }

  const fmtAnnouncementDate = (dt) => {
    if (!dt) return '—'
    const d = new Date(dt)
    const day = d.getDate()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${day} ${months[d.getMonth()]}`
  }

  const weeklyHours = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const result = days.map((dayName, idx) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + idx)
      
      const record = history.find(r => {
        const rDate = new Date(r.date)
        return rDate.getDate() === date.getDate() && rDate.getMonth() === date.getMonth() && rDate.getFullYear() === date.getFullYear()
      })
      
      const hrs = record?.totalHours || 0
      const height = Math.min(72, Math.max(4, Math.round((hrs / 10) * 72)))
      const isWeekend = idx >= 5
      const color = isWeekend ? '#3b82f6' : 'var(--primary)'
      
      return {
        day: dayName,
        hrs: hrs > 0 ? `${hrs.toFixed(1)}h` : '0h',
        rawHours: hrs,
        height,
        color: hrs > 0 ? color : 'rgba(156,163,175,0.2)'
      }
    })
    
    const totalRaw = result.reduce((sum, d) => sum + d.rawHours, 0)
    const totalHoursVal = Math.floor(totalRaw)
    const totalMinsVal = Math.round((totalRaw - totalHoursVal) * 60)
    const totalLabel = `${totalHoursVal}h ${totalMinsVal}m`
    
    const startOfLastWeek = new Date(startOfWeek)
    startOfLastWeek.setDate(startOfWeek.getDate() - 7)
    const endOfLastWeek = new Date(startOfLastWeek)
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
    endOfLastWeek.setHours(23, 59, 59, 999)
    
    const lastWeekRaw = history.reduce((sum, r) => {
      const rDate = new Date(r.date)
      if (rDate >= startOfLastWeek && rDate <= endOfLastWeek) {
        return sum + (r.totalHours || 0)
      }
      return sum
    }, 0)
    
    let comparisonLabel = 'Same as last week'
    let comparisonColor = 'var(--text-muted)'
    if (lastWeekRaw > 0) {
      const diffPct = ((totalRaw - lastWeekRaw) / lastWeekRaw) * 100
      if (diffPct > 0) {
        comparisonLabel = `+${diffPct.toFixed(0)}% vs last week`
        comparisonColor = '#22c55e'
      } else if (diffPct < 0) {
        comparisonLabel = `${diffPct.toFixed(0)}% vs last week`
        comparisonColor = '#ef4444'
      }
    } else {
      comparisonLabel = totalRaw > 0 ? 'Active this week' : 'No hours logged'
      comparisonColor = 'var(--primary)'
    }
    
    return {
      days: result,
      totalLabel,
      comparisonLabel,
      comparisonColor
    }
  }, [history])

  const heatmapCells = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const startOffset = firstDay === 0 ? 6 : firstDay - 1
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const todayDate = today.getDate()
    
    const cells = []
    for (let wIdx = 0; wIdx < 5; wIdx++) {
      const weekCells = []
      for (let cIdx = 0; cIdx < 7; cIdx++) {
        const dayIndex = wIdx * 7 + cIdx
        const dayNum = dayIndex - startOffset + 1
        let color = 'rgba(156,163,175,0.04)'
        
        if (dayNum >= 1 && dayNum <= daysInMonth) {
          const date = new Date(year, month, dayNum)
          const dayOfWeek = date.getDay()
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
          
          const record = history.find(r => {
            const rDate = new Date(r.date)
            return rDate.getUTCDate() === dayNum && rDate.getUTCMonth() === month && rDate.getUTCFullYear() === year
          })
          
          if (record) {
            if (record.workStatus === 'Absent' || record.workStatus === 'LOP') {
              color = '#ef4444'
            } else if (record.workStatus === 'Half Day') {
              color = '#86efac'
            } else {
              color = '#22c55e'
            }
          } else {
            if (dayNum > todayDate) {
              color = 'rgba(156,163,175,0.06)'
            } else {
              const hasLeave = leaves.some(l => {
                if (l.status !== 'Approved') return false
                const start = new Date(l.startDate)
                const end = new Date(l.endDate)
                const checkDate = new Date(year, month, dayNum, 12, 0, 0)
                return checkDate >= start && checkDate <= end
              })
              if (hasLeave) {
                color = '#f59e0b'
              } else if (isWeekend) {
                color = 'rgba(156,163,175,0.15)'
              } else {
                color = '#ef4444'
              }
            }
          }
        }
        weekCells.push({ dayNum, color })
      }
      cells.push(weekCells)
    }
    return cells
  }, [history, leaves])

  const pendingLeavesCount = useMemo(() => leaves.filter(l => l.status === 'Pending').length, [leaves])

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Row 1: Greeting split cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 20
        }} className="dashboard-row-1">
          {loading ? (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
              padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 16, height: 96, boxSizing: 'border-box'
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: 140, height: 18, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', marginBottom: 6 }} />
                <div style={{ width: 220, height: 12, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          ) : (
            /* Card A: Welcome */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: 'var(--shadow-sm)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(88,131,59,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {currentTime.getHours() < 12 ? (
                  <CloudSun size={22} color="var(--primary)" />
                ) : currentTime.getHours() < 17 ? (
                  <Sun size={22} color="var(--primary)" />
                ) : (
                  <Moon size={22} color="var(--primary)" />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
                  {greeting}, <span style={{ color: 'var(--primary)' }}>{staffUser?.fullName?.split(' ')[0]}</span>! 👋
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
                  Let's make today productive and meaningful.
                </p>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
              padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, height: 96, boxSizing: 'border-box'
            }}>
              <div>
                <div style={{ width: 180, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', marginBottom: 8 }} />
                <div style={{ width: 100, height: 18, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', marginBottom: 8 }} />
                <div style={{ width: 120, height: 16, borderRadius: 99, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              </div>
              <div style={{ width: 90, height: 60, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
            </div>
          ) : (
            /* Card B: Date/Time & Desk illustration */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: 'var(--shadow-sm)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={14} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                    {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={14} style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                    {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </span>
                </div>
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800,
                    padding: '4px 10px', borderRadius: 99,
                    background: isPunchedIn ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107,114,128,0.08)',
                    color: isPunchedIn ? '#16a34a' : '#6b7280',
                    border: `1px solid ${isPunchedIn ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.1)'}`
                  }}>
                    Office Status: {isPunchedIn ? 'Working' : 'Open'}
                  </span>
                </div>
              </div>

              {/* dynamic desk illustration vector */}
              <div style={{ zIndex: 1, marginRight: -10 }} className="dashboard-desk-illustration">
                <img src={getBannerImage()} alt="Desk Workspace" style={{ maxHeight: 90, width: 'auto', objectFit: 'contain' }} />
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Row 2: Metrics Row (4 Columns with SVG Sparklines) ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
            {Array(4).fill(0).map((_, i) => (
              <div key={`skel-pm-${i}`} style={{ height: 90, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: 60, height: 12, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                </div>
                <div style={{ width: 80, height: 24, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', marginTop: 4 }} />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 20
            }}
          >
            {/* Card 1: Worked Hours */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={18} color="#3b82f6" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Worked Hours</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{formatHours(workedHours)}</div>
                </div>
              </div>
              <svg width="55" height="22" viewBox="0 0 55 22" style={{ overflow: 'visible', flexShrink: 0 }}>
                <path d="M0 16 Q 13.75 6, 27.5 14 T 55 4" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Card 2: Attendance */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UserCheck size={18} color="#22c55e" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>Present</div>
                </div>
              </div>
              <svg width="55" height="22" viewBox="0 0 55 22" style={{ overflow: 'visible', flexShrink: 0 }}>
                <path d="M0 16 Q 13.75 18, 27.5 8 T 55 12" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Card 3: Today's Tasks */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ListChecks size={18} color="#8b5cf6" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Tasks</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{totalTasks}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>{activeShift?.tasks?.filter(t => t.status === 'Completed').length || 0} Completed</div>
                </div>
              </div>
              <svg width="55" height="22" viewBox="0 0 55 22" style={{ overflow: 'visible', flexShrink: 0 }}>
                <path d="M0 12 Q 13.75 4, 27.5 18 T 55 6" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Card 4: Leave Balance */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Briefcase size={18} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Balance</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                    {(staffUser?.leaveBalance?.casual || 0) + (staffUser?.leaveBalance?.sick || 0)} Days
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>
                    {pendingLeavesCount} Pending Requests
                  </div>
                </div>
              </div>
              <svg width="55" height="22" viewBox="0 0 55 22" style={{ overflow: 'visible', flexShrink: 0 }}>
                <path d="M0 20 Q 13.75 10, 27.5 14 T 55 8" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </motion.div>
        )}

        {/* ── Row 3: Daily Activity Widgets (Attendance Clock, Tasks, Schedule) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1.25fr)',
          gap: 20
        }} className="dashboard-row-3">

          {/* Column 1: Today's Attendance circular tracker */}
          {loading ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, height: 330, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: 100, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: 80, height: 14, borderRadius: 99, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
                <div style={{ width: 124, height: 124, borderRadius: '50%', background: 'var(--border)', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Array(4).fill(0).map((_, i) => (
                    <div key={`skel-att-${i}`} style={{ height: 24, borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              </div>
              <div style={{ height: 38, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
            </div>
          ) : (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
              padding: 20, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16,
              height: 330, boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Today's Attendance</span>
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 99,
                  background: isPunchedIn ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.08)',
                  color: isPunchedIn ? '#16a34a' : 'var(--text-muted)'
                }}>
                  {isPunchedIn ? 'Currently Working' : 'Not Punched In'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
                {/* Circular Gauge visual */}
                <div style={{ position: 'relative', width: 124, height: 124, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="124" height="124" viewBox="0 0 124 124">
                    <circle cx="62" cy="62" r="54" fill="none" stroke="var(--border)" strokeWidth="6" />
                    <circle
                      cx="62" cy="62" r="54" fill="none"
                      stroke={isPunchedIn ? 'var(--primary)' : '#6b7280'} strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 54}
                      strokeDashoffset={2 * Math.PI * 54 - (isPunchedIn ? 0.65 : 0.05) * 2 * Math.PI * 54}
                      strokeLinecap="round"
                      transform="rotate(-90 62 62)"
                      style={{ transition: 'stroke-dashoffset 0.35s' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {isPunchedIn ? currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {isPunchedIn ? 'Punched In' : 'Punched Out'}
                    </span>
                  </div>
                </div>

                {/* Status parameters */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, flex: 1 }}>
                  {[
                    { label: 'First Punch In', value: formatTimeLabel(firstPunchIn) },
                    { label: 'Last Punch Out', value: formatTimeLabel(lastPunchOut) },
                    { label: 'Worked Hours', value: formatHours(workedHours) },
                    { label: 'Current Status', value: isPunchedIn ? 'Working' : 'Offline', isGreen: isPunchedIn }
                  ].map((stat, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 10 }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</span>
                      <span style={{ color: stat.isGreen ? '#16a34a' : 'var(--text)', fontWeight: 800 }}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <motion.button
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    if (isPunchedIn) {
                      openTaskModal('out')
                    } else {
                      const hasPunchedToday = activeShift && activeShift.sessions && activeShift.sessions.length > 0
                      if (hasPunchedToday) {
                        handleDirectPunchIn()
                      } else {
                        openTaskModal('in')
                      }
                    }
                  }}
                  disabled={actionLoading || taskSubmitting}
                  style={{
                    width: '100%', height: 38, borderRadius: 8, border: 'none', color: 'white',
                    background: isPunchedIn ? '#dc2626' : 'var(--primary)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  {actionLoading || taskSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isPunchedIn ? (
                    <><LogOut size={14} /> Punch Out</>
                  ) : (
                    <><LogIn size={14} /> Punch In</>
                  )}
                </motion.button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Clock size={10} /> You will be automatically logged out at 11:59 PM
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, height: 330, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: 100, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: 80, height: 28, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {Array(2).fill(0).map((_, i) => (
                  <div key={`skel-task-${i}`} style={{ height: 60, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
              padding: 20, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14,
              height: 330, boxSizing: 'border-box', minWidth: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Today's Tasks</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button 
                    onClick={() => openTaskModal(isPunchedIn ? 'add' : 'in')}
                    style={{ 
                      border: 'none', background: 'rgba(88,131,59,0.08)', color: 'var(--primary)',
                      borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 800, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <Plus size={11} /> Add Task
                  </button>
                  <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(88,131,59,0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 99 }}>
                    {totalTasks} Tasks
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 6, flex: 1, alignContent: 'start', marginTop: 4, overflowY: 'auto', paddingRight: 2 }}>
                {activeShift && Array.isArray(activeShift.tasks) && activeShift.tasks.length > 0 ? (
                  activeShift.tasks.map((task, idx) => {
                    const done = task.status === 'Completed'
                    const statusStyle = getTaskStatusStyle(task.status)

                    return (
                      <div 
                        key={task._id || idx} 
                        onClick={() => navigate('/portal/tasks')}
                        title="Click to manage task in My Tasks"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          gap: 8, 
                          padding: '6px 10px', 
                          borderRadius: 6, 
                          background: 'var(--bg)', 
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(156,163,175,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                          <span style={{
                            width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${done ? 'var(--primary)' : 'var(--border)'}`,
                            background: done ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {done && <UserCheck size={8} color="white" />}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                              {task.project || 'General'}
                            </div>
                            {task.description && (
                              <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                                {task.description.split(' ').slice(0, 3).join(' ') + '...'}
                              </div>
                            )}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 7.5, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                          background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.color}40`, flexShrink: 0
                        }}>
                          {task.status}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 10px', flex: 1 }}>
                    <span style={{ fontSize: 20, marginBottom: 6 }}>📋</span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>No tasks for today</div>
                    <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 2 }}>Punch in or add tasks to get started.</div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <span onClick={() => navigate('/portal/tasks')} style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
                  View all tasks →
                </span>
              </div>
            </div>
          )}

          {/* Column 3: Today's Schedule events timeline */}
          {loading ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, height: 330, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: 100, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: 60, height: 28, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {Array(3).fill(0).map((_, i) => (
                  <div key={`skel-sch-${i}`} style={{ height: 50, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
              padding: 20, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 14,
              height: 330, boxSizing: 'border-box', minWidth: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Today's Schedule</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button 
                    onClick={() => setShowAddEvent(!showAddEvent)}
                    style={{ 
                      border: 'none', background: 'rgba(88,131,59,0.08)', color: 'var(--primary)',
                      borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 800, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <Plus size={11} /> Add Event
                  </button>
                </div>
              </div>

              {/* Inline Add Event Form */}
              {showAddEvent && (
                <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Schedule New Event</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 6 }}>
                    <input 
                      type="text" 
                      placeholder="e.g. 10:30 AM" 
                      value={newEvent.time} 
                      onChange={e => setNewEvent({ ...newEvent, time: e.target.value })} 
                      style={{ padding: '6px 8px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Event Title" 
                      value={newEvent.label} 
                      onChange={e => setNewEvent({ ...newEvent, label: e.target.value })} 
                      style={{ padding: '6px 8px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Short Description" 
                    value={newEvent.desc} 
                    onChange={e => setNewEvent({ ...newEvent, desc: e.target.value })} 
                    style={{ padding: '6px 8px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'].map(c => (
                        <span 
                          key={c} 
                          onClick={() => setNewEvent({ ...newEvent, dot: c })}
                          style={{ 
                            width: 14, height: 14, borderRadius: '50%', background: c, cursor: 'pointer',
                            border: newEvent.dot === c ? '2px solid var(--text)' : 'none', boxSizing: 'border-box'
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        onClick={() => setShowAddEvent(false)} 
                        style={{ padding: '4px 10px', fontSize: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          if (!newEvent.time || !newEvent.label) {
                            toast.error('Time and Title are required!')
                            return
                          }
                          setScheduleList([...scheduleList, { ...newEvent, checked: false }])
                          setNewEvent({ time: '', label: '', desc: '', dot: '#22c55e' })
                          setShowAddEvent(false)
                          toast.success('Event added to today\'s schedule!')
                        }}
                        style={{ padding: '4px 10px', fontSize: 10, borderRadius: 6, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gap: 8, flex: 1, alignContent: 'start', marginTop: 4, overflowY: 'auto', paddingRight: 2 }}>
                {scheduleList.length > 0 ? (
                  scheduleList.map((ev, eIdx) => {
                    const getIcon = (dotColor) => {
                      if (dotColor === '#3b82f6') return Coffee
                      if (dotColor === '#8b5cf6') return Video
                      if (dotColor === '#f59e0b') return FileText
                      return Users
                    }
                    const Icon = getIcon(ev.dot)
                    const evBg = ev.dot === '#22c55e' ? 'rgba(34,197,94,0.08)' : ev.dot === '#3b82f6' ? 'rgba(59,130,246,0.08)' : ev.dot === '#8b5cf6' ? 'rgba(139,92,246,0.08)' : ev.dot === '#f59e0b' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)'
                    
                    return (
                      <div key={eIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', gap: 8, opacity: ev.checked ? 0.65 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                          <input 
                            type="checkbox" 
                            checked={!!ev.checked} 
                            onChange={() => {
                              setScheduleList(scheduleList.map((item, idx) => idx === eIdx ? { ...item, checked: !item.checked } : item))
                            }}
                            style={{ cursor: 'pointer', width: 13, height: 13 }}
                          />
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ev.dot, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: ev.checked ? 'line-through' : 'none' }}>{ev.label}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 500, marginTop: 1 }}>{ev.desc}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>{ev.time}</span>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: evBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={12} color={ev.dot} />
                          </div>
                          <button 
                            onClick={() => {
                              setScheduleList(scheduleList.filter((_, idx) => idx !== eIdx))
                              toast.success('Event removed')
                            }}
                            style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px 4px' }}
                            title="Remove Event"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 10px', textAlign: 'center', flex: 1 }}>
                    <span style={{ fontSize: 18, marginBottom: 4 }}>📅</span>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Schedule is empty</div>
                    <div style={{ fontSize: 9, color: 'var(--text-light)', marginTop: 2 }}>Click "+ Add Event" to plan your day.</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>


      </div>
      {/* ── Pulse keyframe ── */}
      <style>{`
        @keyframes portalPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(88,131,59,0.2); }
          50%       { box-shadow: 0 0 0 5px rgba(88,131,59,0.08); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .greeting-chip-hover {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .greeting-chip-hover:hover {
          background: rgba(156, 163, 175, 0.09) !important;
          border-color: rgba(88, 131, 59, 0.3) !important;
          transform: translateY(-1px);
        }
        @media (max-width: 768px) {
          .premium-greeting-card {
            flex-direction: column !important;
            padding: 24px 20px !important;
            align-items: stretch !important;
            gap: 20px !important;
          }
          .premium-greeting-left {
            align-items: center !important;
            text-align: center !important;
          }
          .premium-greeting-title-row {
            flex-direction: column !important;
            align-items: center !important;
            gap: 10px !important;
          }
          .premium-greeting-subtitle {
            margin-left: 0 !important;
            text-align: center !important;
          }
          .premium-greeting-chips-row {
            margin-left: 0 !important;
            justify-content: center !important;
            gap: 8px !important;
          }
          .premium-greeting-illustration {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Task Modal ── */}
      <AnimatePresence>
        {showTaskModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              transition={{ type: 'spring', damping: 24, stiffness: 240 }}
              style={{
                width: '100%', maxWidth: 640,
                background: 'var(--surface)', borderRadius: 18,
                overflow: 'hidden', border: '1px solid var(--border)',
                boxShadow: '0 28px 70px rgba(0,0,0,0.22)',
              }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                      {taskMode === 'in' ? 'Punch In Task Plan' : taskMode === 'add' ? 'Add Task to Today\'s Session' : 'Punch Out Task Update'}
                    </div>
                    <h2 style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                      {taskMode === 'in' ? 'Plan your tasks before starting' : taskMode === 'add' ? 'Enter project and task details' : 'Review and update task statuses'}
                    </h2>
                  </div>
                  <button onClick={() => setShowTaskModal(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '16px 24px', display: 'grid', gap: 14, maxHeight: '72vh', overflowY: 'auto' }}>
                {taskItems.map((item, index) => (
                  <div key={index} style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Task {index + 1}</div>
                      {taskItems.length > 1 && (
                        <button onClick={() => removeTaskItem(index)} type="button" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</label>
                        <input value={item.project} onChange={(e) => updateTaskItem(index, 'project', e.target.value)} placeholder="Select a Project" required style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task description</label>
                        <textarea value={item.description} onChange={(e) => updateTaskItem(index, 'description', e.target.value)} rows={2} placeholder="Describe what you will work on" style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 64, fontFamily: 'inherit' }} />
                      </div>
                      {taskMode === 'out' && (
                        <div>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                          <select value={item.status} onChange={(e) => updateTaskItem(index, 'status', e.target.value)} style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
                            <option>Pending</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(taskMode === 'in' || taskMode === 'add') && (
                  <button
                    type="button"
                    onClick={addTaskItem}
                    disabled={!canAddMoreTask}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      width: '100%', height: 44, padding: '0 16px', borderRadius: 10,
                      border: canAddMoreTask ? '1px dashed var(--primary)' : '1px dashed var(--border)',
                      background: canAddMoreTask ? 'rgba(88,131,59,0.08)' : 'transparent',
                      color: canAddMoreTask ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: 700, fontSize: 13,
                      cursor: canAddMoreTask ? 'pointer' : 'not-allowed',
                      opacity: canAddMoreTask ? 1 : 0.55,
                    }}
                  >
                    <Plus size={16} /> Add New Task
                    {!canAddMoreTask && <span style={{ fontSize: 11, opacity: 0.8 }}>Max 8 tasks</span>}
                  </button>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', position: 'sticky', bottom: 0, paddingTop: 12, paddingBottom: 2, background: 'var(--surface)' }}>
                  <button type="button" onClick={() => setShowTaskModal(false)} style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontSize: 13 }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleTaskSubmit} disabled={taskSubmitting} className="btn-primary" style={{ padding: '10px 20px', minWidth: 120, fontSize: 13 }}>
                    {taskSubmitting ? <Loader2 size={16} className="animate-spin" /> : taskMode === 'in' ? 'Punch In' : taskMode === 'add' ? 'Add Task' : 'Punch Out'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mandatory Profile-Completion Popup ── */}
      <AnimatePresence>
        {showProfilePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              transition={{ type: 'spring', damping: 24, stiffness: 240 }}
              style={{
                background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 480,
                boxShadow: '0 30px 60px -20px rgba(0,0,0,0.4)', overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ background: 'linear-gradient(135deg, #FFBE11 0%, #f59e0b 100%)', padding: '24px 28px', textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, background: 'rgba(15,23,42,0.9)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 10px 20px -5px rgba(0,0,0,0.3)',
                }}>
                  <UserCheck size={32} color="#FFBE11" />
                </div>
              </div>
              <div style={{ padding: '24px 28px 28px' }}>
                <h2 style={{ margin: 0, marginBottom: 10, color: 'var(--primary)', fontSize: 20, textAlign: 'center' }}>
                  Complete Your Profile
                </h2>
                <p style={{ margin: 0, marginBottom: 20, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, fontSize: 13 }}>
                  Please complete your profile before continuing. This includes your PAN, address, bank details and emergency contact — required for accurate payroll.
                </p>
                <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                  <strong>Why is this required?</strong> Your profile information is used to generate your payslips, tax forms (TDS/Form 16) and to disburse your salary.
                </div>
                <button
                  onClick={() => navigate('/portal/profile')}
                  style={{
                    width: '100%', height: 46, background: 'var(--primary)', color: 'white',
                    border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  Complete Profile Now
                </button>
                <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                  You will not be able to use the portal until this is done.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}

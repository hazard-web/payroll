import { memo, useState, useEffect, useCallback } from 'react'
import {
  Calendar as CalendarIcon, Clock, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, CheckCircle2, ListChecks, Wrench, Download
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import { motion } from 'framer-motion'
import PageShell from '../../components/PageShell'
import { useStaffPortal } from '../../context/StaffPortalContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const getWorkingDaysInMonth = (y, m) => {
  // m is 1-indexed (1 = Jan, 12 = Dec)
  const daysInMonth = new Date(y, m, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(y, m - 1, d).getDay()
    if (dayOfWeek !== 0) { // Mon-Sat (excluding only Sundays)
      count++
    }
  }
  return count
}

// ── styles ────────────────────────────────────────────────────────────────────
const styles = `
  .pa-pill { display:inline-flex; align-items:center; gap:3px; padding:2px 9px; border-radius:999px; font-size:11px; font-weight:700; white-space:nowrap; }
  .pa-pill-green  { background:#e5ebdd; color:#58833b; border:1px solid rgba(88,131,59, 0.25); }
  .pa-pill-orange { background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }
  .pa-pill-blue   { background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }
  .pa-pill-yellow { background:#fefce8; color:#854d0e; border:1px solid #fde047; }
  .pa-pill-red    { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
  .pa-pill-slate  { background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
  .pa-pill-purple { background:#faf5ff; color:#6b21a8; border:1px solid #e9d5ff; }
  .pa-stat { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 18px; display:flex; align-items:center; gap:14px; }
  .pa-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
  .pa-table th { padding: 16px; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border); background: var(--bg); }
  .pa-table td { padding: 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .pa-table tr { transition: background 0.12s; }
  .pa-table tr:hover { background: rgba(0,0,0,.018); }
  .pa-table tr:last-child td { border-bottom: none; }
  .pa-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  .pa-fix-btn {
    display:inline-flex; align-items:center; gap:6px;
    padding:7px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;
    background:#fff7ed; color:#c2410c; border:1px solid #fed7aa;
    transition:all .15s;
  }
  .pa-fix-btn:hover { background:#ffedd5; }
  .pa-fix-btn:disabled { opacity:.6; cursor:not-allowed; }
`

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const fmtTime = dt => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'
const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '-'

/**
 * Returns true if the given date (UTC midnight) is before today (UTC).
 * Used to detect past-day records that must never show "Active".
 */
const isPastDay = (dateVal) => {
  if (!dateVal) return false
  const d = new Date(dateVal)
  d.setUTCHours(0, 0, 0, 0)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

/**
 * Determine the display workStatus for a row.
 * Past-day records must NEVER show "Active" - they are always auto-closed.
 */
const resolveWorkStatus = (row) => {
  if (row.workStatus === 'Active' && isPastDay(row.date)) {
    // Past day with no punch-out = auto-closed by system
    return row.totalHours >= 8 ? 'Full Day' : row.totalHours >= 4 ? 'Half Day' : 'LOP'
  }
  return row.workStatus
}

const WorkStatusPill = memo(function WorkStatusPill({ status }) {
  if (!status) return null
  if (status === 'Active')    return <span className="pa-pill pa-pill-blue">Active</span>
  if (status === 'Full Day')  return <span className="pa-pill pa-pill-green">Full Day</span>
  if (status === 'Half Day')  return <span className="pa-pill pa-pill-yellow">Half Day</span>
  if (status === 'LOP')       return <span className="pa-pill pa-pill-red">LOP</span>
  if (status === 'Leave')     return <span className="pa-pill pa-pill-purple">Leave</span>
  if (status === 'flagged')   return <span className="pa-pill pa-pill-red">Flagged</span>
  return <span className="pa-pill pa-pill-slate">{status}</span>
})

export default function PortalAttendance() {
  const { staffUser } = useStaffPortal()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [history, setHistory]   = useState([])
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [fixing, setFixing]     = useState(false)

  // inject styles once
  useEffect(() => {
    const id = 'pa-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.innerHTML = styles
      document.head.appendChild(el)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/attendance/history?month=${month}&year=${year}`)
      setHistory(res.data.history || [])
      setSummary(res.data.summary || null)
    } catch {
      toast.error('Failed to fetch attendance')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  // ── Trigger migration fix for stale / inflated records ──────────────────
  const handleFixData = useCallback(async () => {
    setFixing(true)
    try {
      const res = await api.post('/attendance/admin/fix-stale-records')
      if (res.data.success) {
        const { openFixed = 0, inflatedFixed = 0, fixedCount = 0 } = res.data
        if (fixedCount === 0) {
          toast.success('All attendance records are already correct. No fixes needed.')
        } else {
          toast.success(
            `Fixed ${fixedCount} record(s): ${openFixed} open, ${inflatedFixed} inflated. Refreshing…`,
            { duration: 4000 }
          )
          await fetchHistory()
        }
      } else {
        toast.error(res.data.message || 'Fix failed')
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Fix failed'
      // If not admin, show a friendlier message
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        toast.error('Only admins can trigger the data fix. Ask your administrator to run it from the admin panel.')
      } else {
        toast.error(msg)
      }
    } finally {
      setFixing(false)
    }
  }, [fetchHistory])

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF()
      doc.setProperties({
        title: `Attendance_Report_${MONTHS[month - 1]}_${year}`
      })

      const primaryColor = [88, 131, 59] // #58833b
      doc.setFillColor(...primaryColor)
      doc.rect(0, 0, 210, 40, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.text('MONTHLY ATTENDANCE REPORT', 15, 25)

      doc.setTextColor(50, 50, 50)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')

      let yPos = 55
      doc.setFont('helvetica', 'bold')
      doc.text('EMPLOYEE DETAILS', 15, yPos)
      yPos += 7

      doc.setFont('helvetica', 'normal')
      doc.text(`Name: ${staffUser?.fullName || 'N/A'}`, 15, yPos)
      doc.text(`Employee ID: ${staffUser?.employeeId || 'N/A'}`, 110, yPos)
      yPos += 6

      doc.text(`Email: ${staffUser?.email || 'N/A'}`, 15, yPos)
      doc.text(`Period: ${MONTHS[month - 1]} ${year}`, 110, yPos)
      yPos += 12

      doc.setDrawColor(220, 220, 220)
      doc.line(15, yPos, 195, yPos)
      yPos += 10

      doc.setFont('helvetica', 'bold')
      doc.text('SUMMARY STATISTICS', 15, yPos)
      yPos += 7

      const workingDaysCount = getWorkingDaysInMonth(year, month)
      const presentDaysCount = summary?.presentDays || 0
      const attendancePercentage = workingDaysCount > 0 ? Math.min(100, Math.round((presentDaysCount / workingDaysCount) * 100)) : 0

      doc.setFont('helvetica', 'normal')
      doc.text(`Attendance Percentage: ${attendancePercentage}%`, 15, yPos)
      doc.text(`Present Days: ${presentDaysCount} / ${workingDaysCount} working days`, 110, yPos)
      yPos += 6

      doc.text(`Total Hours: ${(summary?.totalHours || 0).toFixed(1)} hrs`, 15, yPos)
      doc.text(`Avg Daily Shift: ${(summary?.avgHours || 0).toFixed(1)} hrs`, 110, yPos)
      yPos += 15

      doc.setFont('helvetica', 'bold')
      doc.text('ATTENDANCE DETAILS', 15, yPos)
      yPos += 5

      const tableRows = history.map(row => {
        const isRecordPastDay = isPastDay(row.date)
        const displayStatus = resolveWorkStatus(row)
        const rawHours = row.totalHours || 0
        const dispHours = Math.min(rawHours, 23.99)
        
        return [
          fmtDate(row.date),
          row.punchIn ? fmtTime(row.punchIn) : '-',
          row.punchOut ? fmtTime(row.punchOut) : (isRecordPastDay ? 'Auto 11:59 PM' : 'Active'),
          `${dispHours.toFixed(2)}h`,
          displayStatus || '-'
        ]
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Punch In', 'Punch Out', 'Hours Logged', 'Status']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 15, right: 15 }
      })

      doc.save(`Attendance_Report_${MONTHS[month - 1]}_${year}.pdf`)
      toast.success('PDF report downloaded successfully!')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Failed to generate PDF report')
    }
  }


  const workingDaysCount = getWorkingDaysInMonth(year, month)
  const presentDaysCount = summary?.presentDays || 0
  const attendancePercentage = workingDaysCount > 0 ? Math.min(100, Math.round((presentDaysCount / workingDaysCount) * 100)) : 0

  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (attendancePercentage / 100) * circumference

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>Attendance History</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Your monthly work logs</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 6px' }}>
            <button onClick={prevMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--text)' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 110, textAlign: 'center' }}>
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--text)' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Premium Hero Analytics Panel */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, rgba(0, 0, 0, 0.4) 100%)',
        borderRadius: 16,
        padding: '20px 24px',
        color: 'white',
        boxShadow: '0 8px 22px -6px rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20,
        marginBottom: 20
      }}>
        {/* Left Side: Circular Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', width: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {loading && history.length === 0 ? (
              <div style={{ width: 76, height: 76, borderRadius: '50%', border: '6px solid rgba(255,255,255,0.15)', animation: 'pulse 1.5s infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 30, height: 14, borderRadius: 3, background: 'rgba(255,255,255,0.2)', animation: 'pulse 1.5s infinite' }} />
              </div>
            ) : (
              <>
                <svg style={{ transform: 'rotate(-90deg)', width: 84, height: 84 }}>
                  <circle
                    cx="42"
                    cy="42"
                    r={radius}
                    fill="transparent"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="42"
                    cy="42"
                    r={radius}
                    fill="transparent"
                    stroke="white"
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <span style={{ position: 'absolute', fontSize: 16, fontWeight: 900, color: 'white' }}>{attendancePercentage}%</span>
              </>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255, 255, 255, 0.75)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Month Attendance</div>
            {loading && history.length === 0 ? (
              <div style={{ width: 100, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.15)', animation: 'pulse 1.5s infinite', marginTop: 4 }} />
            ) : (
              <div style={{ fontSize: 20, fontWeight: 800, color: 'white', marginTop: 2 }}>{presentDaysCount} / {workingDaysCount} Days</div>
            )}
            <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.65)', marginTop: 2 }}>Working days present</div>
          </div>
        </div>

        {/* Middle Stats List */}
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', flex: 1, justifyContent: 'center' }}>
          <div style={{ minWidth: 100 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Hours</div>
            {loading && history.length === 0 ? (
              <div style={{ width: 70, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.15)', animation: 'pulse 1.5s infinite', marginTop: 5 }} />
            ) : (
              <div style={{ fontSize: 20, fontWeight: 850, color: 'white', marginTop: 3 }}>
                {(summary?.totalHours || 0).toFixed(1)}<span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}>h</span>
              </div>
            )}
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Logged this month</div>
          </div>

          <div style={{ minWidth: 100 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Average Daily</div>
            {loading && history.length === 0 ? (
              <div style={{ width: 70, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.15)', animation: 'pulse 1.5s infinite', marginTop: 5 }} />
            ) : (
              <div style={{ fontSize: 20, fontWeight: 850, color: 'white', marginTop: 3 }}>
                {(summary?.avgHours || 0).toFixed(1)}<span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}>h</span>
              </div>
            )}
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Shift duration</div>
          </div>

          <div style={{ minWidth: 100 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tasks Track</div>
            {loading && history.length === 0 ? (
              <div style={{ width: 70, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.15)', animation: 'pulse 1.5s infinite', marginTop: 5 }} />
            ) : (
              <div style={{ fontSize: 20, fontWeight: 850, color: 'white', marginTop: 3 }}>
                {summary?.completedTasks || 0}<span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}> / {summary?.totalTasks || 0}</span>
              </div>
            )}
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Tasks completed</div>
          </div>

          {summary?.flaggedCount > 0 && (
            <div style={{ minWidth: 80 }}>
              <div style={{ fontSize: 9, color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Flagged</div>
              <div style={{ fontSize: 20, fontWeight: 850, color: '#fca5a5', marginTop: 3 }}>{summary.flaggedCount}</div>
              <div style={{ fontSize: 10, color: '#fecaca', marginTop: 2 }}>Needs review</div>
            </div>
          )}
        </div>

        {/* Right Side: PDF Download Action */}
        <button
          onClick={handleDownloadPDF}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'white',
            color: 'var(--primary)',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.1)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)'
          }}
        >
          <Download size={14} />
          Download PDF
        </button>
      </div>

      {/* Table */}
      {loading && history.length === 0 ? (
        <div className="pa-card" style={{ overflowX: 'auto' }}>
          <table className="pa-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Hours</th>
                <th>Tasks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Array(4).fill(0).map((_, i) => (
                <tr key={`skel-${i}`}>
                  <td><div style={{ width: 80, height: 16, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} /></td>
                  <td><div style={{ width: 60, height: 16, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} /></td>
                  <td><div style={{ width: 60, height: 16, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} /></td>
                  <td><div style={{ width: 40, height: 16, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} /></td>
                  <td><div style={{ width: 30, height: 16, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} /></td>
                  <td><div style={{ width: 60, height: 20, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : history.length === 0 ? (
        <div style={{ padding: 52, textAlign: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <CalendarIcon size={36} color="var(--text-light)" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>No records found</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No attendance data for {MONTHS[month - 1]} {year}.</div>
        </div>
      ) : (
        <div className="pa-card" style={{ overflowX: 'auto' }}>
          <table className="pa-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Hours</th>
                <th>Tasks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, i) => {
                const taskCount = Array.isArray(row.tasks) ? row.tasks.length : 0
                const completed = Array.isArray(row.tasks) ? row.tasks.filter(t => t.status === 'Completed').length : 0
                const isRecordPastDay = isPastDay(row.date)
                const displayStatus   = resolveWorkStatus(row)

                const rawHours  = row.totalHours || 0
                const dispHours = Math.min(rawHours, 23.99)
                const hoursWarn = rawHours > 23.99

                const punchOutDisplay = row.punchOut
                  ? fmtTime(row.punchOut)
                  : isRecordPastDay
                    ? <span className="pa-pill pa-pill-orange" style={{ fontSize: 10 }}>Auto 11:59 PM</span>
                    : <span className="pa-pill pa-pill-blue" style={{ fontSize: 10 }}>Active</span>

                return (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmtDate(row.date)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtTime(row.punchIn)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{punchOutDisplay}</td>
                    <td style={{ fontWeight: 600, color: hoursWarn ? '#c2410c' : 'var(--text)' }}>
                      {dispHours ? `${dispHours.toFixed(1)}h` : '-'}
                    </td>
                    <td style={{ color: 'var(--text)', fontWeight: 700 }}>{taskCount ? `${completed}/${taskCount}` : '-'}</td>
                    <td>
                      <WorkStatusPill status={displayStatus} />
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
          {history.length > 0 && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Total: <strong style={{ color: 'var(--text)' }}>{history.length} days</strong></span>
              <span>Hours: <strong style={{ color: 'var(--text)' }}>{(summary?.totalHours || 0).toFixed(1)}h</strong></span>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import LeavePolicy from './LeavePolicy'
import {
  Calendar, Clock, Loader2, CheckCircle2, XCircle,
  Search, MessageSquare, Download, ChevronLeft, ChevronRight,
  UserCheck, AlertTriangle, ClipboardList, TrendingUp, MapPin,
  Briefcase, Save, RotateCcw, FileText, Eye, ShieldCheck
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'
import PageShell, { PageHeader } from '../components/PageShell'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── styles ──────────────────────────────────────────────────────────────────
const pageStyles = `
  .la-tabs { display:flex; gap:4px; padding:4px; background:var(--bg); border:1px solid var(--border); border-radius:10px; width:fit-content; }
  .la-tab  { padding:8px 20px; border-radius:7px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all 0.18s; color:var(--text-muted); background:transparent; }
  .la-tab.active { background:var(--surface); color:var(--text); box-shadow:0 1px 4px rgba(0,0,0,0.10); }
  .la-pill { display:inline-flex; align-items:center; gap:3px; padding:2px 10px; border-radius:999px; font-size:11px; font-weight:700; white-space:nowrap; }
  .la-pill-green  { background:#e5ebdd; color:#58833b; border:1px solid rgba(88,131,59, 0.25); }
  .la-pill-orange { background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }
  .la-pill-blue   { background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }
  .la-pill-yellow { background:#fefce8; color:#854d0e; border:1px solid #fde047; }
  .la-pill-red    { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
  .la-pill-slate  { background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
  .la-pill-purple { background:#faf5ff; color:#6b21a8; border:1px solid #e9d5ff; }
  .la-stat { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 20px; display:flex; align-items:center; gap:14px; }
  .la-table-head { display:grid; gap:8px; padding:11px 20px; background:var(--bg); border-bottom:1px solid var(--border); }
  .la-row        { display:grid; gap:8px; padding:13px 20px; border-bottom:1px solid var(--border); align-items:center; transition:background 0.13s; }
  .la-row:last-child  { border-bottom:none; }
  .la-row:hover  { background:rgba(0,0,0,0.018); }
  .la-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  .la-filter-btn { padding:7px 14px; border-radius:999px; border:1px solid var(--border); font-size:12px; font-weight:700; cursor:pointer; transition:all 0.18s; }
  .la-month-select { padding:7px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:13px; font-weight:500; cursor:pointer; outline:none; }
  .la-export-btn { display:inline-flex; align-items:center; gap:7px; padding:8px 18px; border-radius:8px; border:1px solid var(--primary); background:var(--primary); color:#fff; font-size:13px; font-weight:600; cursor:pointer; transition:opacity 0.16s; }
  .la-export-btn:hover { opacity:0.88; }
  .la-map-link { display:inline-flex; align-items:center; gap:3px; margin-top:3px; font-size:11px; font-weight:600; color:#1d4ed8; text-decoration:none; padding:2px 6px; border-radius:5px; background:#eff6ff; border:1px solid #bfdbfe; transition:background 0.14s; }
  .la-map-link:hover { background:#dbeafe; }
  .la-search { position:relative; }
  .la-search svg { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:var(--text-light); pointer-events:none; }
  .la-search input { width:100%; padding:8px 12px 8px 38px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:13px; outline:none; }
  .la-search input:focus { border-color:var(--primary); }
`

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtTime = dt => {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}
const fmtDate = dt => {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fmtDateShort = dt => {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
}
const fmtHours = h => {
  if (!h && h !== 0) return '—'
  const hrs = Math.floor(h)
  const min = Math.round((h - hrs) * 60)
  return `${hrs}h ${String(min).padStart(2,'0')}m`
}



const Avatar = ({ name, size = 38, bg = 'var(--primary)', color = '#fff' }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: size * 0.38 }}>
    {(name || '?').charAt(0).toUpperCase()}
  </div>
)

function StatusPill({ status, workStatus }) {
  const s = workStatus || status || ''
  if (s === 'Active')    return <span className="la-pill la-pill-blue">Active</span>
  if (s === 'Full Day')  return <span className="la-pill la-pill-green">Full Day</span>
  if (s === 'Half Day')  return <span className="la-pill la-pill-yellow">Half Day</span>
  if (s === 'LOP')       return <span className="la-pill la-pill-red">LOP</span>
  if (s === 'Leave')     return <span className="la-pill la-pill-purple">Leave</span>
  if (s === 'flagged')   return <span className="la-pill la-pill-red">Flagged</span>
  if (s === 'incomplete') return <span className="la-pill la-pill-orange">Incomplete</span>
  return <span className="la-pill la-pill-slate">{s || '—'}</span>
}

// ─── Leave Tab ────────────────────────────────────────────────────────────────
function LeaveTab() {
  const [requests, setRequests]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [filterStatus, setFilterStatus] = useState('Pending')
  const [search, setSearch]             = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [noteModal, setNoteModal]       = useState(null)
  const [adminNote, setAdminNote]       = useState('')

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const params = filterStatus !== 'All' ? { status: filterStatus } : {}
      const res = await api.get('/leaves/admin/pending', { params })
      setRequests(res.data.data || [])
    } catch {
      toast.error('Failed to fetch leave requests')
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleResponse = async (id, status) => {
    setActionLoading(id)
    try {
      await api.post('/leaves/admin/respond', { id, status, adminNotes: adminNote })
      toast.success(`Request ${status.toLowerCase()} successfully`)
      setNoteModal(null)
      setAdminNote('')
      fetchRequests()
    } catch {
      toast.error('Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = requests.filter(r => {
    const q = search.toLowerCase()
    return !q || r.staff?.fullName?.toLowerCase().includes(q) || r.staff?.employeeId?.toLowerCase().includes(q)
  })

  const leaveStatusPill = s => {
    if (s === 'Approved') return <span className="la-pill la-pill-green">Approved</span>
    if (s === 'Rejected') return <span className="la-pill la-pill-red">Rejected</span>
    return <span className="la-pill la-pill-orange">Pending</span>
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <div className="la-search" style={{ flex:'1 1 260px' }}>
          <Search size={15} />
          <input placeholder="Search by name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['All','Pending','Approved','Rejected'].map(s => (
            <button key={s} className="la-filter-btn"
              onClick={() => setFilterStatus(s)}
              style={{ background: filterStatus === s ? 'var(--primary)' : 'var(--surface)', color: filterStatus === s ? '#fff' : 'var(--text-muted)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <Loader2 size={30} className="animate-spin" style={{ color:'var(--primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:64, background:'var(--surface)', borderRadius:12, border:'1px dashed var(--border)' }}>
          <Calendar size={40} color="var(--text-light)" style={{ marginBottom:12 }} />
          <div style={{ fontWeight:700, color:'var(--text)', marginBottom:6 }}>No requests found</div>
          <div style={{ color:'var(--text-muted)', fontSize:13 }}>Try changing the status filter or search term.</div>
        </div>
      ) : (
        <div className="la-card">
          {/* Table head */}
          <div className="la-table-head" style={{ gridTemplateColumns:'1.6fr 1fr 2fr 100px 90px' }}>
            {['Employee','Dates','Reason','Balances','Status'].map(h => (
              <div key={h} style={{ fontSize:11, fontWeight:700, color:'var(--text-light)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</div>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {filtered.map(req => {
              const days = Math.max(1, Math.ceil((new Date(req.endDate) - new Date(req.startDate)) / 86400000) + 1)
              return (
                <motion.div key={req._id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                  className="la-row" style={{ gridTemplateColumns:'1.6fr 1fr 2fr 100px 90px' }}>

                  {/* Employee */}
                  <div style={{ display:'flex', gap:11, alignItems:'center', minWidth:0 }}>
                    <Avatar name={req.staff?.fullName} size={38} />
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{req.staff?.fullName}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{req.staff?.employeeId || '—'} · <span style={{ color:'var(--primary)', fontWeight:600 }}>{req.type} Leave</span></div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div style={{ fontSize:12, color:'var(--text)' }}>
                    <div style={{ fontWeight:600 }}>{fmtDate(req.startDate)}</div>
                    <div style={{ color:'var(--text-muted)', marginTop:2 }}>to {fmtDate(req.endDate)}</div>
                    <div style={{ marginTop:4 }}><span className="la-pill la-pill-slate">{days} day{days !== 1 ? 's' : ''}</span></div>
                  </div>

                  {/* Reason */}
                  <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.45, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {req.reason || '—'}
                  </div>

                  {/* Balances */}
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>
                    <div>CL: <span style={{ color:'var(--primary)' }}>{req.staff?.leaveBalance?.casual ?? 0}d</span></div>
                    <div style={{ marginTop:3 }}>SL: <span style={{ color:'var(--primary)' }}>{req.staff?.leaveBalance?.sick ?? 0}d</span></div>
                  </div>

                  {/* Status / Action */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
                    {leaveStatusPill(req.status)}
                    {req.status === 'Pending' && (
                      <button onClick={() => setNoteModal(req._id)} className="btn-primary"
                        style={{ padding:'5px 12px', fontSize:12, borderRadius:7 }}>
                        Review
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Decision Modal */}
      <AnimatePresence>
        {noteModal && (() => {
          const req = requests.find(r => r._id === noteModal)
          return (
            <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)' }}
                onClick={() => { setNoteModal(null); setAdminNote('') }} />
              <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.95, opacity:0 }}
                className="card" style={{ width:'100%', maxWidth:460, position:'relative', zIndex:1 }}>
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Review Leave Request</div>
                  {req && (
                    <div style={{ fontSize:13, color:'var(--text-muted)' }}>
                      <strong style={{ color:'var(--text)' }}>{req.staff?.fullName}</strong> · {req.type} Leave · {fmtDate(req.startDate)} – {fmtDate(req.endDate)}
                    </div>
                  )}
                </div>
                <textarea
                  placeholder="Add a note for the employee (optional)…"
                  value={adminNote} onChange={e => setAdminNote(e.target.value)}
                  className="input-field"
                  style={{ width:'100%', height:110, padding:12, resize:'none', fontSize:13, marginBottom:20 }}
                />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <button onClick={() => handleResponse(noteModal, 'Rejected')} disabled={actionLoading === noteModal}
                    className="btn-secondary" style={{ height:44, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                    {actionLoading === noteModal ? <Loader2 size={18} className="animate-spin" /> : <><XCircle size={17} /> Deny</>}
                  </button>
                  <button onClick={() => handleResponse(noteModal, 'Approved')} disabled={actionLoading === noteModal}
                    className="btn-primary" style={{ height:44, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                    {actionLoading === noteModal ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={17} /> Approve</>}
                  </button>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const toLocalDateStr = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────
const getWorkingDaysCount = (year, month, weekendDays = [0, 6]) => {
  const daysInMonth = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay()
    if (!weekendDays.includes(dayOfWeek)) {
      count++
    }
  }
  return count
}

function DropdownItem({ onClick, children, style = {} }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'var(--bg)' : 'none',
        border: 'none',
        width: '100%',
        padding: '8px 16px',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        textAlign: 'left',
        transition: 'background 0.15s',
        ...style
      }}
    >
      {children}
    </button>
  );
}

function AttendanceTab() {
  const now = new Date()
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    return `${now.getMonth() + 1}-${now.getFullYear()}`
  })
  const location = useLocation()
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(location.search)
    return params.get('search') || ''
  })

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('search')
    if (q !== null) setSearch(q)
  }, [location.search])

  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  const [staffList, setStaffList] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [exportingStaffId, setExportingStaffId] = useState(null)
  const navigate = useNavigate()

  const [monthStr, yearStr] = selectedMonthYear.split('-')
  const month = parseInt(monthStr, 10)
  const year = parseInt(yearStr, 10)

  const monthOptions = []
  const currentYear = new Date().getFullYear()
  for (let y = currentYear - 1; y <= currentYear + 1; y++) {
    for (let m = 1; m <= 12; m++) {
      const d = new Date(y, m - 1, 1)
      monthOptions.push({
        value: `${m}-${y}`,
        label: `${d.toLocaleString('en-US', { month: 'long' })} ${y}`
      })
    }
  }
  monthOptions.reverse()

  const fetchData = async () => {
    try {
      setLoading(true)
      const [staffRes, attRes, leaveRes] = await Promise.all([
        api.get('/staff'),
        api.get('/attendance/admin/monthly', { params: { month, year } }),
        api.get('/leaves/admin/pending')
      ])
      setStaffList(staffRes.data.data || [])
      setAttendanceRecords(attRes.data.data || [])
      setLeaveRequests(leaveRes.data.data || [])
    } catch (err) {
      toast.error('Failed to load attendance summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonthYear])

  const exportStaffPDF = async (staff) => {
    if (!staff?._id) return
    try {
      setExportingStaffId(staff._id)
      const res = await api.get(`/attendance/admin/staff/${staff._id}`)
      const history = (res.data?.history || []).sort((a, b) => new Date(a.date) - new Date(b.date))
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      doc.setFillColor(87, 131, 59)
      doc.rect(0, 0, 297, 22, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Individual Attendance Report', 14, 10)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `${staff.fullName || 'N/A'}  ·  ${staff.designation || 'N/A'}  ·  ID: ${staff.employeeId || 'N/A'}  |  Generated: ${new Date().toLocaleString('en-IN')}`,
        14, 17
      )

      const totalRec = history.length
      const fullD = history.filter(r => r.workStatus === 'Full Day').length
      const halfD = history.filter(r => r.workStatus === 'Half Day').length
      const totalHrs = history.reduce((s, r) => s + (r.totalHours || 0), 0)
      doc.setTextColor(50, 50, 50)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(
        `Total Records: ${totalRec}   Full Days: ${fullD}   Half Days: ${halfD}   Total Hrs: ${totalHrs.toFixed(1)}h`,
        14, 30
      )

      const tableRows = history.map((r, i) => {
        const d = new Date(r.date)
        return [
          i + 1,
          d.toLocaleDateString('en-GB'),
          d.toLocaleDateString('en-GB', { weekday: 'short' }),
          r.punchIn ? new Date(r.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
          r.punchOut ? new Date(r.punchOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
          r.locationIn?.lat ? `${Number(r.locationIn.lat).toFixed(4)}, ${Number(r.locationIn.lng).toFixed(4)}` : '—',
          r.totalHours ? `${r.totalHours.toFixed(2)}h` : '—',
          r.workStatus || r.status || '—'
        ]
      })

      autoTable(doc, {
        startY: 35,
        head: [['#', 'Date', 'Day', 'Login', 'Punch Out', 'Location', 'Worked', 'Status']],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [87, 131, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 250, 245] },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 25 },
          2: { cellWidth: 14 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 50 },
          6: { cellWidth: 25 },
          7: { cellWidth: 25 }
        },
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages()
          doc.setFontSize(7)
          doc.setTextColor(150)
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            297 - 14, doc.internal.pageSize.height - 6,
            { align: 'right' }
          )
        }
      })

      doc.save(`Attendance_${(staff.fullName || 'staff').replace(/\s+/g, '_')}_All_Days.pdf`)
    } catch {
      toast.error('Failed to export staff attendance')
    } finally {
      setExportingStaffId(null)
    }
  }

  const exportStaffExcel = (s) => {
    const headers = ['Date', 'Check-In', 'Check-Out', 'Total Hours', 'Status']
    const staffAtt = attendanceRecords.filter(r => r.staff?._id === s._id)
    const rowsData = staffAtt.map(r => [
      new Date(r.date).toLocaleDateString('en-IN'),
      r.punchIn ? new Date(r.punchIn).toLocaleTimeString('en-IN') : '—',
      r.punchOut ? new Date(r.punchOut).toLocaleTimeString('en-IN') : '—',
      r.totalHours ? r.totalHours.toFixed(2) : '—',
      r.workStatus || r.status || '—'
    ])
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rowsData.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Attendance_${s.fullName.replace(/\s+/g, '_')}_${month}_${year}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const workingDays = getWorkingDaysCount(year, month, [0])
  const departments = ['All', ...new Set(staffList.map(s => s.department).filter(Boolean))]

  const rows = staffList.map(s => {
    const staffAtt = attendanceRecords.filter(r => r.staff?._id === s._id)
    const uniqueDatesAtt = []
    const seenDates = new Set()
    staffAtt.forEach(r => {
      const dStr = new Date(r.date).toDateString()
      if (!seenDates.has(dStr)) {
        seenDates.add(dStr)
        uniqueDatesAtt.push(r)
      }
    })

    const presentCount = uniqueDatesAtt.filter(r => r.workStatus !== 'Absent' && r.workStatus !== 'LOP').length
    const lateCount = 0

    const staffLeaves = leaveRequests.filter(req => 
      req.staff?._id === s._id && 
      req.status === 'Approved'
    )
    let leaveDaysCount = 0
    staffLeaves.forEach(req => {
      const start = new Date(req.startDate)
      const end = new Date(req.endDate)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)
      const overlapStart = start < monthStart ? monthStart : start
      const overlapEnd = end > monthEnd ? monthEnd : end
      if (overlapStart <= overlapEnd) {
        const diffTime = Math.abs(overlapEnd - overlapStart)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        leaveDaysCount += diffDays
      }
    })

    const absentCount = Math.max(0, workingDays - presentCount - leaveDaysCount)
    const percent = workingDays > 0 ? parseFloat(((presentCount / workingDays) * 100).toFixed(2)) : 0

    let statusText = 'Good'
    if (percent >= 95) statusText = 'Excellent'
    else if (percent >= 85) statusText = 'Good'
    else if (percent >= 70) statusText = 'Average'
    else statusText = 'Poor'

    return {
      staff: s,
      present: presentCount,
      late: lateCount,
      leave: leaveDaysCount,
      absent: absentCount,
      workingDays,
      percent,
      status: statusText
    }
  }).filter(row => {
    const q = search.toLowerCase()
    const matchesSearch = !q || row.staff.fullName.toLowerCase().includes(q) || (row.staff.employeeId && row.staff.employeeId.toLowerCase().includes(q))
    const matchesDept = selectedDept === 'All' || row.staff.department === selectedDept
    const matchesStatus = selectedStatus === 'All' || row.status === selectedStatus
    return matchesSearch && matchesDept && matchesStatus
  })

  const resetFilters = () => {
    setSearch('')
    setSelectedDept('All')
    setSelectedStatus('All')
    setSelectedMonthYear(`${now.getMonth() + 1}-${now.getFullYear()}`)
  }

  const getStatusBadgeStyle = (status) => {
    if (status === 'Excellent') return { background: '#dcfce7', color: '#15803d' }
    if (status === 'Good') return { background: '#e0f2fe', color: '#0369a1' }
    if (status === 'Average') return { background: '#ffedd5', color: '#c2410c' }
    return { background: '#fee2e2', color: '#b91c1c' }
  }

  return (
    <div>
      {/* Filter panel */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="la-search" style={{ flex: '1 1 200px' }}>
          <Search size={14} />
          <input 
            placeholder="Search by name or ID..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ fontSize: 12, height: 32, paddingLeft: 38 }}
          />
        </div>

        <select 
          className="la-month-select" 
          value={selectedMonthYear} 
          onChange={e => setSelectedMonthYear(e.target.value)}
          style={{ height: 32, fontSize: 12 }}
        >
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select 
          className="la-month-select" 
          value={selectedDept} 
          onChange={e => setSelectedDept(e.target.value)}
          style={{ height: 32, fontSize: 12 }}
        >
          {departments.map(d => (
            <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
          ))}
        </select>

        <select 
          className="la-month-select" 
          value={selectedStatus} 
          onChange={e => setSelectedStatus(e.target.value)}
          style={{ height: 32, fontSize: 12 }}
        >
          <option value="All">All Status</option>
          <option value="Excellent">Excellent</option>
          <option value="Good">Good</option>
          <option value="Average">Average</option>
          <option value="Poor">Poor</option>
        </select>

        <button 
          onClick={resetFilters} 
          className="la-filter-btn" 
          style={{ height: 32, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface)', fontWeight: 700 }}
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={30} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <ClipboardList size={40} color="var(--text-light)" style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>No records found</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Try changing the filters or selected month.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'visible' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, fontFamily: 'var(--font-display), sans-serif' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</th>
                  <th style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present</th>
                  <th style={{ padding: '12px 16px', color: '#dc2626', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Absent</th>
                  <th style={{ padding: '12px 16px', color: '#2563eb', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Working Days</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance %</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.staff._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }} className="table-row-hover">
                    {/* Employee */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={row.staff.fullName} size={30} />
                        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{row.staff.fullName}</span>
                      </div>
                    </td>

                    {/* ID */}
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12.5 }}>
                      {row.staff.employeeId || '—'}
                    </td>

                    {/* Department */}
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12.5 }}>
                      {row.staff.department || '—'}
                    </td>

                    {/* Present */}
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#16a34a', fontSize: 13 }}>
                      {row.present}
                    </td>

                    {/* Absent */}
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#dc2626', fontSize: 13 }}>
                      {row.absent}
                    </td>

                    {/* Leave */}
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#2563eb', fontSize: 13 }}>
                      {row.leave}
                    </td>

                    {/* Working Days */}
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 13 }}>
                      {row.workingDays}
                    </td>

                    {/* Attendance % with progress bar */}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{row.percent}%</span>
                      <div style={{ width: '100%', maxWidth: 75, height: 4, background: 'var(--bg)', borderRadius: 100, marginTop: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, row.percent)}%`,
                          height: '100%',
                          background: row.status === 'Excellent' || row.status === 'Good' ? '#22c55e' : row.status === 'Average' ? '#f97316' : '#ef4444',
                          borderRadius: 100
                        }} />
                      </div>
                    </td>

                    {/* Status badge */}
                    <td style={{ padding: '10px 16px' }}>
                      <span 
                        className="la-pill" 
                        style={{ 
                          fontWeight: 700, 
                          fontSize: 10.5,
                          padding: '2.5px 7px',
                          ...getStatusBadgeStyle(row.status)
                        }}
                      >
                        {row.status}
                      </span>
                    </td>

                    {/* Actions Dropdown */}
                    <td style={{ padding: '10px 16px', position: 'relative', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === row.staff._id ? null : row.staff._id);
                          }}
                          className="btn-icon btn-hover"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            color: 'var(--text-light)',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: 14, lineHeight: 1, fontWeight: 700 }}>⋮</span>
                        </button>

                        {activeMenuId === row.staff._id && (
                          <>
                            <div 
                              style={{ position: 'fixed', inset: 0, zIndex: 110 }} 
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} 
                            />
                            <div style={{
                              position: 'absolute',
                              right: 20,
                              top: '80%',
                              width: 140,
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              boxShadow: 'var(--shadow-lg)',
                              zIndex: 120,
                              display: 'flex',
                              flexDirection: 'column',
                              padding: '4px 0',
                              textAlign: 'left'
                            }}>
                              <DropdownItem onClick={() => { setActiveMenuId(null); navigate(`/staff/${row.staff._id}`); }}>
                                <Briefcase size={12} style={{ marginRight: 6 }} /> View Profile
                              </DropdownItem>
                              <DropdownItem onClick={() => { setActiveMenuId(null); exportStaffPDF(row.staff); }}>
                                <FileText size={12} style={{ marginRight: 6 }} /> Export PDF
                              </DropdownItem>
                              <DropdownItem onClick={() => { setActiveMenuId(null); exportStaffExcel(row.staff); }}>
                                <Download size={12} style={{ marginRight: 6 }} /> Export Excel
                              </DropdownItem>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_FULL   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function DayCheckboxes({ value, onChange, disabled }) {
  const toggle = (d) => {
    if (disabled) return
    onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d].sort((a,b)=>a-b))
  }
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {DAY_LABELS.map((label, i) => {
        const active = value.includes(i)
        const isWeekend = i === 0 || i === 6
        return (
          <button 
            key={i} 
            type="button" 
            onClick={() => toggle(i)} 
            disabled={disabled}
            style={{
              padding: '4px 10px', 
              borderRadius: 6, 
              border: '1.5px solid',
              borderColor: active ? (isWeekend ? '#7c3aed' : 'var(--primary)') : 'var(--border)',
              background: active ? (isWeekend ? '#f5f3ff' : 'rgba(88, 131, 59, 0.08)') : 'var(--surface)',
              color: active ? (isWeekend ? '#6d28d9' : 'var(--primary)') : 'var(--text-muted)',
              fontWeight: 700, 
              fontSize: 11.5, 
              cursor: disabled ? 'default' : 'pointer', 
              transition: 'all 0.15s',
              fontFamily: 'var(--font-display), sans-serif'
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function WorkingDaysTab() {
  const [defaultDays, setDefaultDays]     = useState([1,2,3,4,5])
  const [editDefault, setEditDefault]     = useState([1,2,3,4,5])
  const [staffList, setStaffList]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [savingDefault, setSavingDefault] = useState(false)
  const [savingStaff, setSavingStaff]     = useState(null)
  const [search, setSearch]               = useState('')

  const [drafts, setDrafts] = useState({})

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/attendance/admin/working-days')
      setDefaultDays(res.data.defaultWorkDays || [1,2,3,4,5])
      setEditDefault(res.data.defaultWorkDays || [1,2,3,4,5])
      const staff = res.data.staff || []
      setStaffList(staff)
      const d = {}
      staff.forEach(s => {
        d[s._id] = {
          workingDays: s.workingDays && s.workingDays.length ? [...s.workingDays] : null,
          clientAssignment: s.clientAssignment || ''
        }
      })
      setDrafts(d)
    } catch {
      toast.error('Failed to load working days')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const saveDefault = async () => {
    try {
      setSavingDefault(true)
      await api.put('/attendance/admin/working-days/default', { workDays: editDefault })
      setDefaultDays(editDefault)
      toast.success('Default working days saved')
    } catch {
      toast.error('Failed to save default working days')
    } finally {
      setSavingDefault(false)
    }
  }

  const saveStaff = async (staffId) => {
    const draft = drafts[staffId]
    if (!draft) return
    const effectiveDays = draft.workingDays !== null ? draft.workingDays : defaultDays
    try {
      setSavingStaff(staffId)
      await api.put(`/attendance/admin/working-days/staff/${staffId}`, {
        workDays: effectiveDays,
        clientAssignment: draft.clientAssignment
      })
      toast.success('Team schedule updated')
      const res = await api.get('/attendance/admin/working-days')
      const updated = (res.data.staff || []).find(s => s._id === staffId)
      if (updated) {
        setStaffList(prev => prev.map(s => s._id === staffId ? updated : s))
        setDrafts(prev => ({ ...prev, [staffId]: {
          workingDays: updated.workingDays && updated.workingDays.length ? [...updated.workingDays] : null,
          clientAssignment: updated.clientAssignment || ''
        }}))
      }
    } catch {
      toast.error('Failed to update staff schedule')
    } finally {
      setSavingStaff(null)
    }
  }

  const resetStaff = (staffId) => {
    const s = staffList.find(x => x._id === staffId)
    if (!s) return
    setDrafts(prev => ({ ...prev, [staffId]: {
      workingDays: s.workingDays && s.workingDays.length ? [...s.workingDays] : null,
      clientAssignment: s.clientAssignment || ''
    }}))
  }

  const setDraftDays = (staffId, days) => setDrafts(prev => ({ ...prev, [staffId]: { ...prev[staffId], workingDays: days } }))
  const setDraftClient = (staffId, val) => setDrafts(prev => ({ ...prev, [staffId]: { ...prev[staffId], clientAssignment: val } }))

  const filtered = staffList.filter(s => {
    const q = search.toLowerCase()
    return !q || s.fullName?.toLowerCase().includes(q) || s.employeeId?.toLowerCase().includes(q)
  })

  const hasWeekend = (days) => days && (days.includes(0) || days.includes(6))

  return (
    <div style={{ fontFamily: 'var(--font-display), sans-serif' }}>
      {/* Company Default Panel */}
      <div className="panel" style={{ marginBottom: 24, padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(88, 131, 59, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={17} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)' }}>Company Default Working Days</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Applies to all staff without custom schedules</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <DayCheckboxes value={editDefault} onChange={setEditDefault} />
          <button 
            className="la-export-btn" 
            onClick={saveDefault} 
            disabled={savingDefault}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, fontSize: 12, padding: '0 16px', borderRadius: 8 }}
          >
            {savingDefault ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Default
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
          Current: <strong style={{ color: 'var(--text)' }}>{defaultDays.map(d => DAY_FULL[d]).join(', ') || 'None'}</strong>
        </div>
      </div>

      {/* Staff-wise Schedule Panel */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)' }}>Staff-wise Schedule</div>
        <div className="la-search" style={{ width: 220 }}>
          <Search size={13} />
          <input 
            placeholder="" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ height: 32, fontSize: 12, paddingLeft: 38 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <Briefcase size={36} color="var(--text-light)" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>No staff found</div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Working Days</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const draft = drafts[s._id] || { workingDays: null, clientAssignment: '' }
                  const isCustom = draft.workingDays !== null
                  const displayDays = isCustom ? draft.workingDays : editDefault
                  const weekendWork = hasWeekend(displayDays)
                  const isDirty = JSON.stringify(draft.workingDays) !== JSON.stringify(s.workingDays && s.workingDays.length ? s.workingDays : null)
                    || draft.clientAssignment !== (s.clientAssignment || '')

                  return (
                    <tr key={s._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {/* Employee */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={s.fullName} size={32} />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{s.fullName}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{s.employeeId || '—'} · {s.designation || 'Team Member'}</div>
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                              {weekendWork && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#6d28d9', background: '#f5f3ff', border: '1px solid #e9d5ff', borderRadius: 4, padding: '1px 6px' }}>
                                  Weekend
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Working Days */}
                      <td style={{ padding: '12px 16px' }}>
                        <DayCheckboxes
                          value={displayDays}
                          onChange={(days) => setDraftDays(s._id, days)}
                        />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => saveStaff(s._id)}
                            disabled={savingStaff === s._id || !isDirty}
                            className="btn-icon btn-hover"
                            style={{ 
                              width: 28, 
                              height: 28, 
                              borderRadius: 6, 
                              color: isDirty ? '#16a34a' : 'var(--text-light)',
                              background: isDirty ? 'rgba(22, 163, 74, 0.08)' : 'transparent',
                              border: isDirty ? 'none' : '1px solid var(--border)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isDirty ? 'pointer' : 'default',
                              opacity: isDirty ? 1 : 0.5
                            }}
                            title="Save Changes"
                          >
                            {savingStaff === s._id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          </button>
                          
                          {isDirty && (
                            <button
                              onClick={() => resetStaff(s._id)}
                              className="btn-icon btn-hover"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                color: 'var(--text-light)',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="Reset Changes"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeaveRequests() {
  const location = useLocation()
  const isLeave = location.pathname.startsWith('/leave')
  const [activeTab, setActiveTab] = useState(isLeave ? 'leave' : 'attendance')

  useEffect(() => {
    setActiveTab(isLeave ? 'leave' : 'attendance')
  }, [location.pathname, isLeave])

  useEffect(() => {
    const id = 'la-page-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.innerHTML = pageStyles
      document.head.appendChild(el)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      {/* Tabs */}
      <div className="la-tabs" style={{ marginBottom:22 }}>
        {isLeave ? (
          <>
            <button className={`la-tab${activeTab === 'leave' ? ' active' : ''}`} onClick={() => setActiveTab('leave')}>
              <Calendar size={14} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
              Leave Requests
            </button>
            <button className={`la-tab${activeTab === 'policy' ? ' active' : ''}`} onClick={() => setActiveTab('policy')}>
              <ShieldCheck size={14} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
              Leave Policy
            </button>
          </>
        ) : (
          <>
            <button className={`la-tab${activeTab === 'attendance' ? ' active' : ''}`} onClick={() => setActiveTab('attendance')}>
              <ClipboardList size={14} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
              Attendance
            </button>
            <button className={`la-tab${activeTab === 'workingdays' ? ' active' : ''}`} onClick={() => setActiveTab('workingdays')}>
              <Briefcase size={14} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
              Working Days
            </button>
          </>
        )}
      </div>

      {activeTab === 'leave'        && <LeaveTab />}
      {activeTab === 'policy'       && <LeavePolicy />}
      {activeTab === 'attendance'   && <AttendanceTab />}
      {activeTab === 'workingdays'  && <WorkingDaysTab />}
    </PageShell>
  )
}

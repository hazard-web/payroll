import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Mail, Phone, Briefcase, Calendar, Landmark, CreditCard, Trash2, Code,
  FileText, Loader2, IndianRupee, Shield, FileDigit, Edit, X, User,
  ExternalLink, Eye, Download, Clock, ClipboardList, MoreVertical, Plus
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import PageShell, { TabBar as ShellTabBar } from '../components/PageShell'


const TABS = [
  { id: 'details', label: 'Details', icon: User },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'leave', label: 'Leave', icon: Calendar },
  { id: 'salary', label: 'Salary Slip', icon: FileText },
]

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
      {Icon && <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Icon size={18} /></div>}
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{value || '—'}</div>
      </div>
    </div>
  )
}

function DossierField({ label, value }) {
  return (
    <div className="dossier-field">
      <div className="dossier-field-label">{label}</div>
      <div className="dossier-field-value">{value || '—'}</div>
    </div>
  )
}

function DocumentCard({ label, document }) {
  if (!document?.url) {
    return (
      <div style={{
        border: '1px dashed var(--border)', borderRadius: 12, padding: 20,
        background: 'var(--bg)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13
      }}>
        <FileText size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div>Not uploaded yet</div>
      </div>
    )
  }

  const isPdf = document.url.startsWith('data:application/pdf')
  const isImage = document.url.startsWith('data:image')

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 12, padding: 16,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 12
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{label}</div>
      {isImage ? (
        <img
          src={document.url}
          alt={label}
          style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}
        />
      ) : isPdf ? (
        <div style={{
          height: 120, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8
        }}>
          <FileText size={32} color="var(--primary)" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF Document</span>
        </div>
      ) : null}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {document.originalName || 'Document'}
      </div>
      {document.uploadedAt && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Uploaded {new Date(document.uploadedAt).toLocaleDateString('en-IN')}
        </div>
      )}
      <a
        href={document.url}
        download={document.originalName || label}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
          color: 'var(--primary)', textDecoration: 'none'
        }}
      >
        <ExternalLink size={14} /> View / Download
      </a>
    </div>
  )
}

function InputField({ label, name, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="label">
        {label}{required && <span style={{ color: 'var(--primary)' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="input-field"
        style={{ width: '100%' }}
      />
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div style={{ padding: 48, textAlign: 'center', background: 'var(--bg)', borderRadius: 12, color: 'var(--text-muted)' }}>
      <ClipboardList size={32} style={{ marginBottom: 12, opacity: 0.35 }} />
      <div style={{ fontSize: 14, fontWeight: 600 }}>{message}</div>
    </div>
  )
}


function leaveDurationDays(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
  return diff > 0 ? diff : 1
}

function StatusBadge({ status }) {
  const cls = status === 'Approved' ? 'badge-emerald'
    : status === 'Rejected' ? 'badge-red'
    : status === 'Pending' ? 'badge-navy'
    : 'badge-navy'
  return <span className={`badge ${cls}`}>{status}</span>
}

function AttendanceStatusBadge({ record }) {
  if (record.punchIn && record.punchOut) {
    const cls = record.workStatus === 'Full Day' ? 'badge-emerald'
      : record.workStatus === 'Half Day' ? 'badge-navy'
      : record.workStatus === 'LOP' ? 'badge-red' : 'badge-navy'
    return <span className={`badge ${cls}`}>{record.workStatus || 'Complete'}</span>
  }
  if (record.punchIn) {
    return <span className="badge" style={{ background: 'var(--bg)', color: 'var(--primary)' }}>Active</span>
  }
  return <span className="badge" style={{ background: 'var(--text)', color: '#ffffff' }}>Absent</span>
}

const initials = (name) => {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function DocumentCardRow({ label, document }) {
  const isUploaded = Boolean(document?.url);
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '16px',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: 120
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
        {/* Icon Box */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: isUploaded ? 'rgba(88, 131, 59, 0.08)' : 'var(--bg)',
          color: isUploaded ? 'var(--primary)' : 'var(--text-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {label === 'Profile Picture' ? <User size={18} /> : <FileText size={18} />}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            {isUploaded ? (
              <>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'rgba(88, 131, 59, 0.08)', padding: '2px 6px', borderRadius: 4 }}>
                  Verified ✓
                </span>
                {document.uploadedAt && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    on {new Date(document.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>
                Not uploaded
              </span>
            )}
          </div>
        </div>
      </div>
      
      {isUploaded && (
        <a 
          href={document.url} 
          download={document.originalName || label}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ width: '100%', height: 32, borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          <Download size={12} /> Download / View
        </a>
      )}
    </div>
  );
}

export default function StaffDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(true)

  const [deleting, setDeleting] = useState(false)

  const [attendance, setAttendance] = useState([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceLoaded, setAttendanceLoaded] = useState(false)

  const [leaves, setLeaves] = useState([])
  const [leavesLoading, setLeavesLoading] = useState(false)
  const [leavesLoaded, setLeavesLoaded] = useState(false)

  const [payslips, setPayslips] = useState([])
  const [payslipsLoading, setPayslipsLoading] = useState(false)
  const [payslipsLoaded, setPayslipsLoaded] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState({})

  const [activeTab, setActiveTab] = useState('details')

  const [showEditModal, setShowEditModal] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [activePayslipMenuId, setActivePayslipMenuId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '', employeeId: '', email: '', phone: '', designation: '', department: '',
    type: 'Employee', joiningDate: '', annualCTC: '', baseSalary: ''
  })

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/staff/${id}`)
        const data = res.data.data
        setStaff(data)
        setFormData({
          fullName: data.fullName,
          employeeId: data.employeeId || '',
          email: data.email,
          phone: data.phone || '',
          designation: data.designation || '',
          department: data.department || '',
          type: data.type || 'Employee',
          joiningDate: data.joiningDate ? data.joiningDate.split('T')[0] : '',
          annualCTC: data.salaryDetails?.annualCTC || '',
          baseSalary: data.salaryDetails?.baseSalary || ''
        })
      } catch (err) {
        toast.error('Failed to load staff details')
        navigate('/staff')
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [id, navigate])

  const fetchAttendance = useCallback(async () => {
    setAttendanceLoading(true)
    try {
      const attRes = await api.get(`/attendance/admin/staff/${id}`)
      setAttendance(attRes.data.history || [])
      setAttendanceLoaded(true)
    } catch (err) {
      toast.error('Failed to load attendance records')
    } finally {
      setAttendanceLoading(false)
    }
  }, [id])

  const fetchLeaves = useCallback(async () => {
    setLeavesLoading(true)
    try {
      const res = await api.get(`/leaves/admin/pending?staffId=${id}`)
      setLeaves(res.data.data || [])
      setLeavesLoaded(true)
    } catch (err) {
      toast.error('Failed to load leave records')
    } finally {
      setLeavesLoading(false)
    }
  }, [id])

  const fetchPayslips = useCallback(async () => {
    if (!staff) return
    setPayslipsLoading(true)
    try {
      const params = { limit: 100 }
      if (staff.employeeId) {
        params.employeeId = staff.employeeId
      } else {
        params.search = staff.fullName
      }
      const res = await api.get('/payslips', { params })
      const data = res.data.data || []
      const filtered = staff.employeeId
        ? data.filter((p) => p.employeeId === staff.employeeId)
        : data.filter((p) => p.employeeName?.toLowerCase() === staff.fullName?.toLowerCase())
      setPayslips(filtered)
      setPayslipsLoaded(true)
    } catch (err) {
      toast.error('Failed to load salary slips')
    } finally {
      setPayslipsLoading(false)
    }
  }, [staff])

  useEffect(() => {
    if (staff) {
      fetchAttendance()
      fetchLeaves()
      fetchPayslips()
    }
  }, [staff, fetchAttendance, fetchLeaves, fetchPayslips])

  useEffect(() => {
    if (staff) {
      const hash = window.location.hash
      if (hash) {
        const timer = setTimeout(() => {
          const element = document.querySelector(hash)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
          }
        }, 200)
        return () => clearTimeout(timer)
      }
    }
  }, [staff])


  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${staff.fullName}?`)) return
    setDeleting(true)
    try {
      await api.delete(`/staff/${id}`)
      toast.success('Team member deleted')
      navigate('/staff')
    } catch (err) {
      toast.error('Failed to delete')
      setDeleting(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        designation: formData.designation,
        department: formData.department,
        type: formData.type,
        joiningDate: formData.joiningDate,
        salaryDetails: {
          annualCTC: parseFloat(formData.annualCTC) || 0,
          baseSalary: parseFloat(formData.baseSalary) || 0
        }
      }
      if (formData.employeeId?.trim()) payload.employeeId = formData.employeeId.trim()

      const res = await api.put(`/staff/${id}`, payload)
      setStaff(res.data.data)
      toast.success('Team details updated')
      setShowEditModal(false)
    } catch (err) {
      toast.error(err.message || 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadPayslip = async (payslip) => {
    const key = payslip._id
    setDownloadLoading((prev) => ({ ...prev, [key]: true }))
    try {
      const res = await api.get(`/payslips/${payslip._id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Payslip_${payslip.employeeName.replace(/\s+/g, '_')}_${payslip.month}_${payslip.year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Payslip downloaded')
    } catch (err) {
      toast.error('Failed to download payslip')
    } finally {
      setDownloadLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Loader2 size={40} className="animate-spin text-muted" /></div>
  if (!staff) return null

  const isIntern = staff.type === 'Intern'

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <button
        type="button"
        className="page-back-btn"
        onClick={() => navigate('/staff')}
        style={{ marginBottom: 20 }}
      >
        <ArrowLeft size={16} /> Back to Team
      </button>

      {/* ── Top Header Card ── */}
      <div style={{ 
        background: 'var(--surface)', 
        borderRadius: 16, 
        border: '1px solid var(--border)', 
        padding: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: 20,
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {/* Initials Avatar Box */}
          <div style={{
            width: 72, 
            height: 72, 
            borderRadius: 14, 
            background: 'var(--primary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white', 
            fontSize: 24, 
            fontWeight: 800,
            flexShrink: 0
          }}>
            {staff.documents?.profileImage?.url ? (
              <img src={staff.documents.profileImage.url} alt={staff.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} />
            ) : (
              initials(staff.fullName)
            )}
          </div>
          <div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{staff.fullName}</h1>
              <span style={{ 
                padding: '3px 10px', 
                borderRadius: 100, 
                fontSize: 10, 
                fontWeight: 700, 
                background: 'rgba(88, 131, 59, 0.08)', 
                color: 'var(--primary)', 
                border: '1px solid rgba(88, 131, 59, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                Active Employee
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge ${staff.type === 'Employee' ? 'badge-navy' : 'badge-emerald'}`} style={{ fontSize: 10, padding: '2px 8px', textTransform: 'uppercase' }}>
                {staff.type}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {staff.designation || 'No Designation'} - {staff.department || 'General'}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', position: 'relative' }}>
          <button 
            onClick={() => setShowEditModal(true)} 
            className="btn-secondary"
            style={{ 
              height: 38,
              padding: '0 16px',
              borderRadius: 8, 
              border: '1px solid var(--border)', 
              background: 'var(--surface)', 
              color: 'var(--text)', 
              fontWeight: 700, 
              fontSize: 12,
              cursor: 'pointer', 
              display: 'flex', 
              gap: 8, 
              alignItems: 'center' 
            }}
          >
            <Edit size={14} /> Edit Details
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId(activeMenuId === staff._id ? null : staff._id);
            }} 
            className="btn-icon btn-hover"
            style={{ 
              width: 38, 
              height: 38, 
              borderRadius: 8, 
              border: '1px solid var(--border)', 
              background: 'var(--surface)', 
              color: 'var(--text-light)', 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
          >
            <MoreVertical size={16} />
          </button>

          {activeMenuId === staff._id && (
            <>
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 110 }} 
                onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} 
              />
              <div style={{
                position: 'absolute',
                right: 0,
                top: '110%',
                width: 180,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-lg)',
                zIndex: 120,
                display: 'flex',
                flexDirection: 'column',
                padding: '6px 0',
                textAlign: 'left'
              }}>
                <button
                  onClick={() => { 
                    setActiveMenuId(null); 
                    handleDelete();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#ef4444',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Trash2 size={13} /> Deactivate Employee
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <ShellTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'details' && (
            <>
              {/* ── Horizontal Stats Grid Card ── */}
              <div style={{
        background: 'var(--surface)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 20,
        marginBottom: 20
      }}>
        {/* Stat 1: Employee ID */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(88, 131, 59, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileDigit size={16} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee ID</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{staff.employeeId || '—'}</div>
          </div>
        </div>

        {/* Stat 2: Date of Joining */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(88, 131, 59, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={16} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date of Joining</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
              {staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </div>
          </div>
        </div>

        {/* Stat 3: Department */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(88, 131, 59, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Landmark size={16} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{staff.department || '—'}</div>
          </div>
        </div>

        {/* Stat 4: Designation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(88, 131, 59, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={16} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Designation</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{staff.designation || '—'}</div>
          </div>
        </div>
      </div>

      {/* ── Three Column Details Panel Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20,
        marginBottom: 20
      }}>
        {/* Panel 1: Employment & Role */}
        <div className="detail-panel-card">
          <div className="panel-card-header">
            <User size={16} style={{ color: 'var(--primary)' }} />
            <span>Employment & Role</span>
          </div>
          <div className="panel-card-body">
            <div className="info-kv-row">
              <span className="info-kv-key">Employee ID / Code</span>
              <span className="info-kv-val">{staff.employeeId || '—'}</span>
            </div>
            <div className="info-kv-row">
              <span className="info-kv-key">Date of Joining</span>
              <span className="info-kv-val">{staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
            </div>
            <div className="info-kv-row">
              <span className="info-kv-key">Department</span>
              <span className="info-kv-val">{staff.department || '—'}</span>
            </div>
            <div className="info-kv-row">
              <span className="info-kv-key">Designation</span>
              <span className="info-kv-val">{staff.designation || '—'}</span>
            </div>
            <div className="info-kv-row">
              <span className="info-kv-key">Employment Type</span>
              <span className="info-kv-val">{staff.type || 'Employee'}</span>
            </div>
            <div className="info-kv-row">
              <span className="info-kv-key">Work Location</span>
              <span className="info-kv-val">{staff.workLocation || 'Office'}</span>
            </div>
          </div>
        </div>

        {/* Panel 2: Contact & Personal */}
        <div className="detail-panel-card">
          <div className="panel-card-header">
            <Mail size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ color: 'var(--primary)' }}>Contact & Personal</span>
          </div>
          <div className="panel-card-body">
            <div className="info-kv-row">
              <span className="info-kv-key">Email Address</span>
              <span className="info-kv-val">{staff.email || '—'}</span>
            </div>
            <div className="info-kv-row">
              <span className="info-kv-key">Phone Number</span>
              <span className="info-kv-val">{staff.phone || '—'}</span>
            </div>
            <div className="info-kv-row">
              <span className="info-kv-key">Date of Birth</span>
              <span className="info-kv-val">{staff.dob ? new Date(staff.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
            </div>
            <div className="info-kv-row">
              <span className="info-kv-key">Gender</span>
              <span className="info-kv-val">{staff.gender || '—'}</span>
            </div>
            <div className="info-kv-row" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
              <span className="info-kv-key">Registered Address</span>
              <span className="info-kv-val" style={{ textAlign: 'left', lineHeight: 1.4 }}>
                {staff.address && (staff.address.street || staff.address.city)
                  ? `${staff.address.street || ''}${staff.address.street ? ', ' : ''}${staff.address.city || ''}${staff.address.state ? `, ${staff.address.state}` : ''}${staff.address.pincode ? ` - ${staff.address.pincode}` : ''}`
                  : '—'}
              </span>
            </div>
            <div className="info-kv-row" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
              <span className="info-kv-key">Emergency Contact</span>
              <span className="info-kv-val" style={{ textAlign: 'left', lineHeight: 1.4 }}>
                {staff.emergencyContact?.name
                  ? `${staff.emergencyContact.name} (${staff.emergencyContact.relationship || 'Emergency'}) · ${staff.emergencyContact.phone || ''}`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Panel 3: Compensation & Financial */}
        <div className="detail-panel-card">
          <div className="panel-card-header">
            <Landmark size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ color: 'var(--primary)' }}>Compensation & Financial</span>
          </div>
          <div className="panel-card-body">
            <div className="info-kv-row">
              <span className="info-kv-key">PAN Card Number</span>
              <span className="info-kv-val">{staff.panNumber || staff.financials?.panNumber || '—'}</span>
            </div>
            <div className="info-kv-row">
              <span className="info-kv-key">Bank Name</span>
              <span className="info-kv-val">{staff.bankDetails?.bankName || staff.financials?.bankName || '—'}</span>
            </div>
            <div className="info-kv-row">
              <span className="info-kv-key">Account Number</span>
              <span className="info-kv-val">{staff.bankDetails?.accountNumber || staff.financials?.accountNumber || '—'}</span>
            </div>
            <div className="info-kv-row">
              <span className="info-kv-key">IFSC Code</span>
              <span className="info-kv-val">{staff.bankDetails?.ifscCode || staff.financials?.ifscCode || '—'}</span>
            </div>
            
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {isIntern ? 'Monthly Stipend Structure' : 'Annual CTC Structure'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.01em' }}>
                ₹ {isIntern 
                  ? (staff.salaryDetails?.baseSalary?.toLocaleString('en-IN') || 0) 
                  : (staff.salaryDetails?.annualCTC?.toLocaleString('en-IN') || 0)}
              </div>
              
              <div style={{ 
                padding: '10px 12px', 
                background: 'rgba(88, 131, 59, 0.04)', 
                borderRadius: 8, 
                border: '1px solid rgba(88, 131, 59, 0.12)', 
                fontSize: 11, 
                color: 'var(--text-muted)', 
                lineHeight: 1.4, 
                marginTop: 10 
              }}>
                {isIntern
                  ? 'Intern payslips will be generated based on this monthly stipend amount. Absence deductions are applied automatically in the generator.'
                  : 'Employee payslips (Basic, HRA, PF, PT, etc.) are automatically derived from this Annual CTC figure during generation.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Identity Document Registry ── */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        padding: '24px',
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} color="var(--primary)" />
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Identity Document Registry</h3>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px 0' }}>Official verification document attachments uploaded by this employee.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {/* Card 1: Profile Picture */}
          <DocumentCardRow label="Profile Picture" document={staff.documents?.profileImage} />
          {/* Card 2: Aadhar Card */}
          <DocumentCardRow label="Aadhar Card" document={staff.documents?.aadharCard} />
          {/* Card 3: PAN Card */}
          <DocumentCardRow label="PAN Card" document={staff.documents?.panCard} />
        </div>
      </div>

      <style>{`
        .detail-panel-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .panel-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 800;
          color: var(--primary);
        }
        .panel-card-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .info-kv-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 1px dashed var(--border);
        }
        .info-kv-row:last-child {
          border-bottom: none;
        }
        .info-kv-key {
          font-size: 12.5px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .info-kv-val {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text);
          text-align: right;
        }
      `}</style>
            </>
          )}

          {activeTab === 'attendance' && (
            attendance.length > 0 ? (
              <div id="attendance" style={{
              background: 'var(--surface)',
              borderRadius: 16,
              border: '1px solid var(--border)',
              padding: '24px',
              marginBottom: 20
            }}>
              <h3 style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 800, margin: '0 0 4px 0' }}>Attendance Records</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
                Complete attendance history for {staff.fullName}.
              </p>
              <div style={{ overflowX: 'auto', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', fontSize: '12.5px' }}>
                  <colgroup>
                    <col style={{ width: '35%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '13%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                      {['Date', 'Check-In', 'Check-Out', 'Total Hours', 'Status'].map((h, i) => (
                        <th key={h} style={{
                          padding: '12px 16px',
                          color: 'var(--text-muted)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          textAlign: i === 4 ? 'right' : 'left'
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>
                          {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {record.punchIn ? new Date(record.punchIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {record.punchOut ? new Date(record.punchOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {record.totalHours > 0 ? `${record.totalHours.toFixed(2)}h` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <AttendanceStatusBadge record={record} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            ) : (
              <EmptyState message="No attendance records found for this team member." />
            )
          )}

          {activeTab === 'leave' && (
            leaves.length > 0 ? (
              <div id="leave" style={{
              background: 'var(--surface)',
              borderRadius: 16,
              border: '1px solid var(--border)',
              padding: '24px',
              marginBottom: 20
            }}>
              <h3 style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 800, margin: '0 0 4px 0' }}>Leave History</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
                All leave requests submitted by {staff.fullName}.
              </p>
              <div style={{ overflowX: 'auto', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', fontSize: '12.5px' }}>
                  <colgroup>
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                      {['Leave Type', 'Applied Date', 'Leave Period', 'Duration', 'Status', 'Reason'].map((h) => (
                        <th key={h} style={{
                          padding: '12px 14px',
                          color: 'var(--text-muted)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text)' }}>{l.type}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                          {new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text)' }}>
                          {new Date(l.startDate).toLocaleDateString('en-IN')} – {new Date(l.endDate).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text)' }}>
                          {leaveDurationDays(l.startDate, l.endDate)} day{leaveDurationDays(l.startDate, l.endDate) !== 1 ? 's' : ''}
                        </td>
                        <td style={{ padding: '12px 14px' }}><StatusBadge status={l.status} /></td>
                        <td style={{ padding: '12px 14px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }} title={l.reason}>{l.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            ) : (
              <EmptyState message="No leave history found for this team member." />
            )
          )}

          {activeTab === 'salary' && (
            payslips.length > 0 ? (
              <div id="salary" style={{
              background: 'var(--surface)',
              borderRadius: 16,
              border: '1px solid var(--border)',
              padding: '24px',
              marginBottom: 20
            }}>
              <h3 style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 800, margin: '0 0 4px 0' }}>Salary Slips</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
                All generated payslips for {staff.fullName}.
              </p>
              <div style={{ overflowX: 'auto', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', fontSize: '12.5px' }}>
                  <colgroup>
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                      {['Month / Year', 'Department', 'Net Salary', 'Generated On', 'Actions'].map((h, i) => (
                        <th key={h} style={{
                          padding: '12px 16px',
                          color: 'var(--text-muted)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          textAlign: i === 4 ? 'right' : 'left'
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payslips.map((p, idx) => (
                      <tr key={p._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>{p.month} {p.year}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{p.department || '—'}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary)' }}>₹ {p.netSalary?.toLocaleString('en-IN') || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 16px', position: 'relative', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setActivePayslipMenuId(activePayslipMenuId === p._id ? null : p._id); 
                              }}
                              className="btn-icon btn-hover"
                              style={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: 6, 
                                color: 'var(--primary)',
                                background: 'rgba(88, 131, 59, 0.08)',
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

                            {activePayslipMenuId === p._id && (
                              <>
                                <div 
                                  style={{ position: 'fixed', inset: 0, zIndex: 110 }} 
                                  onClick={(e) => { e.stopPropagation(); setActivePayslipMenuId(null); }} 
                                />
                                <div style={{
                                  position: 'absolute',
                                  right: 16,
                                  top: (idx >= payslips.length - 2 && payslips.length > 2) ? 'auto' : '80%',
                                  bottom: (idx >= payslips.length - 2 && payslips.length > 2) ? '80%' : 'auto',
                                  width: 130,
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 10,
                                  boxShadow: 'var(--shadow-lg)',
                                  zIndex: 120,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  padding: '6px 0',
                                  textAlign: 'left'
                                }}>
                                  <button
                                    onClick={() => { setActivePayslipMenuId(null); navigate(`/payslips/${p._id}`); }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    style={{
                                      width: '100%',
                                      textAlign: 'left',
                                      padding: '8px 16px',
                                      background: 'none',
                                      border: 'none',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: 'var(--text)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      transition: 'background 0.15s'
                                    }}
                                  >
                                    <Eye size={12} /> View
                                  </button>
                                  <button
                                    onClick={() => { setActivePayslipMenuId(null); handleDownloadPayslip(p); }}
                                    disabled={downloadLoading[p._id]}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    style={{
                                      width: '100%',
                                      textAlign: 'left',
                                      padding: '8px 16px',
                                      background: 'none',
                                      border: 'none',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: 'var(--text)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      transition: 'background 0.15s'
                                    }}
                                  >
                                    {downloadLoading[p._id] ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
                                  </button>
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
            ) : (
              <EmptyState message="No generated payslips found for this team member." />
            )
          )}
        </motion.div>
      </AnimatePresence>

      {/* Edit Staff Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(26, 26, 26, 0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowEditModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
            >
              <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: 'var(--primary)' }}>Edit Team Profile</h2>
                <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}><X size={24} /></button>
              </div>
              <div style={{ padding: 32, overflowY: 'auto', flex: 1 }}>
                <form id="editStaffForm" onSubmit={handleEditSubmit}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 24, background: 'var(--bg)', padding: 6, borderRadius: 12 }}>
                    {['Employee', 'Intern'].map((type) => (
                      <button
                        key={type} type="button" onClick={() => setFormData({ ...formData, type })}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontWeight: 700,
                          background: formData.type === type ? 'var(--primary)' : 'transparent',
                          color: formData.type === type ? '#ffffff' : 'var(--text-muted)',
                          boxShadow: formData.type === type ? 'var(--shadow-sm)' : 'none', cursor: 'pointer'
                        }}
                      >{type}</button>
                    ))}
                  </div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: 16 }}>Basic Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <InputField label="Full Name" name="fullName" value={formData.fullName} onChange={handleInputChange} autoComplete="off" required />
                    <InputField label="Employee ID (optional)" name="employeeId" value={formData.employeeId} onChange={handleInputChange} autoComplete="off" />
                    <InputField label="Email Address" type="email" name="email" value={formData.email} onChange={handleInputChange} autoComplete="off" required />
                    <InputField label="Phone Number" name="phone" value={formData.phone} onChange={handleInputChange} autoComplete="off" required />
                    <InputField label="Department" name="department" value={formData.department} onChange={handleInputChange} autoComplete="off" required />
                    <InputField label="Designation" name="designation" value={formData.designation} onChange={handleInputChange} autoComplete="off" required />
                    <InputField label="Joining Date" type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} autoComplete="off" required />
                  </div>
                  <h4 style={{ color: 'var(--primary)', marginTop: 24, marginBottom: 16 }}>Salary Structure</h4>
                  {formData.type === 'Employee' ? (
                    <InputField label="Annual CTC (in ₹)" type="number" name="annualCTC" value={formData.annualCTC} onChange={handleInputChange} required />
                  ) : (
                    <InputField label="Monthly Stipend (Base Salary)" type="number" name="baseSalary" value={formData.baseSalary} onChange={handleInputChange} required />
                  )}
                </form>
              </div>
              <div style={{ padding: '24px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '12px 24px', borderRadius: 12, border: '2px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" form="editStaffForm" disabled={submitting} style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: '#ffffff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </motion.div>
    </PageShell>
  )
}

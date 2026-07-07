import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Mail, Phone, Briefcase, Calendar, Landmark, CreditCard, Trash2, Code,
  FileText, Loader2, IndianRupee, Shield, FileDigit, Edit, X, User,
  ExternalLink, Eye, Download, Clock, ClipboardList
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

export default function StaffDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
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


  const [showEditModal, setShowEditModal] = useState(false)
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
    if (activeTab === 'attendance' && !attendanceLoaded) fetchAttendance()
    if (activeTab === 'leave' && !leavesLoaded) fetchLeaves()
    if (activeTab === 'salary' && !payslipsLoaded && staff) fetchPayslips()
  }, [activeTab, attendanceLoaded, leavesLoaded, payslipsLoaded, staff, fetchAttendance, fetchLeaves, fetchPayslips])


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
    <PageShell wide>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <button
        type="button"
        className="page-back-btn"
        onClick={() => navigate('/staff')}
        style={{ marginBottom: 20 }}
      >
        <ArrowLeft size={16} /> Back to Team
      </button>

      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}>
        {/* Header */}
        <div style={{ padding: 'var(--space-8)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 12, overflow: 'hidden',
              background: staff.type === 'Employee' ? 'var(--primary)' : 'var(--emerald)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 32, fontWeight: 800
            }}>
              {staff.documents?.profileImage?.url ? (
                <img src={staff.documents.profileImage.url} alt={staff.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                staff.fullName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: 24, marginBottom: 8 }}>{staff.fullName}</h1>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`badge ${staff.type === 'Employee' ? 'badge-navy' : 'badge-emerald'}`}>{staff.type}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{staff.designation || 'No Designation'} · {staff.department || 'General'}</span>
                {staff.profileCompleted ? (
                  <span style={{ padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(88,131,59, 0.1)', color: '#58833b', border: '1px solid rgba(88,131,59, 0.2)' }}>✓ Profile Complete</span>
                ) : (
                  <span style={{ padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(234, 88, 12, 0.1)', color: '#c2410c', border: '1px solid rgba(234, 88, 12, 0.2)' }}>Profile Incomplete</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setShowEditModal(true)} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Edit size={16} /> Edit Details
            </button>
            <button onClick={handleDelete} disabled={deleting} style={{ padding: '10px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ padding: '20px 32px 0', borderBottom: '1px solid var(--border)' }}>
          <ShellTabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Tab Content */}
        <div style={{ padding: 'var(--space-8)' }}>
          {activeTab === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '24px 32px' }}>
              
              {/* Section 1: Employment Details */}
              <div className="dossier-section">
                <div className="dossier-section-title">Employment & Role Specifications</div>
                <div className="dossier-grid">
                  <DossierField label="Employee ID / Code" value={staff.employeeId} />
                  <DossierField label="Date of Joining" value={staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                  <DossierField label="Department" value={staff.department} />
                  <DossierField label="Designation" value={staff.designation} />
                  {staff.pfNumber && <DossierField label="PF Number" value={staff.pfNumber} />}
                </div>
              </div>

              {/* Section 2: Contact & Personal File */}
              <div className="dossier-section">
                <div className="dossier-section-title">Contact & Personal File</div>
                <div className="dossier-grid">
                  <DossierField label="Email Address" value={staff.email} />
                  <DossierField label="Phone Number" value={staff.phone} />
                  <DossierField label="Date of Birth" value={staff.dob ? new Date(staff.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                  <DossierField label="Gender" value={staff.gender} />
                  
                  <div className="dossier-span-2">
                    <DossierField 
                      label="Registered Address" 
                      value={
                        staff.address && (staff.address.street || staff.address.city)
                          ? `${staff.address.street || ''}${staff.address.street ? ', ' : ''}${staff.address.city || ''}${staff.address.state ? `, ${staff.address.state}` : ''}${staff.address.pincode ? ` - ${staff.address.pincode}` : ''}`
                          : '—'
                      } 
                    />
                  </div>
                  <div className="dossier-span-2">
                    <DossierField 
                      label="Emergency Contact" 
                      value={
                        staff.emergencyContact?.name
                          ? `${staff.emergencyContact.name} (${staff.emergencyContact.relationship || 'Emergency'}) · ${staff.emergencyContact.phone || ''}`
                          : '—'
                      } 
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Financial Profile & Compensation */}
              <div className="dossier-section">
                <div className="dossier-section-title">Compensation & Financial Information</div>
                <div className="dossier-grid">
                  <DossierField label="PAN Card Number" value={staff.panNumber || staff.financials?.panNumber} />
                  <DossierField label="Bank Name" value={staff.bankDetails?.bankName || staff.financials?.bankName} />
                  <DossierField label="Account Number" value={staff.bankDetails?.accountNumber || staff.financials?.accountNumber} />
                  <DossierField label="IFSC Code" value={staff.bankDetails?.ifscCode || staff.financials?.ifscCode} />
                  
                  <div className="dossier-span-4" style={{ marginTop: 12 }}>
                    {isIntern ? (
                      <DossierField label="Monthly Stipend (Base Salary)" value={`₹ ${staff.salaryDetails?.baseSalary?.toLocaleString('en-IN') || 0}`} />
                    ) : (
                      <DossierField label="Annual CTC Structure" value={`₹ ${staff.salaryDetails?.annualCTC?.toLocaleString('en-IN') || 0}`} />
                    )}
                    <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 12 }}>
                      {isIntern
                        ? 'Intern payslips will be generated based on this monthly stipend amount. Absence deductions are applied automatically in the generator.'
                        : 'Employee payslips (Basic, HRA, PF, PT, etc.) are automatically derived from this Annual CTC figure during generation.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Document Registry */}
              <div className="dossier-section" style={{ marginBottom: 0 }}>
                <div className="dossier-section-title">Identity Document Registry</div>
                <p style={{ fontSize: 12.5, color: 'var(--text-light)', marginBottom: 16 }}>Official verification document attachments uploaded by this employee.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
                  <DocumentCard label="Profile Picture" document={staff.documents?.profileImage} />
                  <DocumentCard label="Aadhar Card" document={staff.documents?.aadharCard} />
                  <DocumentCard label="PAN Card" document={staff.documents?.panCard} />
                </div>
              </div>

              {/* Encapsulated Dossier Styles */}
              <style>{`
                .dossier-section {
                  margin-bottom: 36px;
                }
                .dossier-section-title {
                  font-size: 12.5px;
                  font-weight: 800;
                  color: var(--primary);
                  text-transform: uppercase;
                  letter-spacing: 0.08em;
                  border-bottom: 1px dashed var(--border);
                  padding-bottom: 8px;
                  margin-bottom: 20px;
                }
                .dossier-grid {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 20px 32px;
                }
                .dossier-span-2 {
                  grid-column: span 2;
                }
                .dossier-span-4 {
                  grid-column: span 4;
                }
                .dossier-field {
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  min-height: 48px;
                }
                .dossier-field-label {
                  font-size: 10.5px;
                  color: var(--text-light);
                  font-weight: 800;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  margin-bottom: 4px;
                }
                .dossier-field-value {
                  font-size: 14px;
                  font-weight: 700;
                  color: var(--text);
                }
                .dossier-action-cell {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  min-height: 48px;
                }
                @media (max-width: 950px) {
                  .dossier-grid {
                    grid-template-columns: repeat(2, 1fr);
                  }
                  .dossier-span-2 {
                    grid-column: span 2;
                  }
                }
                @media (max-width: 600px) {
                  .dossier-grid {
                    grid-template-columns: 1fr;
                  }
                  .dossier-span-2, .dossier-span-4 {
                    grid-column: span 1;
                  }
                }
              `}</style>
            </motion.div>
          )}

          {activeTab === 'attendance' && (
            <motion.div key="attendance" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: 8 }}>Attendance Records</h3>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-muted)' }}>
                Complete attendance history for {staff.fullName}.
              </p>
              {attendanceLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 size={32} className="animate-spin" /></div>
              ) : attendance.length === 0 ? (
                <EmptyState message="No attendance records found for this employee." />
              ) : (
                <div style={{ overflowX: 'auto', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: 16, color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: 16, color: 'var(--text-muted)', fontWeight: 600 }}>Check-In</th>
                        <th style={{ padding: 16, color: 'var(--text-muted)', fontWeight: 600 }}>Check-Out</th>
                        <th style={{ padding: 16, color: 'var(--text-muted)', fontWeight: 600 }}>Total Hours</th>
                        <th style={{ padding: 16, color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((record) => (
                        <tr key={record._id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: 16, fontWeight: 500, color: 'var(--text)' }}>
                            {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ padding: 16, color: 'var(--text-muted)' }}>
                            {record.punchIn ? new Date(record.punchIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td style={{ padding: 16, color: 'var(--text-muted)' }}>
                            {record.punchOut ? new Date(record.punchOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td style={{ padding: 16, color: 'var(--text-muted)' }}>
                            {record.totalHours > 0 ? `${record.totalHours.toFixed(2)}h` : '—'}
                          </td>
                          <td style={{ padding: 16 }}><AttendanceStatusBadge record={record} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'leave' && (
            <motion.div key="leave" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: 8 }}>Leave History</h3>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-muted)' }}>
                All leave requests submitted by {staff.fullName}.
              </p>
              {leavesLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 size={32} className="animate-spin" /></div>
              ) : leaves.length === 0 ? (
                <EmptyState message="No leave records found for this employee." />
              ) : (
                <div style={{ overflowX: 'auto', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Leave Type</th>
                        <th style={{ padding: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Applied Date</th>
                        <th style={{ padding: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Leave Period</th>
                        <th style={{ padding: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Duration</th>
                        <th style={{ padding: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.map((l) => (
                        <tr key={l._id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: 14, fontWeight: 700 }}>{l.type}</td>
                          <td style={{ padding: 14, color: 'var(--text-muted)' }}>
                            {new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: 14 }}>
                            {new Date(l.startDate).toLocaleDateString('en-IN')} – {new Date(l.endDate).toLocaleDateString('en-IN')}
                          </td>
                          <td style={{ padding: 14, fontWeight: 600 }}>
                            {leaveDurationDays(l.startDate, l.endDate)} day{leaveDurationDays(l.startDate, l.endDate) !== 1 ? 's' : ''}
                          </td>
                          <td style={{ padding: 14 }}><StatusBadge status={l.status} /></td>
                          <td style={{ padding: 14, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.reason}>{l.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'salary' && (
            <motion.div key="salary" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: 8 }}>Salary Slips</h3>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-muted)' }}>
                All generated payslips for {staff.fullName}.
              </p>
              {payslipsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 size={32} className="animate-spin" /></div>
              ) : payslips.length === 0 ? (
                <EmptyState message="No salary slips generated for this employee yet." />
              ) : (
                <div style={{ overflowX: 'auto', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: 16, color: 'var(--text-muted)', fontWeight: 600 }}>Month / Year</th>
                        <th style={{ padding: 16, color: 'var(--text-muted)', fontWeight: 600 }}>Department</th>
                        <th style={{ padding: 16, color: 'var(--text-muted)', fontWeight: 600 }}>Net Salary</th>
                        <th style={{ padding: 16, color: 'var(--text-muted)', fontWeight: 600 }}>Generated On</th>
                        <th style={{ padding: 16, color: 'var(--text-muted)', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payslips.map((p) => (
                        <tr key={p._id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: 16, fontWeight: 700, color: 'var(--text)' }}>{p.month} {p.year}</td>
                          <td style={{ padding: 16, color: 'var(--text-muted)' }}>{p.department || '—'}</td>
                          <td style={{ padding: 16, fontWeight: 600 }}>₹ {p.netSalary?.toLocaleString('en-IN') || '—'}</td>
                          <td style={{ padding: 16, color: 'var(--text-muted)' }}>
                            {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: 16 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => navigate(`/payslips/${p._id}`)}
                                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--primary)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              >
                                <Eye size={14} /> View
                              </button>
                              <button
                                onClick={() => handleDownloadPayslip(p)}
                                disabled={downloadLoading[p._id]}
                                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              >
                                {downloadLoading[p._id] ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                Download
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

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
                    <InputField label="Full Name" name="fullName" value={formData.fullName} onChange={handleInputChange} required />
                    <InputField label="Employee ID (optional)" name="employeeId" value={formData.employeeId} onChange={handleInputChange} />
                    <InputField label="Email Address" type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                    <InputField label="Phone Number" name="phone" value={formData.phone} onChange={handleInputChange} required />
                    <InputField label="Department" name="department" value={formData.department} onChange={handleInputChange} required />
                    <InputField label="Designation" name="designation" value={formData.designation} onChange={handleInputChange} required />
                    <InputField label="Joining Date" type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} required />
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

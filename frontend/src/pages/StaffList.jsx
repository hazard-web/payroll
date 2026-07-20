import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Briefcase, Loader2, FilePlus, Eye, Users, Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import PageShell, { PageLoading } from '../components/PageShell'
import {
  InputField, SegmentedControl, Modal, Avatar, EmptyState, SearchInput
} from '../components/UI'

const TYPE_OPTIONS = [
  { value: 'Employee', label: 'Employee' },
  { value: 'Intern', label: 'Intern' },
]

const FILTER_OPTIONS = [
  { value: 'All', label: 'All' },
  { value: 'Employee', label: 'Employee' },
  { value: 'Intern', label: 'Intern' },
]

export default function StaffList() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    fullName: '', employeeId: '', email: '', phone: '', designation: '', department: '',
    type: 'Employee', joiningDate: '', annualCTC: '', baseSalary: ''
  })

  useEffect(() => { fetchStaff() }, [])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const res = await api.get('/staff')
      setStaff(res.data.data)
    } catch (err) {
      toast.error('Failed to fetch staff data')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const nextValue = name === 'email' ? value : value.toUpperCase()
    setFormData(prev => ({ ...prev, [name]: nextValue }))
  }

  const handlePhoneChange = (e) => {
    const { name, value } = e.target
    const sanitized = value.replace(/\D/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, [name]: sanitized }))
  }

  // Convert DD-MM-YYYY → YYYY-MM-DD (ISO) so Mongoose Date can parse it.
  // If the string is already in YYYY-MM-DD or ISO format, it is returned as-is.
  const normalizeDate = (value) => {
    if (!value) return value
    // Match DD-MM-YYYY
    const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/
    const match = String(value).match(ddmmyyyy)
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`
    }
    return value
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Client-side phone validation
    if (formData.phone && formData.phone.replace(/\D/g, '').length !== 10) {
      toast.error('Phone number must be exactly 10 digits.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        designation: formData.designation,
        department: formData.department,
        type: formData.type,
        joiningDate: normalizeDate(formData.joiningDate),
        salaryDetails: {
          annualCTC: parseFloat(formData.annualCTC) || 0,
          baseSalary: parseFloat(formData.baseSalary) || 0
        }
      }
      if (formData.employeeId && formData.employeeId.trim()) {
        payload.employeeId = formData.employeeId.trim()
      }

      let res;
      if (editingStaff) {
        res = await api.put(`/staff/${editingStaff._id}`, payload)
        setStaff(staff.map(s => s._id === editingStaff._id ? res.data.data : s))
        toast.success('Team details updated')
      } else {
        res = await api.post('/staff', payload)
        const portalAccess = res.data.portalAccess
        if (portalAccess?.emailError) {
          toast.error(`Team member added, but invite email failed: ${portalAccess.emailError}`)
        } else {
          toast.success('Team member added — invite email sent to their inbox!')
        }
        setStaff([res.data.data, ...staff])
      }

      setShowModal(false)
      setEditingStaff(null)
      resetForm()
    } catch (err) {
      // Prefer the server's validation message over Axios's generic network message
      const serverMsg = err.response?.data?.message
      toast.error(serverMsg || err.message || 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      fullName: '', employeeId: '', email: '', phone: '', designation: '', department: '',
      type: 'Employee', joiningDate: '', annualCTC: '', baseSalary: ''
    })
  }

  const handleEdit = (e, person) => {
    e.stopPropagation()
    setEditingStaff(person)
    setFormData({
      fullName: person.fullName,
      employeeId: person.employeeId || '',
      email: person.email,
      phone: person.phone || '',
      designation: person.designation || '',
      department: person.department || '',
      type: person.type || 'Employee',
      joiningDate: person.joiningDate ? person.joiningDate.split('T')[0] : '',
      annualCTC: person.salaryDetails?.annualCTC || '',
      baseSalary: person.salaryDetails?.baseSalary || ''
    })
    setShowModal(true)
  }


  const filteredStaff = staff.filter(s => {
    const matchesSearch = (s.fullName?.toLowerCase() || '').includes(search.toLowerCase()) ||
                          (s.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
                          (s.designation?.toLowerCase() || '').includes(search.toLowerCase())
    const matchesType = filterType === 'All' || s.type === filterType
    return matchesSearch && matchesType
  })

  if (loading) return <PageLoading label="Loading team…" />

  return (
    <PageShell wide>

      {/* ── Professional Sticky Header ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        margin: 'calc(-1 * var(--page-padding-y)) calc(-1 * var(--page-padding-x)) 0',
        padding: '0 var(--page-padding-x)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Row 1: Title + Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingTop: 20,
          paddingBottom: 14,
          flexWrap: 'wrap',
        }}>
          {/* Left: Title block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #000))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent)'
            }}>
              <Users size={22} color="white" strokeWidth={2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{
                  margin: 0,
                  fontSize: 22, fontWeight: 800,
                  color: 'var(--text)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.2
                }}>Team Management</h1>
                <span style={{
                  background: 'var(--primary-tint, rgba(88,131,59,0.12))',
                  color: 'var(--primary)',
                  border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                  borderRadius: 99, padding: '2px 10px',
                  fontSize: 12, fontWeight: 700
                }}>
                  {staff.length} members
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                Manage your regular employees and interns.
              </p>
            </div>
          </div>

          {/* Right: Filter tabs + Add button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            <SegmentedControl
              options={FILTER_OPTIONS}
              value={filterType}
              onChange={setFilterType}
              style={{ height: 40, minWidth: 220 }}
            />
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary"
              style={{ height: 40, padding: '0 18px', whiteSpace: 'nowrap', borderRadius: 10, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={18} strokeWidth={2.5} /> Add member
            </button>
          </div>
        </div>

        {/* Row 2: Full-width Search */}
        <div style={{ paddingBottom: 14 }}>
          <div style={{ position: 'relative', maxWidth: '100%' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or designation…"
              style={{
                width: '100%',
                height: 42,
                paddingLeft: 42, paddingRight: 16,
                border: '1.5px solid var(--border)',
                borderRadius: 10,
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 14, fontWeight: 500,
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ marginTop: 24 }}>
      {filteredStaff.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No team members found"
          description="Try adjusting your search criteria or add a new team member."
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary btn-md">
              <Plus size={16} /> Add team member
            </button>
          }
        />
      ) : (
        <div className="table-card" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Type</th>
                <th>Profile</th>
                <th>Compensation</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((person, i) => (
                <motion.tr
                  key={person._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <Avatar
                        name={person.fullName}
                        className={person.type === 'Intern' ? 'avatar--intern' : 'avatar--employee'}
                        style={{ width: 48, height: 48, fontSize: 16, borderRadius: 12 }}
                      />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{person.fullName}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                          {person.employeeId || <em style={{ opacity: 0.7 }}>No ID assigned</em>}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{person.designation || 'No Designation'}</div>
                    <div className="text-muted" style={{ fontSize: 11, fontWeight: 500 }}>{person.department || 'N/A'}</div>
                  </td>

                  <td>
                    <span className={`badge ${person.type === 'Intern' ? 'badge-navy' : 'badge-emerald'}`}>
                      {person.type}
                    </span>
                  </td>

                  <td>
                    {person.profileCompleted
                      ? <span className="badge badge-emerald">✓ Profile Complete</span>
                      : <span className="badge badge-red">Profile Incomplete</span>
                    }
                  </td>

                  <td>
                    <div>
                      <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                        {person.type === 'Employee' ? 'Annual CTC' : 'Monthly Stipend'}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{person.type === 'Employee'
                          ? (person.salaryDetails?.annualCTC?.toLocaleString() || 0)
                          : (person.salaryDetails?.baseSalary?.toLocaleString() || 0)
                        }
                      </div>
                    </div>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/generate?staffId=${person._id}`); }}
                        className="btn-icon"
                        title="Generate Payslip"
                      >
                        <FilePlus size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/staff/${person._id}`); }}
                        className="btn-primary btn-sm"
                        style={{ padding: '8px 16px' }}
                      >
                        <Eye size={14} /> View Details
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>{/* ── end content ── */}


      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingStaff(null); resetForm(); }}
        title={editingStaff ? 'Edit Team Member' : 'Add New Team Member'}
        size="md"
      >
        <form id="addStaffForm" onSubmit={handleSubmit}>
          <SegmentedControl
            options={TYPE_OPTIONS}
            value={formData.type}
            onChange={(v) => setFormData({ ...formData, type: v })}
            style={{ marginBottom: 'var(--space-6)' }}
          />

          <h4 className="panel-title" style={{ marginBottom: 'var(--space-4)' }}>Basic Information</h4>
          <div className="form-grid-2">
            <InputField label="Full Name" name="fullName" value={formData.fullName} onChange={handleInputChange} required />
            <InputField
              label="Employee ID (optional)"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              placeholder="Leave blank to assign later"
            />
            <InputField label="Email Address" type="email" name="email" value={formData.email} onChange={handleInputChange} required />
            <InputField
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              required
              placeholder="10-digit mobile"
              hint="Enter 10-digit number"
            />
            <InputField label="Department" name="department" value={formData.department} onChange={handleInputChange} required />
            <InputField label="Designation" name="designation" value={formData.designation} onChange={handleInputChange} required />
            <InputField label="Joining Date" type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} required />
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '100%', padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <strong>New flow:</strong> PAN, DOB, Address, Bank & Emergency details are filled by the employee from the Team Portal after first login.
              </div>
            </div>
          </div>

          <h4 className="panel-title" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>Salary Structure</h4>
          {formData.type === 'Employee' ? (
            <div>
              <InputField label="Annual CTC (in ₹)" type="number" name="annualCTC" value={formData.annualCTC} onChange={handleInputChange} required />
              <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                Note: For Regular Employees, the payslip engine derives HRA, PF, etc., automatically from the CTC.
              </p>
            </div>
          ) : (
            <div>
              <InputField label="Monthly Stipend (Base Salary)" type="number" name="baseSalary" value={formData.baseSalary} onChange={handleInputChange} required />
              <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                Note: For Interns, this base amount is used to calculate the final stipend after absence deductions.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 'var(--space-6)', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowModal(false); setEditingStaff(null); resetForm(); }} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : (editingStaff ? 'Update Team Member' : 'Save Team Member')}
            </button>
          </div>
        </form>
      </Modal>
    </PageShell>
  )
}
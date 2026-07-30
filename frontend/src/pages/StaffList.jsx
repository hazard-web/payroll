import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Briefcase, Loader2, FilePlus, Users, Search, MoreVertical,
  ArrowDownAZ, ArrowUpZA, ArrowUpDown
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

export default function StaffList() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, openUp: false })
  const menuBtnRefs = useRef({})
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    fullName: '', employeeId: '', email: '', phone: '', designation: '', department: '',
    type: 'Employee', joiningDate: '', annualCTC: '', baseSalary: ''
  })
  const [isOnboardingInvite, setIsOnboardingInvite] = useState(false)

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)
  const observerRef = useRef(null)
  const searchTimer = useRef(null)

  const fetchStaff = useCallback(async (pageNum, searchVal, typeVal, sortF, sortO, reset = false) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)
    try {
      const params = new URLSearchParams({ page: pageNum, limit: 20 })
      if (searchVal) params.set('search', searchVal)
      if (typeVal && typeVal !== 'All') params.set('type', typeVal)
      if (sortF) params.set('sort', sortF)
      if (sortO) params.set('order', sortO)
      
      const res = await api.get('/staff?' + params.toString())
      const newStaff = res.data?.data || []
      const pagination = res.data?.pagination || {}
      setStaff(prev => (pageNum === 1 || reset) ? newStaff : [...prev, ...newStaff])
      setHasMore(pageNum < (pagination.totalPages || 1))
    } catch (err) {
      toast.error('Failed to fetch staff data')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Initial load
  useEffect(() => { fetchStaff(1, search, filterType, sortField, sortOrder) }, [])

  // Debounced search + type filter + sort — resets to page 1
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      setHasMore(true)
      fetchStaff(1, search, filterType, sortField, sortOrder)
    }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [search, filterType, sortField, sortOrder])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage(prev => {
            const next = prev + 1
            fetchStaff(next, search, filterType, sortField, sortOrder)
            return next
          })
        }
      },
      { threshold: 0.1 }
    )
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasMore, loadingMore, loading, fetchStaff, search, filterType, sortField, sortOrder])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const nextValue = name === 'email' ? value : value.toUpperCase()
    setFormData(prev => ({ ...prev, [name]: nextValue }))
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
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
    if (!isOnboardingInvite && formData.phone && formData.phone.replace(/\D/g, '').length !== 10) {
      toast.error('Phone number must be exactly 10 digits.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        fullName: isOnboardingInvite ? 'Pending Onboarding' : formData.fullName,
        email: formData.email,
        phone: isOnboardingInvite ? '' : formData.phone,
        designation: formData.designation,
        department: formData.department,
        type: formData.type,
        joiningDate: isOnboardingInvite ? new Date().toISOString().split('T')[0] : normalizeDate(formData.joiningDate),
        isOnboarding: isOnboardingInvite,
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
    setIsOnboardingInvite(false)
  }

  const handleDeleteStaff = async (id) => {
    try {
      await api.delete(`/staff/${id}`)
      setStaff(prev => prev.filter(s => s._id !== id))
      toast.success('Team member deactivated/deleted successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Deletion failed')
    }
  }

  const handleResendInvite = async (staffId) => {
    const loadingToast = toast.loading('Sending portal setup link...')
    try {
      const res = await api.post(`/staff/${staffId}/provision-portal`)
      toast.dismiss(loadingToast)
      if (res.data.success) {
        toast.success(res.data.message || 'Setup link sent successfully!')
        if (res.data.resetLink) {
          navigator.clipboard.writeText(res.data.resetLink)
          toast.success('Setup link copied to clipboard!', { icon: '📋' })
        }
      } else {
        toast.error(res.data.message || 'Failed to send setup link')
      }
    } catch (err) {
      toast.dismiss(loadingToast)
      toast.error(err.response?.data?.message || err.message || 'Failed to send setup link')
    }
  }

  // No client-side filter — search/type are sent server-side
  const displayStaff = staff

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

  if (loading) return <PageLoading label="Loading team…" />

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 20,
      }}>
        {/* Left: Filter tabs + Add button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <SegmentedControl
            options={FILTER_OPTIONS}
            value={filterType}
            onChange={setFilterType}
            style={{ height: 32 }}
          />
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{ 
              height: 32, 
              padding: '0 14px', 
              whiteSpace: 'nowrap', 
              borderRadius: 8, 
              fontSize: 12, 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} strokeWidth={2.5} /> Add member
          </button>
        </div>

        {/* Right: Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 300, minWidth: 200 }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search team…"
            style={{
              width: '100%',
              height: 32,
              paddingLeft: 32, paddingRight: 12,
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 12, fontWeight: 500,
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div>
      {displayStaff.length === 0 && !loadingMore ? (
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
        <div className="table-card" style={{ overflowX: 'auto', width: '100%', minHeight: displayStaff.length <= 2 ? '280px' : 'auto' }}>
          <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: 'var(--primary)' }}>
                {[
                  { label: 'Employee', field: 'fullName' },
                  { label: 'Role', field: 'designation' },
                  { label: 'Type', field: 'type' },
                  { label: 'Profile', field: 'profileCompleted' },
                  { label: 'Compensation', field: 'createdAt' }, // using createdAt as proxy or disable sort
                  { label: 'Actions', field: '' }
                ].map((h, i) => (
                  <th key={h.label} 
                      onClick={() => h.field && h.field !== '' ? handleSort(h.field) : null}
                      style={{
                        textAlign: i === 5 ? 'right' : 'left',
                        color: 'var(--primary-text)',
                        padding: '10px 16px',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        cursor: h.field ? 'pointer' : 'default'
                      }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: i === 5 ? 'flex-end' : 'flex-start', gap: 4 }}>
                      {h.label}
                      {h.field && sortField === h.field && (
                        sortOrder === 'asc' ? <ArrowDownAZ size={12} /> : <ArrowUpZA size={12} />
                      )}
                      {h.field && sortField !== h.field && (
                        <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && displayStaff.length === 0 ? (
                Array(5).fill(0).map((_, idx) => (
                  <tr key={`skel-${idx}`}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                        <div>
                          <div style={{ width: 120, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', marginBottom: 6 }} />
                          <div style={{ width: 80, height: 10, borderRadius: 4, background: 'var(--bg-alt)', animation: 'pulse 1.5s infinite' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ width: 100, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', marginBottom: 6 }} />
                      <div style={{ width: 60, height: 10, borderRadius: 4, background: 'var(--bg-alt)', animation: 'pulse 1.5s infinite' }} />
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ width: 50, height: 20, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ width: 70, height: 20, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ width: 60, height: 10, borderRadius: 4, background: 'var(--bg-alt)', animation: 'pulse 1.5s infinite', marginBottom: 6 }} />
                      <div style={{ width: 80, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                    </td>
                    <td style={{ padding: '10px 16px' }} />
                  </tr>
                ))
              ) : (
                displayStaff.map((person, i) => (
                <motion.tr
                  key={person._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/staff/${person._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                       <Avatar
                        name={person.fullName}
                        src={person.documents?.profileImage?.url}
                        className={person.type === 'Intern' ? 'avatar--intern' : 'avatar--employee'}
                        style={{ width: 32, height: 32, fontSize: 11, borderRadius: 8 }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{person.fullName}</div>
                        <div className="text-muted" style={{ fontSize: 10.5 }}>
                          {person.employeeId || <em style={{ opacity: 0.7 }}>No ID assigned</em>}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{person.designation || 'No Designation'}</div>
                    <div className="text-muted" style={{ fontSize: 10.5, fontWeight: 500 }}>{person.department || 'N/A'}</div>
                  </td>

                  <td style={{ padding: '10px 16px' }}>
                    <span className={`badge ${person.type === 'Intern' ? 'badge-navy' : 'badge-emerald'}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                      {person.type}
                    </span>
                  </td>

                  <td style={{ padding: '10px 16px' }}>
                    {person.profileCompleted
                      ? <span className="badge badge-emerald" style={{ fontSize: 10, padding: '3px 8px' }}>✓ Profile Complete</span>
                      : <span className="badge badge-red" style={{ fontSize: 10, padding: '3px 8px' }}>Profile Incomplete</span>
                    }
                  </td>

                  <td style={{ padding: '10px 16px' }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                        {person.type === 'Employee' ? 'Annual CTC' : 'Monthly Stipend'}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{person.type === 'Employee'
                          ? (person.salaryDetails?.annualCTC?.toLocaleString() || 0)
                          : (person.salaryDetails?.baseSalary?.toLocaleString() || 0)
                        }
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        ref={el => { menuBtnRefs.current[person._id] = el; }}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (activeMenuId === person._id) {
                            setActiveMenuId(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const menuHeight = 220; // approximate dropdown height
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const openUp = spaceBelow < menuHeight;
                            setMenuPos({
                              top: openUp ? rect.top : rect.bottom + 4,
                              left: rect.right - 200,
                              openUp
                            });
                            setActiveMenuId(person._id);
                          }
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

                      {activeMenuId === person._id && createPortal(
                        <>
                          <div 
                            style={{ position: 'fixed', inset: 0, zIndex: 9998 }} 
                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} 
                          />
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'fixed',
                              left: Math.max(8, menuPos.left),
                              ...(menuPos.openUp
                                ? { bottom: window.innerHeight - menuPos.top + 4 }
                                : { top: menuPos.top }
                              ),
                              width: 200,
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 10,
                              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
                              zIndex: 9999,
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '6px 0',
                            textAlign: 'left'
                          }}>
                            <DropdownItem onClick={() => { setActiveMenuId(null); navigate(`/staff/${person._id}`); }}>
                              👁️ View Details
                            </DropdownItem>
                            <DropdownItem onClick={(e) => { setActiveMenuId(null); handleEdit(e, person); }}>
                              ✏️ Edit Employee
                            </DropdownItem>
                            <DropdownItem onClick={() => { setActiveMenuId(null); navigate(`/attendance?search=${person.employeeId || person.fullName}`); }}>
                              📅 Attendance
                            </DropdownItem>
                            <DropdownItem onClick={() => { setActiveMenuId(null); navigate(`/payslips/generate?staffId=${person._id}`); }}>
                              📄 Generate Payslip
                            </DropdownItem>
                            <DropdownItem onClick={() => { setActiveMenuId(null); handleResendInvite(person._id); }}>
                              ✉️ Resend Portal Link
                            </DropdownItem>
                            <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                            <DropdownItem 
                              onClick={() => { 
                                setActiveMenuId(null); 
                                if (window.confirm(`Are you sure you want to deactivate/delete ${person.fullName}? All associated records (attendance, leaves, payslips) will be permanently deleted.`)) {
                                  handleDeleteStaff(person._id);
                                }
                              }} 
                              style={{ color: '#ef4444' }}
                            >
                              🚫 Deactivate Employee
                            </DropdownItem>
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                  </td>
                </motion.tr>
              )))}
            </tbody>
          </table>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13, gap: 8, alignItems: 'center' }}>
          <Loader2 size={16} className="animate-spin" />
          Loading more…
        </div>
      )}
      {!hasMore && displayStaff.length > 0 && (
        <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          All {displayStaff.length} team members loaded
        </div>
      )}
      </div>{/* ── end content ── */}


      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingStaff(null); resetForm(); }}
        title={editingStaff ? 'Edit Team Member' : 'Add New Team Member'}
        size="md"
        className="modal-compact"
      >
        <form id="addStaffForm" onSubmit={handleSubmit}>
          <SegmentedControl
            options={TYPE_OPTIONS}
            value={formData.type}
            onChange={(v) => setFormData({ ...formData, type: v })}
            style={{ marginBottom: 8 }}
          />

          {!editingStaff && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(88, 131, 59, 0.06)', border: '1px solid rgba(88, 131, 59, 0.12)', borderRadius: 6, marginBottom: 8 }}>
              <input
                type="checkbox"
                id="isOnboardingInvite"
                checked={isOnboardingInvite}
                onChange={(e) => {
                  setIsOnboardingInvite(e.target.checked);
                  if (e.target.checked) {
                    setFormData(prev => ({
                      ...prev,
                      fullName: '',
                      phone: '',
                      designation: '',
                      joiningDate: '',
                      annualCTC: '',
                      baseSalary: ''
                    }));
                  }
                }}
                style={{ cursor: 'pointer', width: 12, height: 12 }}
              />
              <label htmlFor="isOnboardingInvite" style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', userSelect: 'none' }}>
                🚀 Magic Link Invite (Only Email, Department & Designation required)
              </label>
            </div>
          )}

          <h4 className="panel-title">Basic Information</h4>
          <div className="form-grid-2">
            {!isOnboardingInvite && (
              <InputField label="Full Name" name="fullName" value={formData.fullName} onChange={handleInputChange} autoComplete="off" required />
            )}
            <InputField
              label="Employee ID (optional)"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              placeholder="Leave blank to assign later"
              autoComplete="off"
            />
            <InputField label="Email Address" type="email" name="email" value={formData.email} onChange={handleInputChange} autoComplete="off" required />
            {!isOnboardingInvite && (
              <InputField
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                required
                placeholder="10-digit mobile"
                hint="Enter 10-digit number"
                autoComplete="off"
              />
            )}
            <InputField label="Department" name="department" value={formData.department} onChange={handleInputChange} autoComplete="off" required />
            <InputField label="Designation" name="designation" value={formData.designation} onChange={handleInputChange} autoComplete="off" required />
            {!isOnboardingInvite && (
              <InputField label="Joining Date" type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} autoComplete="off" required />
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: isOnboardingInvite ? 'span 2' : 'auto' }}>
              <div style={{ width: '100%', padding: '6px 8px', background: 'var(--bg)', borderRadius: 6, fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                <strong>Onboarding flow:</strong> {isOnboardingInvite ? 'The employee will fill their Full Name, Phone, Address, Bank details, PAN & upload documents from the Team Portal.' : 'PAN, DOB, Address, Bank & Emergency details are filled by the employee from the Team Portal after first login.'}
              </div>
            </div>
          </div>

          {!isOnboardingInvite && (
            <>
              <h4 className="panel-title">Salary Structure</h4>
              {formData.type === 'Employee' ? (
                <div>
                  <InputField label="Annual CTC (in ₹)" type="number" name="annualCTC" value={formData.annualCTC} onChange={handleInputChange} required />
                  <p className="text-muted" style={{ fontSize: 9.5, marginTop: 0, lineHeight: 1.3 }}>
                    Note: For Regular Employees, the payslip engine derives HRA, PF, etc., automatically from the CTC.
                  </p>
                </div>
              ) : (
                <div>
                  <InputField label="Monthly Stipend (Base Salary)" type="number" name="baseSalary" value={formData.baseSalary} onChange={handleInputChange} required />
                  <p className="text-muted" style={{ fontSize: 9.5, marginTop: 0, lineHeight: 1.3 }}>
                    Note: For Interns, this base amount is used to calculate the final stipend after absence deductions.
                  </p>
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowModal(false); setEditingStaff(null); resetForm(); }} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : (editingStaff ? 'Update Team Member' : (isOnboardingInvite ? 'Send Invite Link' : 'Save Team Member'))}
            </button>
          </div>
        </form>
      </Modal>
    </PageShell>
  )
}
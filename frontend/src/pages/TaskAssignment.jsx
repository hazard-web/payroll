import { useState, useEffect, useRef } from 'react'
import {
  Plus, Search, X, CheckCircle2, Clock, Loader2,
  ChevronDown, Trash2, FolderOpen, ArrowRight,
  RefreshCw, Calendar, AlertCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../api'
import PageShell, { PageHeader } from '../components/PageShell'

// ─── Constants ───────────────────────────────────────────────
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

const PRIORITY_META = {
  Low:    { color: '#64748b', bg: '#64748b12', dot: '#94a3b8' },
  Medium: { color: '#2563eb', bg: '#dbeafe',   dot: '#60a5fa' },
  High:   { color: '#ea580c', bg: '#ffedd5',   dot: '#fb923c' },
  Urgent: { color: '#dc2626', bg: '#fee2e2',   dot: '#f87171' },
}
const STATUS_META = {
  'Pending':     { color: '#64748b', bg: '#f1f5f9', label: 'Pending' },
  'Accepted':    { color: '#2563eb', bg: '#dbeafe', label: 'Accepted' },
  'In Progress': { color: '#d97706', bg: '#fef3c7', label: 'In Progress' },
  'Completed':   { color: '#16a34a', bg: '#dcfce7', label: 'Completed' },
}
const STATUSES = ['Pending', 'Accepted', 'In Progress', 'Completed']

// ─── Avatar ──────────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  const palette = ['#6366f1','#2563eb','#0891b2','#059669','#d97706','#dc2626','#7c3aed']
  const color   = palette[(name?.charCodeAt(0) || 0) % palette.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}cc, ${color})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 800, fontSize: size * 0.38,
      boxShadow: `0 2px 8px ${color}40`
    }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

// ─── Staff Searchable Dropdown ────────────────────────────────
function StaffPicker({ staffList, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const ref = useRef(null)
  const selected = staffList.find(s => s._id === value) || null
  const list = query
    ? staffList.filter(s =>
        s.fullName?.toLowerCase().includes(query.toLowerCase()) ||
        s.designation?.toLowerCase().includes(query.toLowerCase()) ||
        s.department?.toLowerCase().includes(query.toLowerCase())
      )
    : staffList

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => { setOpen(true) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderRadius: 10, border: `1.5px solid ${open ? '#2563eb' : 'var(--border)'}`,
          background: 'var(--bg)', cursor: 'pointer', transition: 'border-color .15s', minHeight: 46
        }}
      >
        {selected ? <Avatar name={selected.fullName} size={28} /> : (
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          </div>
        )}
        {open
          ? <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Type to search employee…"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text)' }} />
          : <span style={{ flex: 1, fontSize: 14, color: selected ? 'var(--text)' : '#94a3b8', fontWeight: selected ? 600 : 400 }}>
              {selected ? selected.fullName : 'Select employee…'}
            </span>
        }
        {selected
          ? <button onClick={e => { e.stopPropagation(); onChange(''); setQuery('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}>
              <X size={15} />
            </button>
          : <ChevronDown size={15} color="#94a3b8" />
        }
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.14)', maxHeight: 260, overflowY: 'auto'
        }}>
          {list.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>No employees found</div>
            : list.map(s => (
                <div key={s._id} onClick={() => { onChange(s._id); setQuery(''); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer',
                    background: value === s._id ? '#eff6ff' : 'transparent', transition: 'background .1s'
                  }}
                  onMouseEnter={e => { if (value !== s._id) e.currentTarget.style.background = 'var(--bg)' }}
                  onMouseLeave={e => { if (value !== s._id) e.currentTarget.style.background = 'transparent' }}
                >
                  <Avatar name={s.fullName} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{s.fullName}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                      {[s.designation, s.department, s.employeeId].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {value === s._id && <CheckCircle2 size={16} color="#2563eb" />}
                </div>
              ))
          }
        </div>
      )}
    </div>
  )
}

// ─── Assign Modal ────────────────────────────────────────────
function AssignModal({ open, onClose, staffList, onSaved }) {
  const EMPTY = { staffId: '', projectName: '', description: '', priority: 'Medium', dueDate: '' }
  const [form,   setForm]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const submit = async e => {
    e.preventDefault()
    if (!form.staffId)          return toast.error('Please select an employee')
    if (!form.projectName.trim()) return toast.error('Project name is required')
    setSaving(true)
    try {
      const res = await api.post('/assigned-tasks/admin', {
        staffId:     form.staffId,
        title:       form.projectName,
        description: form.description,
        priority:    form.priority,
        dueDate:     form.dueDate || undefined,
      })
      if (res.data.success) {
        toast.success('Project assigned!')
        onSaved(res.data.task)
        setForm(EMPTY)
        onClose()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign project')
    } finally {
      setSaving(false)
    }
  }

  const pm = PRIORITY_META[form.priority]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', padding: 16
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520, background: 'var(--surface)',
        borderRadius: 20, border: '1px solid var(--border)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
        display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>
              Work Management
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Assign Project</h2>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 7, display: 'flex', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Employee */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              👤 Assign To  <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <StaffPicker staffList={staffList} value={form.staffId} onChange={id => setForm({ ...form, staffId: id })} />
          </div>

          {/* Project name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              📁 Project Name  <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              autoFocus={false}
              required
              value={form.projectName}
              onChange={e => setForm({ ...form, projectName: e.target.value })}
              placeholder="e.g. Website Redesign, Mobile App MVP, Q3 Sales Report…"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
                border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                outline: 'none', fontWeight: 500, boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              📝 Description <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Add scope, requirements, deliverables, notes…"
              rows={3}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.55,
                border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Priority + Due date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>🎯 Priority</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PRIORITIES.map(p => {
                  const m = PRIORITY_META[p]; const active = form.priority === p
                  return (
                    <button type="button" key={p} onClick={() => setForm({ ...form, priority: p })}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        border: `2px solid ${active ? m.color : 'var(--border)'}`,
                        background: active ? m.bg : 'transparent',
                        color: active ? m.color : '#94a3b8', transition: 'all .12s'
                      }}>
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>📅 Due Date</label>
              <input type="date" value={form.dueDate} min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {/* Summary preview */}
          {(form.staffId || form.projectName) && (() => {
            const emp = staffList.find(s => s._id === form.staffId)
            return (
              <div style={{ padding: '14px 16px', background: pm.bg, borderRadius: 12, border: `1.5px solid ${pm.color}30` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: pm.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Assignment Preview</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  {emp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={emp.fullName} size={32} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{emp.fullName}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{emp.designation || emp.department || ''}</div>
                      </div>
                    </div>
                  )}
                  {emp && form.projectName && <ArrowRight size={18} color={pm.color} />}
                  {form.projectName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FolderOpen size={16} color={pm.color} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{form.projectName}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, height: 48, borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{
                flex: 2, height: 48, borderRadius: 12, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? '#93c5fd' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                color: 'white', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: saving ? 'none' : '0 4px 18px rgba(37,99,235,0.35)', transition: 'all .15s'
              }}>
              {saving ? <><Loader2 size={17} className="animate-spin" /> Assigning…</> : <><Plus size={17} /> Assign Project</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Project Row (horizontal, like employee list) ─────────────
function ProjectCard({ project, onDelete, onStatusChange, submittingId, isLast }) {
  const pm      = PRIORITY_META[project.priority] || PRIORITY_META.Medium
  const sm      = STATUS_META[project.status]     || STATUS_META.Pending
  const sIdx    = STATUSES.indexOf(project.status)
  const next    = STATUSES[sIdx + 1]
  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== 'Completed'
  const loading = submittingId === project._id

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--surface)', borderBottom: isLast ? 'none' : '1px solid var(--border)',
      transition: 'background .15s',
      padding: '10px 20px',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
    >
      {/* Col 1 — Employee */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 200px', minWidth: 200 }}>
        <Avatar name={project.staff?.fullName} style={{ width: 28, height: 28, fontSize: 11 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.staff?.fullName || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Col 2 — Project */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <FolderOpen size={13} color={pm.color} />
          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.title}
          </span>
        </div>
        {project.description && (
          <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
            {project.description}
          </div>
        )}
      </div>

      {/* Col 3 — Priority badge */}
      <div style={{ width: 100, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{
          padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700',
          background: pm.bg, color: pm.color, textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          {project.priority}
        </span>
      </div>

      {/* Col 4 — Status badge */}
      <div style={{ width: 110, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{
          padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700',
          background: sm.bg, color: sm.color, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          {project.status === 'Completed' && '✓ '}{sm.label}
        </span>
      </div>

      {/* Col 5 — Due date */}
      <div style={{ width: 130, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {project.dueDate ? (
          <div style={{ fontSize: 11, color: isOverdue ? '#dc2626' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 500, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
              <Calendar size={12} />
              {new Date(project.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            {isOverdue && <div style={{ fontSize: 9, color: '#dc2626', fontWeight: 700, marginTop: 1 }}>Overdue</div>}
          </div>
        ) : (
          <span style={{ fontSize: 11, color: '#cbd5e1' }}>–</span>
        )}
      </div>

      {/* Col 6 — Action button */}
      <div style={{ width: 180, flexShrink: 0, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
        {project.status === 'Pending' ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', padding: '5px 12px', background: '#f1f5f9', borderRadius: 6 }}>
            Pending
          </span>
        ) : project.status === 'Accepted' ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', padding: '5px 12px', background: '#dbeafe', borderRadius: 6 }}>
            Accepted
          </span>
        ) : next ? (
          <button
            disabled={loading}
            onClick={() => onStatusChange(project._id, next)}
            style={{
              padding: '5px 12px', borderRadius: 6,
              border: `1.5px solid ${STATUS_META[next]?.color}60`,
              background: STATUS_META[next]?.bg, color: STATUS_META[next]?.color,
              fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : '✓'}
            Complete
          </button>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', padding: '5px 12px', background: '#dcfce7', borderRadius: 6 }}>
            ✓ Completed
          </span>
        )}
        <button
          onClick={() => onDelete(project._id)}
          style={{ padding: '5px 7px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}


// ─── Main Page ────────────────────────────────────────────────
export default function WorkManagement() {
  const [projects,     setProjects]     = useState([])
  const [staffList,    setStaffList]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [submittingId, setSubmittingId] = useState(null)
  const [modalOpen,    setModalOpen]    = useState(false)

  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterStaff,  setFilterStaff]  = useState('All')

  const load = async () => {
    setLoading(true)
    try {
      const [pr, sr] = await Promise.all([api.get('/assigned-tasks/admin'), api.get('/staff')])
      setProjects(pr.data.tasks || [])
      setStaffList(sr.data.data || [])
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleDelete = async id => {
    if (!window.confirm('Delete this project assignment?')) return
    try {
      await api.delete(`/assigned-tasks/admin/${id}`)
      toast.success('Deleted')
      setProjects(p => p.filter(t => t._id !== id))
    } catch { toast.error('Failed to delete') }
  }

  const handleStatusChange = async (id, newStatus) => {
    setSubmittingId(id)
    try {
      const res = await api.patch(`/assigned-tasks/admin/${id}/status`, { status: newStatus })
      if (res.data.success) {
        toast.success(`Moved to "${newStatus}"`)
        setProjects(p => p.map(t => t._id === id ? { ...t, ...res.data.task } : t))
      }
    } catch { toast.error('Failed to update') }
    finally { setSubmittingId(null) }
  }

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const statusMatch = filterStatus === 'All'
      || (filterStatus === 'In Progress' ? (p.status === 'In Progress' || p.status === 'Accepted') : p.status === filterStatus)
    return (
      (!q || p.title?.toLowerCase().includes(q) || p.staff?.fullName?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) &&
      statusMatch &&
      (filterStaff  === 'All' || p.staff?._id === filterStaff)
    )
  })

  const total      = projects.length
  const pending    = projects.filter(p => p.status === 'Pending').length
  const inProgress = projects.filter(p => p.status === 'In Progress' || p.status === 'Accepted').length
  const completed  = projects.filter(p => p.status === 'Completed').length
  const overdue    = projects.filter(p => p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'Completed').length

  return (
    <PageShell>
      <AssignModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        staffList={staffList}
        onSaved={task => setProjects(p => [task, ...p])}
      />

      <PageHeader
        title="Work Management"
        subtitle="Assign projects to employees and track their progress in real time."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            style={{
              height: 46, padding: '0 22px', display: 'flex', alignItems: 'center', gap: 8,
              borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              boxShadow: '0 4px 18px rgba(37,99,235,0.35)'
            }}
          >
            <Plus size={18} strokeWidth={2.5} /> Assign Project
          </button>
        }
      />

      {/* Stats — click any card to filter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 26 }}>
        {[
          { label: 'Total',       value: total,      color: '#2563eb', icon: FolderOpen, filter: 'All' },
          { label: 'Pending',     value: pending,    color: pending > 0 ? '#ea580c' : '#64748b', icon: Clock,         filter: 'Pending' },
          { label: 'In Progress', value: inProgress, color: '#d97706', icon: Loader2,    filter: 'In Progress' },
          { label: 'Completed',   value: completed,  color: '#16a34a', icon: CheckCircle2, filter: 'Completed' },
          { label: 'Overdue',     value: overdue,    color: overdue > 0 ? '#dc2626' : '#64748b', icon: AlertCircle,   filter: 'overdue' },
        ].map(({ label, value, color, icon: Icon, filter: f }) => {
          const isActive = (f === 'All' && filterStatus === 'All') || filterStatus === f
          return (
            <div key={label}
              onClick={() => setFilterStatus(f === 'overdue' ? 'All' : (filterStatus === f ? 'All' : f))}
              style={{
                padding: '16px 18px', borderRadius: 12, border: `1.5px solid ${isActive ? color : 'var(--border)'}`,
                background: isActive ? `${color}0a` : 'var(--surface)',
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', transition: 'all .15s',
                boxShadow: isActive ? `0 4px 16px ${color}22` : 'none'
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                {label === 'Pending' && value > 0 && (
                  <div style={{ fontSize: 10, color: '#ea580c', fontWeight: 700, marginTop: 2 }}>⚠ Not accepted yet</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search project or employee…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none', fontWeight: 600 }}>
          <option value="All">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none', fontWeight: 600 }}>
          <option value="All">All Employees</option>
          {staffList.map(s => <option key={s._id} value={s._id}>{s.fullName}</option>)}
        </select>

        <button onClick={load} disabled={loading} style={{ height: 38, width: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>

        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          {filtered.length} project{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Loader2 size={36} className="animate-spin" color="var(--primary)" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: '64px 32px', textAlign: 'center', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📁</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px 0' }}>No Project Assignments Found</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Try adjusting your filters or search query.</p>
          <button onClick={() => setModalOpen(true)}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white',
              fontWeight: 700, fontSize: 13, boxShadow: '0 4px 16px rgba(37,99,235,0.3)'
            }}>
            + Assign First Project
          </button>
        </div>
      ) : (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden' }}>
          {/* Column header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
            fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
            background: 'var(--bg)', borderBottom: '1px solid var(--border)'
          }}>
            <div style={{ flex: '0 0 200px', minWidth: 200 }}>Employee</div>
            <div style={{ flex: 1 }}>Project</div>
            <div style={{ width: 100, textAlign: 'center' }}>Priority</div>
            <div style={{ width: 110, textAlign: 'center' }}>Status</div>
            <div style={{ width: 130, textAlign: 'center' }}>Due Date</div>
            <div style={{ width: 180, textAlign: 'right', paddingRight: 10 }}>Actions</div>
          </div>
          {filtered.map((project, idx) => (
            <ProjectCard
              key={project._id}
              project={project}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              submittingId={submittingId}
              isLast={idx === filtered.length - 1}
            />
          ))}
        </div>
      )}
    </PageShell>
  )
}

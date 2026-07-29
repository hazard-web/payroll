import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
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
function Avatar({ name, src, size = 36 }) {
  if (src) {
    return (
      <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    )
  }
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
        {selected ? <Avatar name={selected.fullName} src={selected.documents?.profileImage?.url} size={28} /> : (
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
                  <Avatar name={s.fullName} src={s.documents?.profileImage?.url} size={36} />
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
  const [searchParams, setSearchParams] = useSearchParams()
  const staffIdFromQuery = searchParams.get('staffId')

  const EMPTY = { staffId: staffIdFromQuery || '', projectName: '', description: '', projectUrl: '', attachment: null, priority: 'Medium', dueDate: '' }
  const [form,   setForm]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = e => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      return toast.error('File size must be under 20MB')
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      setForm(prev => ({
        ...prev,
        attachment: {
          fileName: `${Date.now()}_${file.name}`,
          originalName: file.name,
          url: reader.result
        }
      }))
      setUploading(false)
      toast.success('Document attached!')
    }
    reader.onerror = () => {
      setUploading(false)
      toast.error('Failed to read file')
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (open) {
      setForm({
        staffId: staffIdFromQuery || '',
        projectName: '',
        description: '',
        projectUrl: '',
        attachment: null,
        priority: 'Medium',
        dueDate: ''
      })
    }
  }, [open, staffIdFromQuery])

  if (!open) return null

  const handleClose = () => {
    if (staffIdFromQuery) {
      setSearchParams({})
    }
    onClose()
  }

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
        projectUrl:  form.projectUrl,
        attachment:  form.attachment || undefined,
        priority:    form.priority,
        dueDate:     form.dueDate || undefined,
      })
      if (res.data.success) {
        toast.success('Project assigned!')
        onSaved(res.data.task)
        setForm(EMPTY)
        handleClose()
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
    }} onClick={handleClose}>
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
          <button onClick={handleClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 7, display: 'flex', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Employee */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              👤 Assign To <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <StaffPicker staffList={staffList} value={form.staffId} onChange={id => setForm({ ...form, staffId: id })} />
          </div>

          {/* Project name */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              📁 Project Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              autoFocus={false}
              required
              value={form.projectName}
              onChange={e => setForm({ ...form, projectName: e.target.value })}
              placeholder="e.g. Website Redesign, Mobile App MVP…"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12.5,
                border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                outline: 'none', fontWeight: 500, boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              📝 Description <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Add scope, requirements, deliverables, notes…"
              rows={2}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, lineHeight: 1.45,
                border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Project URL */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              🔗 Project Link <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
            </label>
            <input
              type="url"
              value={form.projectUrl}
              onChange={e => setForm({ ...form, projectUrl: e.target.value })}
              placeholder="e.g. Google Doc, Figma link, GitHub repository URL…"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12.5,
                border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                outline: 'none', boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* File Attachment Upload */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              📁 Attachment / Document <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>(optional, max 20MB)</span>
            </label>
            {form.attachment ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8,
                padding: '8px 12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <span style={{ fontSize: 14 }}>📄</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
                    {form.attachment.originalName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, attachment: null }))}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '1.5px dashed var(--border)', borderRadius: 8, padding: '10px 14px',
                cursor: 'pointer', transition: 'border-color .15s, background .15s',
                background: 'var(--bg)'
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = 'rgba(37,99,235,0.02)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
              >
                <span style={{ fontSize: 18, marginBottom: 2 }}>📤</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
                  {uploading ? 'Processing file...' : 'Choose document from Desktop/Folders'}
                </span>
                <span style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 1 }}>PDF, DOCX, Images, etc. (Max 20MB)</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Priority + Due date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>🎯 Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12.5,
                  border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                  outline: 'none', fontWeight: 600, boxSizing: 'border-box', height: 38, cursor: 'pointer'
                }}
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>📅 Due Date</label>
              <input type="date" value={form.dueDate} min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', height: 38 }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {/* Summary preview */}
          {(form.staffId || form.projectName) && (() => {
            const emp = staffList.find(s => s._id === form.staffId)
            return (
              <div style={{ padding: '10px 12px', background: pm.bg, borderRadius: 8, border: `1.5px solid ${pm.color}30` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: pm.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Assignment Preview</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {emp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Avatar name={emp.fullName} src={emp.documents?.profileImage?.url} size={24} />
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>{emp.fullName}</div>
                      </div>
                    </div>
                  )}
                  {emp && form.projectName && <ArrowRight size={14} color={pm.color} />}
                  {form.projectName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FolderOpen size={14} color={pm.color} />
                      <span style={{ fontWeight: 700, fontSize: 11.5, color: 'var(--text)' }}>{form.projectName}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, height: 38, borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{
                flex: 1.5, height: 38, borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? '#93c5fd' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                color: 'white', fontWeight: 700, fontSize: 12.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: saving ? 'none' : '0 4px 14px rgba(37,99,235,0.25)', transition: 'all .15s'
              }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Assigning…</> : <><Plus size={14} /> Assign Project</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Project Row (horizontal, like employee list) ─────────────
function ProjectCard({ project, onDelete, onStatusChange, submittingId, isLast }) {
  const [menuOpen, setMenuOpen] = useState(false)
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
      padding: '10px 16px',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
    >
      {/* Col 1 — Employee */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 200px', minWidth: 200 }}>
        <Avatar name={project.staff?.fullName} src={project.staff?.documents?.profileImage?.url} style={{ width: 32, height: 32, fontSize: 11, borderRadius: 8, background: 'var(--primary)' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.staff?.fullName || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Col 2 — Project */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <FolderOpen size={12} color={pm.color} />
          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.title}
          </span>
        </div>
        {project.description && (
          <div style={{ fontSize: 11, color: '#94a3b8', wordBreak: 'break-word', marginTop: 3, lineHeight: 1.35, maxWidth: 500 }}>
            {project.description}
          </div>
        )}
        {project.projectUrl && (
          <div style={{ marginTop: 3 }}>
            <a 
              href={project.projectUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              🔗 View Project Document / Link
            </a>
          </div>
        )}
        {project.attachment && project.attachment.url && (
          <div style={{ marginTop: 3 }}>
            <a 
              href={project.attachment.url} 
              download={project.attachment.originalName}
              style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              📄 Download Attachment: {project.attachment.originalName}
            </a>
          </div>
        )}
      </div>

      {/* Col 3 — Priority badge */}
      <div style={{ width: 90, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{
          padding: '3px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700',
          background: pm.bg, color: pm.color, textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          {project.priority}
        </span>
      </div>

      {/* Col 4 — Status badge */}
      <div style={{ width: 90, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{
          padding: '3px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700',
          background: sm.bg, color: sm.color, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          {project.status === 'Completed' && '✓ '}{sm.label}
        </span>
      </div>

      {/* Col 5 — Due date */}
      <div style={{ width: 110, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
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
      <div style={{ width: 90, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
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

        {menuOpen && (
          <>
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 110 }} 
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} 
            />
            <div style={{
              position: 'absolute',
              right: 0,
              top: isLast ? 'auto' : '100%',
              bottom: isLast ? '100%' : 'auto',
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
              {project.status !== 'Completed' && next && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onStatusChange(project._id, next);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    color: 'var(--text)',
                    fontSize: 12,
                    fontWeight: 500,
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <CheckCircle2 size={12} style={{ marginRight: 6 }} /> Move Status
                </button>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(project._id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  color: 'var(--danger)',
                  fontSize: 12,
                  fontWeight: 500,
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Trash2 size={12} style={{ marginRight: 6, color: '#dc2626' }} /> Delete Project
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}


// ─── Main Page ────────────────────────────────────────────────
export default function WorkManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const staffId = searchParams.get('staffId')

  const [projects,     setProjects]     = useState([])
  const [staffList,    setStaffList]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [submittingId, setSubmittingId] = useState(null)
  const [modalOpen,    setModalOpen]    = useState(staffId ? true : false)

  useEffect(() => {
    if (staffId) {
      setModalOpen(true)
    }
  }, [staffId])

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
    <PageShell style={{ maxWidth: 'none' }}>
      <AssignModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        staffList={staffList}
        onSaved={task => setProjects(p => [task, ...p])}
      />

      {/* Stats — click any card to filter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 16 }}>
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search project or employee…"
            style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none', fontWeight: 600 }}>
          <option value="All">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none', fontWeight: 600 }}>
          <option value="All">All Employees</option>
          {staffList.map(s => <option key={s._id} value={s._id}>{s.fullName}</option>)}
        </select>

        <button onClick={load} disabled={loading} style={{ height: 34, width: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              height: 36, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6,
              borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'white',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
            }}
          >
            <Plus size={16} strokeWidth={2.5} /> Assign Project
          </button>
        </div>
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
            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
            fontSize: 10, fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
            background: 'var(--bg)', borderBottom: '1px solid var(--border)'
          }}>
            <div style={{ flex: '0 0 200px', minWidth: 200 }}>Employee</div>
            <div style={{ flex: 1 }}>Project</div>
            <div style={{ width: 90, textAlign: 'center' }}>Priority</div>
            <div style={{ width: 90, textAlign: 'center' }}>Status</div>
            <div style={{ width: 110, textAlign: 'center' }}>Due Date</div>
            <div style={{ width: 90, textAlign: 'center' }}>Actions</div>
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

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Radio, Loader2, Trash2, Edit3, ToggleLeft, ToggleRight,
  AlertTriangle, Bell, Zap, Eye, X, Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import PageShell, { PageHeader, PageLoading } from '../components/PageShell'
import { InputField, SelectField, Modal, Badge, ActionBtn, EmptyState, Toggle, StatCard } from '../components/UI'

const PRIORITY_OPTIONS = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Important', label: 'Important' },
  { value: 'Urgent', label: 'Urgent' },
]

const priorityConfig = {
  Normal:    { icon: Bell,     badge: 'pill--green',  color: '#58833b', bg: '#e5ebdd', border: 'rgba(88,131,59,0.25)' },
  Important: { icon: AlertTriangle, badge: 'pill--amber', color: '#b45309', bg: '#fef3c7', border: 'rgba(180,83,9,0.25)' },
  Urgent:    { icon: Zap,      badge: 'pill--red',    color: '#dc2626', bg: '#fee2e2', border: 'rgba(220,38,38,0.25)' },
}

const emptyForm = () => ({
  title: '',
  message: '',
  priority: 'Normal',
  startDate: '',
  endDate: '',
  isActive: true,
  meetingLink: '',
})

export default function Announcements({ isSettings }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const navigate = useNavigate()

  useEffect(() => { fetchAnnouncements() }, [])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const res = await api.get('/announcements')
      setAnnouncements(res.data.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch announcements')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setFormData(emptyForm())
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditingId(item._id)
    setFormData({
      title: item.title,
      message: item.message,
      priority: item.priority || 'Normal',
      startDate: item.startDate ? item.startDate.split('T')[0] : '',
      endDate: item.endDate ? item.endDate.split('T')[0] : '',
      isActive: item.isActive,
      meetingLink: item.meetingLink || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData(emptyForm())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) { toast.error('Title is required'); return }
    if (!formData.message.trim()) { toast.error('Message is required'); return }

    setSubmitting(true)
    try {
      const payload = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        isActive: formData.isActive,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        meetingLink: formData.meetingLink ? formData.meetingLink.trim() : '',
      }

      let res
      if (editingId) {
        res = await api.put(`/announcements/${editingId}`, payload)
        setAnnouncements(prev => prev.map(a => a._id === editingId ? res.data.data : a))
        toast.success('Announcement updated')
      } else {
        res = await api.post('/announcements', payload)
        setAnnouncements(prev => [res.data.data, ...prev])
        toast.success('Announcement created')
      }
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return
    try {
      await api.delete(`/announcements/${id}`)
      setAnnouncements(prev => prev.filter(a => a._id !== id))
      toast.success('Announcement deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    }
  }

  const handleToggle = async (id) => {
    try {
      const res = await api.put(`/announcements/${id}/toggle`)
      setAnnouncements(prev => prev.map(a => a._id === id ? res.data.data : a))
      toast.success(res.data.data.isActive ? 'Announcement activated' : 'Announcement deactivated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    }
  }

  const fmtDate = (d) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) return <PageLoading label="Loading announcements…" />

  const content = (
    <>
      {isSettings ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Announcements Management</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 500 }}>Create and manage company-wide announcements.</p>
          </div>
          <button onClick={openCreate} className="btn-primary" style={{ height: 38, padding: '0 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} strokeWidth={2.5} /> New Announcement
          </button>
        </div>
      ) : (
        <PageHeader
          title="Announcements"
          subtitle="Create and manage company-wide announcements."
          actions={
            <button onClick={openCreate} className="btn-primary" style={{ height: 48, padding: '0 24px' }}>
              <Plus size={20} strokeWidth={2.5} /> New Announcement
            </button>
          }
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard icon={Radio} label="TOTAL" value={announcements.length} color="#58833b" />
        <StatCard icon={Eye} label="ACTIVE" value={announcements.filter(a => a.isActive).length} color="#1d4ed8" />
        <StatCard icon={X} label="INACTIVE" value={announcements.filter(a => !a.isActive).length} color="#6b7280" />
        <StatCard icon={Zap} label="URGENT" value={announcements.filter(a => a.priority === 'Urgent').length} color="#dc2626" />
      </div>

      {/* Announcement list */}
      {announcements.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No announcements yet"
          description="Create your first announcement to notify your team."
          action={
            <button onClick={openCreate} className="btn-primary">
              <Plus size={16} /> Create Announcement
            </button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {announcements.map((item, i) => {
            const config = priorityConfig[item.priority] || priorityConfig.Normal
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  background: 'var(--surface)', border: `1px solid ${item.isActive ? 'var(--border)' : 'var(--border)'}`,
                  borderRadius: 12, overflow: 'hidden',
                  boxShadow: item.isActive ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
                  opacity: item.isActive ? 1 : 0.7,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', flexWrap: 'wrap' }}>
                  {/* Priority indicator strip */}
                  <div style={{
                    width: 4, borderRadius: 4, alignSelf: 'stretch',
                    background: config.color, flexShrink: 0, minHeight: 32,
                  }} />

                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{item.title}</h3>
                      <span className={`pill ${config.badge}`} style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}`, fontSize: 9.5, padding: '2px 6px' }}>
                        {item.priority}
                      </span>
                      {!item.isActive && (
                        <span className="pill pill--slate" style={{ background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 9.5, padding: '2px 6px' }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 8px' }}>
                      {item.message.length > 180 ? item.message.slice(0, 180) + '…' : item.message}
                    </p>
                    {item.meetingLink && (
                      <div style={{ marginTop: 8, marginBottom: 8 }}>
                        <a href={item.meetingLink} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', fontSize: 11, height: 'auto', textDecoration: 'none', background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed', border: '1px solid rgba(124, 58, 237, 0.15)', borderRadius: 6, fontWeight: 700 }}>
                          📹 Join Meeting
                        </a>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {item.startDate && (
                        <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 600 }}>
                          From: {fmtDate(item.startDate)}
                        </span>
                      )}
                      {item.endDate && (
                        <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 600 }}>
                          Until: {fmtDate(item.endDate)}
                        </span>
                      )}
                      {!item.startDate && !item.endDate && (
                        <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 600 }}>
                          No date restriction
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 600, marginLeft: 'auto' }}>
                        {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                    <button
                      onClick={() => handleToggle(item._id)}
                      className="btn-hover"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                        background: item.isActive ? 'rgba(88,131,59,0.08)' : 'var(--bg)',
                        color: item.isActive ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                      }}
                    >
                      {item.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {item.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => openEdit(item)} className="btn-icon" style={{ width: 28, height: 28 }}>
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => handleDelete(item._id)} className="btn-icon btn-danger" style={{ width: 28, height: 28 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingId ? 'Edit Announcement' : 'New Announcement'}
        size="lg"
        footer={
          <>
            <button type="button" onClick={closeModal} className="btn-ghost" style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" form="announcementForm" disabled={submitting} className="btn-primary" style={{ padding: '10px 24px', minWidth: 120 }}>
              {submitting
                ? <Loader2 size={16} className="animate-spin" />
                : <><Save size={15} /> {editingId ? 'Update' : 'Create'}</>
              }
            </button>
          </>
        }
      >
        <form id="announcementForm" onSubmit={handleSubmit}>
          <InputField
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="e.g. Office Holiday Notice"
          />
          <div style={{ marginBottom: 20 }}>
            <label className="label">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              required
              placeholder="Write your announcement message..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 14, resize: 'vertical',
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <SelectField
              label="Priority"
              value={formData.priority}
              onChange={(v) => setFormData({ ...formData, priority: v })}
              options={PRIORITY_OPTIONS}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingTop: 24 }}>
              <Toggle checked={formData.isActive} onChange={(v) => setFormData({ ...formData, isActive: v })} />
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                {formData.isActive ? 'Active' : 'Inactive'}
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
            <div style={{ marginBottom: 0 }}>
              <label className="label">Start Date <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(Optional)</span></label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                style={{
                  width: '100%', padding: '0 12px', height: 36, borderRadius: 6,
                  border: '0.5px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text)', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box', cursor: 'pointer',
                  colorScheme: 'light dark',
                }}
              />
            </div>
            <div style={{ marginBottom: 0 }}>
              <label className="label">End Date <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(Optional)</span></label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                style={{
                  width: '100%', padding: '0 12px', height: 36, borderRadius: 6,
                  border: '0.5px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text)', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box', cursor: 'pointer',
                  colorScheme: 'light dark',
                }}
              />
            </div>
          </div>
          
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <InputField
              label="Meeting Link"
              value={formData.meetingLink}
              onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              placeholder="e.g. https://meet.google.com/abc-defg-hij"
            />
          </div>
          
          <p className="text-muted" style={{ fontSize: 12 }}>
            Leave dates blank for announcements with no time restriction. Active announcements are shown on the Team Portal and Dashboard.
          </p>
        </form>
      </Modal>
    </>
  )

  return isSettings ? content : <PageShell>{content}</PageShell>
}

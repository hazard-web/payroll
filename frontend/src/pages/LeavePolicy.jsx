import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Save, RotateCcw, Info,
  CalendarDays, ShieldCheck, RefreshCw, Plus, Minus,
  History, X, TrendingUp, TrendingDown
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'
import PageShell, { PageHeader } from '../components/PageShell'

// ── styles ────────────────────────────────────────────────────────────────────
const styles = `
  .lp-section { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  .lp-header  { padding:14px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:10px; background:var(--bg); }
  .lp-body    { padding:20px; }
  .lp-input   { width:100%; padding:9px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:13px; outline:none; transition:border-color .15s; box-sizing:border-box; }
  .lp-input:focus { border-color:var(--primary); }
  .lp-label   { display:block; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
  .lp-toggle  { position:relative; width:40px; height:22px; cursor:pointer; }
  .lp-toggle input { opacity:0; width:0; height:0; }
  .lp-slider  { position:absolute; inset:0; background:var(--border); border-radius:999px; transition:.25s; }
  .lp-slider:before { content:''; position:absolute; width:16px; height:16px; left:3px; bottom:3px; background:white; border-radius:50%; transition:.25s; }
  .lp-toggle input:checked + .lp-slider { background:var(--primary); }
  .lp-toggle input:checked + .lp-slider:before { transform:translateX(18px); }
  .lp-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:9000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .lp-modal { background:var(--surface); border-radius:16px; width:100%; max-width:500px; border:1px solid var(--border); box-shadow:0 24px 60px rgba(0,0,0,0.25); overflow:hidden; }
`

const DAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

// ── AdjustModal ──────────────────────────────────────────────────────────────
function AdjustModal({ staffMember, onClose, onSuccess }) {
  const [leaveType, setLeaveType] = useState('Casual')
  const [adjustmentType, setAdjustmentType] = useState('Add')
  const [days, setDays] = useState(1)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const currentBalance = leaveType === 'Casual'
    ? (staffMember?.leaveBalance?.casual ?? 0)
    : (staffMember?.leaveBalance?.sick ?? 0)

  const previewBalance = adjustmentType === 'Add'
    ? currentBalance + Number(days || 0)
    : currentBalance - Number(days || 0)

  const isDeduct = adjustmentType === 'Deduct'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!days || Number(days) < 0.5) { toast.error('Days must be at least 0.5'); return }
    if (!reason.trim() || reason.trim().length < 3) { toast.error('Please enter a reason (min 3 chars)'); return }

    setSubmitting(true)
    try {
      await api.post(`/leave-policy/adjust/${staffMember._id}`, {
        leaveType,
        adjustmentType,
        days: Number(days),
        reason: reason.trim(),
      })
      toast.success(`${adjustmentType === 'Add' ? 'Added' : 'Deducted'} ${days} ${leaveType} day(s) for ${staffMember.fullName}`)
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust balance')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="lp-modal-overlay" onClick={onClose}>
      <motion.div
        className="lp-modal"
        initial={{ scale: 0.95, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 16, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Adjust Leave Balance</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{staffMember?.fullName}{staffMember?.employeeId ? ` · ${staffMember.employeeId}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, fontSize: 18 }}>
            <X size={18} />
          </button>
        </div>

        {/* Current balances */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
          {[
            { label: 'Casual Leave', value: staffMember?.leaveBalance?.casual ?? 0, color: '#58833b', bg: '#e5ebdd', active: leaveType === 'Casual' },
            { label: 'Sick Leave',   value: staffMember?.leaveBalance?.sick   ?? 0, color: '#c2410c', bg: '#fff7ed', active: leaveType === 'Sick' },
          ].map(b => (
            <div key={b.label} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: b.active ? b.bg : 'var(--bg)', border: `1.5px solid ${b.active ? b.color + '40' : 'var(--border)'}`, transition: 'all .15s', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: b.active ? b.color : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{b.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: b.active ? b.color : 'var(--text)', lineHeight: 1.2 }}>{b.value}<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>d</span></div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
          {/* Leave type */}
          <div style={{ marginBottom: 18 }}>
            <label className="lp-label">Leave Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['Casual', 'Sick'].map(lt => (
                <button key={lt} type="button" onClick={() => setLeaveType(lt)} style={{
                  padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                  borderColor: leaveType === lt ? (lt === 'Casual' ? '#58833b' : '#c2410c') : 'var(--border)',
                  background: leaveType === lt ? (lt === 'Casual' ? '#e5ebdd' : '#fff7ed') : 'var(--bg)',
                  color: leaveType === lt ? (lt === 'Casual' ? '#58833b' : '#c2410c') : 'var(--text-muted)',
                  transition: 'all .15s',
                }}>
                  {lt === 'Casual' ? 'Casual (CL)' : 'Sick (SL)'}
                </button>
              ))}
            </div>
          </div>

          {/* Adjustment type */}
          <div style={{ marginBottom: 18 }}>
            <label className="lp-label">Adjustment Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button type="button" onClick={() => setAdjustmentType('Add')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                borderColor: adjustmentType === 'Add' ? '#16a34a' : 'var(--border)',
                background: adjustmentType === 'Add' ? '#dcfce7' : 'var(--bg)',
                color: adjustmentType === 'Add' ? '#16a34a' : 'var(--text-muted)',
                transition: 'all .15s',
              }}>
                <Plus size={15} /> Add Days
              </button>
              <button type="button" onClick={() => setAdjustmentType('Deduct')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                borderColor: adjustmentType === 'Deduct' ? '#dc2626' : 'var(--border)',
                background: adjustmentType === 'Deduct' ? '#fee2e2' : 'var(--bg)',
                color: adjustmentType === 'Deduct' ? '#dc2626' : 'var(--text-muted)',
                transition: 'all .15s',
              }}>
                <Minus size={15} /> Deduct Days
              </button>
            </div>
          </div>

          {/* Days input */}
          <div style={{ marginBottom: 18 }}>
            <label className="lp-label">Number of Days</label>
            <input type="number" className="lp-input" min="0.5" max="99" step="0.5"
              value={days} onChange={e => setDays(e.target.value)} required
              style={{ borderColor: isDeduct ? '#dc262630' : '#16a34a30' }}
            />
          </div>

          {/* Live preview */}
          <div style={{
            marginBottom: 18, padding: '12px 16px', borderRadius: 10,
            background: isDeduct ? '#fee2e205' : '#dcfce705',
            border: `1px solid ${isDeduct ? '#dc262620' : '#16a34a20'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Balance Preview ({leaveType})</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
              <span style={{ fontSize: 14, color: 'var(--text)' }}>{currentBalance}d</span>
              <span style={{ color: isDeduct ? '#dc2626' : '#16a34a', fontSize: 12 }}>{isDeduct ? '−' : '+'}{days || 0}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
              <span style={{ fontSize: 16, color: isDeduct ? '#dc2626' : '#16a34a' }}>{previewBalance}d</span>
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 22 }}>
            <label className="lp-label">Reason <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea className="lp-input" rows={3} required placeholder="e.g. Festival bonus leave, Medical emergency, Correction for last month…"
              value={reason} onChange={e => setReason(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: 72 }}
            />
            <div style={{ fontSize: 11, color: reason.trim().length < 3 && reason.length > 0 ? '#dc2626' : 'var(--text-muted)', marginTop: 4 }}>
              {reason.trim().length}/200 characters - reason is required and recorded permanently
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 20px', borderRadius: 9, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: 13,
            }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{
              padding: '10px 24px', borderRadius: 9, border: 'none',
              background: isDeduct ? '#dc2626' : 'var(--primary)',
              color: 'white', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? <Loader2 size={15} className="animate-spin" /> : (isDeduct ? <Minus size={14} /> : <Plus size={14} />)}
              {submitting ? 'Saving…' : `${adjustmentType} ${days || 0} Day${Number(days) !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeavePolicyPage() {
  const [policy, setPolicy]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [activeTab, setActiveTab] = useState('policy')

  const fetchPolicy = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/leave-policy')
      setPolicy(res.data.data)
    } catch {
      toast.error('Failed to fetch leave policy')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPolicy() }, [fetchPolicy])

  const updateField = (section, field, value) => {
    setPolicy(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }))
  }

  const updateTopLevel = (field, value) => {
    setPolicy(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!policy) return
    setSaving(true)
    try {
      await api.put('/leave-policy', policy)
      toast.success('Leave policy saved successfully')
    } catch {
      toast.error('Failed to save policy')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset all leave balances for all staff to the annual quota?')) return
    try {
      await api.post('/leave-policy/reset')
      toast.success('All leave balances have been reset')
    } catch {
      toast.error('Failed to reset balances')
    }
  }

  const injectStyles = () => {
    const id = 'lp-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.innerHTML = styles
      document.head.appendChild(el)
    }
  }
  useEffect(() => { injectStyles() }, [])

  if (loading) {
    return (
      <PageShell>
        <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
          <Loader2 size={36} className="animate-spin" style={{ color:'var(--primary)' }} />
        </div>
      </PageShell>
    )
  }

  if (!policy) return null

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      {/* Tab switcher & Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display:'flex', gap:4, padding:4, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, width:'fit-content', flexWrap:'wrap' }}>
          {[
            { key:'policy',  label:'Leave Rules' },
            { key:'lwp',     label:'LWP & Deductions' },
            { key:'balance', label:'Staff Balances' },
            { key:'history', label:'Adjustment History' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding:'8px 20px', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', transition:'all .18s',
                background: activeTab === t.key ? 'var(--surface)' : 'transparent',
                color: activeTab === t.key ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: activeTab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handleReset} className="btn-secondary"
            style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 16px', fontSize:13, borderRadius:8 }}>
            <RefreshCw size={14} /> Reset Balances
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary"
            style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 20px', fontSize:13, borderRadius:8 }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <><Save size={14} /> Save Policy</>}
          </button>
        </div>
      </div>

      {/* ── TAB 1: Leave Rules ── */}
      {activeTab === 'policy' && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} style={{ display:'grid', gap:20 }}>
          {/* Casual Leave */}
          <div className="lp-section">
            <div className="lp-header">
              <div style={{ width:32, height:32, borderRadius:8, background:'#e5ebdd', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CalendarDays size={16} color="#58833b" />
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Casual Leave (CL)</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Configure casual leave allocation</div>
              </div>
            </div>
            <div className="lp-body">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16 }}>
                <div>
                  <label className="lp-label">Days Per Month</label>
                  <input type="number" className="lp-input" min="0" max="31"
                    value={policy.casualLeave.daysPerMonth}
                    onChange={e => updateField('casualLeave', 'daysPerMonth', Number(e.target.value))} />
                </div>
                <div>
                  <label className="lp-label">Days Per Year</label>
                  <input type="number" className="lp-input" min="0" max="365"
                    value={policy.casualLeave.daysPerYear}
                    onChange={e => updateField('casualLeave', 'daysPerYear', Number(e.target.value))} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <label className="lp-toggle">
                    <input type="checkbox" checked={policy.casualLeave.isPaid}
                      onChange={e => updateField('casualLeave', 'isPaid', e.target.checked)} />
                    <span className="lp-slider"></span>
                  </label>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Paid Leave</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sick Leave */}
          <div className="lp-section">
            <div className="lp-header">
              <div style={{ width:32, height:32, borderRadius:8, background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ShieldCheck size={16} color="#c2410c" />
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Sick Leave (SL)</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Configure sick leave allocation</div>
              </div>
            </div>
            <div className="lp-body">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16 }}>
                <div>
                  <label className="lp-label">Days Per Month</label>
                  <input type="number" className="lp-input" min="0" max="31"
                    value={policy.sickLeave.daysPerMonth}
                    onChange={e => updateField('sickLeave', 'daysPerMonth', Number(e.target.value))} />
                </div>
                <div>
                  <label className="lp-label">Days Per Year</label>
                  <input type="number" className="lp-input" min="0" max="365"
                    value={policy.sickLeave.daysPerYear}
                    onChange={e => updateField('sickLeave', 'daysPerYear', Number(e.target.value))} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <label className="lp-toggle">
                    <input type="checkbox" checked={policy.sickLeave.isPaid}
                      onChange={e => updateField('sickLeave', 'isPaid', e.target.checked)} />
                    <span className="lp-slider"></span>
                  </label>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Paid Leave</span>
                </div>
              </div>
            </div>
          </div>

          {/* Working Days & Holidays */}
          <div className="lp-section">
            <div className="lp-header">
              <div style={{ width:32, height:32, borderRadius:8, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Info size={16} color="#1d4ed8" />
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Working Days & Holidays</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Set company working days, holidays, and LWP behavior</div>
              </div>
            </div>
            <div className="lp-body">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16, marginBottom:16 }}>
                <div>
                  <label className="lp-label">Working Days Per Month</label>
                  <input type="number" className="lp-input" min="1" max="31"
                    value={policy.workingDaysPerMonth}
                    onChange={e => updateTopLevel('workingDaysPerMonth', Number(e.target.value))} />
                </div>
                <div>
                  <label className="lp-label">Weekend Days</label>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    {DAY_LABELS.map((label, i) => (
                      <button key={i} type="button" onClick={() => {
                        const current = policy.weekendDays || []
                        const next = current.includes(i) ? current.filter(d => d !== i) : [...current, i].sort((a,b)=>a-b)
                        
                        // Auto calculate exact working days based on the current calendar month
                        const now = new Date()
                        const year = now.getFullYear()
                        const month = now.getMonth()
                        const daysInMonth = new Date(year, month + 1, 0).getDate()
                        
                        let nextWorkingDays = 0
                        for (let day = 1; day <= daysInMonth; day++) {
                          const date = new Date(year, month, day)
                          const dayOfWeek = date.getDay()
                          if (!next.includes(dayOfWeek)) {
                            nextWorkingDays++
                          }
                        }

                        setPolicy(prev => ({
                          ...prev,
                          weekendDays: next,
                          workingDaysPerMonth: nextWorkingDays
                        }))
                      }} style={{
                        padding:'5px 10px', borderRadius:7, border:'1.5px solid',
                        borderColor: (policy.weekendDays || []).includes(i) ? 'var(--primary)' : 'var(--border)',
                        background: (policy.weekendDays || []).includes(i) ? 'rgba(88,131,59,0.08)' : 'var(--surface)',
                        color: (policy.weekendDays || []).includes(i) ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight:700, fontSize:12, cursor:'pointer', transition:'all .15s'
                      }}>{label.slice(0,3)}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="lp-label">Company Holidays (ISO Dates, one per line)</label>
                <textarea className="lp-input" rows={4} placeholder="2025-01-26&#10;2025-03-08&#10;2025-08-15"
                  value={(policy.holidays || []).join('\n')}
                  onChange={e => updateTopLevel('holidays', e.target.value.split('\n').filter(Boolean))}
                  style={{ fontFamily:'monospace', fontSize:12, resize:'vertical' }} />
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:5 }}>Holidays do not reduce salary or leave balance.</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 2: LWP Settings ── */}
      {activeTab === 'lwp' && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} style={{ display:'grid', gap:20 }}>
          <div className="lp-section">
            <div className="lp-header">
              <div style={{ width:32, height:32, borderRadius:8, background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Info size={16} color="#dc2626" />
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Leave Without Pay (LWP)</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Configure how excess leave is handled</div>
              </div>
            </div>
            <div className="lp-body">
              <div style={{ display:'grid', gap:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <label className="lp-toggle">
                    <input type="checkbox" checked={policy.lwp?.enabled}
                      onChange={e => updateTopLevel('lwp', { ...policy.lwp, enabled: e.target.checked })} />
                    <span className="lp-slider"></span>
                  </label>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Enable LWP</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>When leave balance is exhausted, mark extra days as LWP</div>
                  </div>
                </div>
                {policy.lwp?.enabled && (
                  <div style={{ marginTop:8, padding:'14px 16px', background:'var(--bg)', borderRadius:10, border:'1px solid var(--border)' }}>
                    <label className="lp-label">Salary Deduction Type</label>
                    <select className="lp-input" value={policy.lwp?.salaryDeductionType || 'pro-rata'}
                      onChange={e => updateTopLevel('lwp', { ...policy.lwp, salaryDeductionType: e.target.value })}
                      style={{ maxWidth:300 }}>
                      <option value="pro-rata">Pro-rata (per day deduction)</option>
                      <option value="full">Full month salary deduction</option>
                    </select>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                      Pro-rata deducts salary per LWP day. Full deducts the entire month's salary if any LWP exists.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lp-section">
            <div className="lp-header">
              <div style={{ width:32, height:32, borderRadius:8, background:'#faf5ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <RefreshCw size={16} color="#7c3aed" />
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Annual Auto-Reset</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Automatically reset leave balances each year</div>
              </div>
            </div>
            <div className="lp-body">
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <label className="lp-toggle">
                  <input type="checkbox" checked={policy.autoResetAnnual?.enabled}
                    onChange={e => updateTopLevel('autoResetAnnual', { ...policy.autoResetAnnual, enabled: e.target.checked })} />
                  <span className="lp-slider"></span>
                </label>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Auto-reset on January 1st</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>CL and SL balances will reset to their annual quota each year</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 3: Staff Balances ── */}
      {activeTab === 'balance' && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}>
          <div className="lp-section">
            <div className="lp-header">
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>All Staff Leave Balances</div>
              <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:'auto' }}>Click "Adjust" to add or deduct days with a reason</span>
            </div>
            <div style={{ padding:'8px 20px 20px' }}>
              <StaffBalanceTable policy={policy} onUpdate={fetchPolicy} />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 4: Adjustment History ── */}
      {activeTab === 'history' && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}>
          <AdjustmentHistoryTable />
        </motion.div>
      )}
    </PageShell>
  )
}

// ─── Staff Balance Table Component ────────────────────────────────────────────
function StaffBalanceTable({ policy, onUpdate }) {
  const [staff, setStaff]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [adjustTarget, setAdjustTarget] = useState(null) // staff member to adjust

  const loadStaff = useCallback(async () => {
    try {
      const res = await api.get('/leave-policy/staff-balances')
      setStaff(res.data.data || [])
    } catch {
      toast.error('Failed to load staff balances')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])

  const resetStaff = async (staffId, name) => {
    if (!confirm(`Reset ${name}'s balance to the annual quota?`)) return
    try {
      await api.post(`/leave-policy/reset/${staffId}`)
      toast.success('Balance reset')
      loadStaff()
    } catch {
      toast.error('Failed to reset')
    }
  }

  const filtered = staff.filter(s => {
    const q = search.toLowerCase()
    return !q || s.fullName?.toLowerCase().includes(q) || s.employeeId?.toLowerCase().includes(q)
  })

  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <input placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width:'100%', maxWidth:300, padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontSize:13, outline:'none' }} />
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <Loader2 size={24} className="animate-spin" style={{ color:'var(--primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No staff found.</div>
      ) : (
        <div style={{ display:'grid', gap:8 }}>
          {filtered.map(s => (
            <div key={s._id} style={{
              display:'grid', gridTemplateColumns:'1.5fr 120px 120px 180px', gap:12,
              padding:'12px 16px', borderRadius:10, background:'var(--bg)', border:'1px solid var(--border)',
              alignItems:'center'
            }}>
              {/* Staff info */}
              <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--primary)', color:'white',
                  display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>
                  {s.fullName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.fullName}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{s.employeeId || '-'}</div>
                </div>
              </div>

              {/* CL */}
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>CL</div>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--primary)', marginTop:1 }}>
                  {s.leaveBalance?.casual ?? 0}<span style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)' }}>d</span>
                </div>
              </div>

              {/* SL */}
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>SL</div>
                <div style={{ fontSize:16, fontWeight:800, color:'#c2410c', marginTop:1 }}>
                  {s.leaveBalance?.sick ?? 0}<span style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)' }}>d</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                <button onClick={() => setAdjustTarget(s)} className="btn-primary"
                  style={{ padding:'6px 14px', fontSize:12, borderRadius:7, display:'inline-flex', alignItems:'center', gap:5 }}>
                  <Plus size={13} /> Adjust
                </button>
                <button onClick={() => resetStaff(s._id, s.fullName)} className="btn-secondary"
                  style={{ padding:'6px 10px', fontSize:12, borderRadius:7, display:'inline-flex', alignItems:'center', gap:4 }}>
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adjust modal */}
      <AnimatePresence>
        {adjustTarget && (
          <AdjustModal
            staffMember={adjustTarget}
            onClose={() => setAdjustTarget(null)}
            onSuccess={loadStaff}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Adjustment History Table ──────────────────────────────────────────────────
function AdjustmentHistoryTable() {
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState('All')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/leave-policy/adjustments')
        setAdjustments(res.data.data || [])
      } catch {
        toast.error('Failed to load adjustment history')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = adjustments.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || a.staff?.fullName?.toLowerCase().includes(q) || a.staff?.employeeId?.toLowerCase().includes(q) || a.reason?.toLowerCase().includes(q)
    const matchType = typeFilter === 'All' || a.adjustmentType === typeFilter
    return matchSearch && matchType
  })

  const fmtDate = (d) => new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })

  return (
    <div className="lp-section">
      <div className="lp-header" style={{ justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <History size={16} color="#1d4ed8" />
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Adjustment History</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>All manual leave balance changes</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginLeft:'auto' }}>
          {/* Search */}
          <input placeholder="Search employee or reason…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontSize:12, outline:'none', minWidth:200 }} />
          {/* Type filter */}
          {['All','Add','Deduct'].map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} style={{
              padding:'6px 14px', borderRadius:7, border:'1.5px solid', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .15s',
              borderColor: typeFilter === f ? (f === 'Add' ? '#16a34a' : f === 'Deduct' ? '#dc2626' : 'var(--primary)') : 'var(--border)',
              background: typeFilter === f ? (f === 'Add' ? '#dcfce7' : f === 'Deduct' ? '#fee2e2' : 'rgba(88,131,59,0.08)') : 'transparent',
              color: typeFilter === f ? (f === 'Add' ? '#16a34a' : f === 'Deduct' ? '#dc2626' : 'var(--primary)') : 'var(--text-muted)',
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div className="lp-body" style={{ padding:'12px 20px 20px' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <Loader2 size={24} className="animate-spin" style={{ color:'var(--primary)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
            <History size={32} style={{ display:'block', margin:'0 auto 10px', opacity:0.3 }} />
            {adjustments.length === 0 ? 'No adjustments have been made yet.' : 'No adjustments match your filter.'}
          </div>
        ) : (
          <div style={{ display:'grid', gap:8 }}>
            {/* Header row */}
            <div style={{ display:'grid', gridTemplateColumns:'140px 160px 90px 80px 80px 1fr', gap:10, padding:'6px 12px' }}>
              {['Date','Employee','Type','Leave','Days','Reason'].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</div>
              ))}
            </div>

            {filtered.map(a => {
              const isAdd = a.adjustmentType === 'Add'
              return (
                <motion.div key={a._id}
                  initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }}
                  style={{ display:'grid', gridTemplateColumns:'140px 160px 90px 80px 80px 1fr', gap:10,
                    padding:'12px', borderRadius:10, background:'var(--bg)', border:'1px solid var(--border)', alignItems:'center' }}>
                  {/* Date */}
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{fmtDate(a.createdAt)}</div>

                  {/* Employee */}
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{a.staff?.fullName || '-'}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>{a.staff?.employeeId || ''}</div>
                  </div>

                  {/* Type badge */}
                  <div>
                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:4,
                      padding:'3px 10px', borderRadius:999, fontSize:10, fontWeight:800, textTransform:'uppercase',
                      background: isAdd ? '#dcfce7' : '#fee2e2',
                      color: isAdd ? '#16a34a' : '#dc2626',
                      border: `1px solid ${isAdd ? '#16a34a30' : '#dc262630'}`,
                    }}>
                      {isAdd ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {a.adjustmentType}
                    </span>
                  </div>

                  {/* Leave type */}
                  <div>
                    <span style={{
                      padding:'3px 9px', borderRadius:999, fontSize:10, fontWeight:700,
                      background: a.leaveType === 'Casual' ? '#e5ebdd' : '#fff7ed',
                      color: a.leaveType === 'Casual' ? '#58833b' : '#c2410c',
                    }}>
                      {a.leaveType === 'Casual' ? 'CL' : 'SL'}
                    </span>
                  </div>

                  {/* Days */}
                  <div style={{ fontSize:14, fontWeight:800, color: isAdd ? '#16a34a' : '#dc2626' }}>
                    {isAdd ? '+' : '−'}{a.days}d
                  </div>

                  {/* Reason */}
                  <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={a.reason}>
                    {a.reason}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

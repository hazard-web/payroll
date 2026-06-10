import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Eye, Download, Mail, Trash2, FileText, ChevronLeft, ChevronRight, Loader2, Copy, Plus, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import PageShell, { PageHeader } from '../components/PageShell'

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = ['', ...Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)]

const EmptyState = React.memo(({ filtered }) => {
  return (
    <tr>
      <td colSpan={7}>
        <div style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: '50%', background: 'var(--bg)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' 
          }}>
            <FileText size={32} color="var(--text-light)" />
          </div>
          <h3 style={{ color: 'var(--primary)', marginBottom: 8 }}>
            {filtered ? 'No search results' : 'Your archive is empty'}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto' }}>
            {filtered ? 'We couldn\'t find any payslips matching those specific filters.' : 'Generate your first professional payslip to see it appear here.'}
          </p>
        </div>
      </td>
    </tr>
  )
});

const ActionBtn = React.memo(({ icon: Icon, label, onClick, color = 'var(--text-muted)', loading }) => {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={label}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34, border: '1px solid var(--border)', borderRadius: 10,
        background: 'var(--surface)', cursor: loading ? 'wait' : 'pointer',
        color, transition: 'all 0.2s',
      }}
      className="btn-hover"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={15} />}
    </button>
  )
});

export default function PayslipList() {
  const navigate = useNavigate()
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [actionLoading, setActionLoading] = useState({})
  const [deleting, setDeleting] = useState(null)

  const fetchPayslips = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (search) params.set('search', search)
      if (filterMonth) params.set('month', filterMonth)
      if (filterYear) params.set('year', filterYear)
      const res = await api.get('/payslips?' + params.toString())
      setPayslips(res.data?.data || [])
      setPagination(res.data?.pagination || { total: 0, totalPages: 1 })
    } catch (err) {
      toast.error('Failed to load payslips archive')
    } finally {
      setLoading(false)
    }
  }, [search, filterMonth, filterYear, page])

  useEffect(() => {
    const timer = setTimeout(fetchPayslips, search ? 350 : 0)
    return () => clearTimeout(timer)
  }, [fetchPayslips])

  const handleDownload = async (id, name, month, year) => {
    setActionLoading(a => ({ ...a, [`dl_${id}`]: true }))
    try {
      const res = await api.get(`/payslips/${id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Payslip_${name.replace(/\s+/g,'_')}_${month}_${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF document ready')
    } catch (err) {
      toast.error('PDF generation failed')
    } finally {
      setActionLoading(a => ({ ...a, [`dl_${id}`]: false }))
    }
  }

  const handleEmail = async (id, email) => {
    setActionLoading(a => ({ ...a, [`em_${id}`]: true }))
    try {
      await api.post(`/payslips/${id}/email`)
      toast.success(`Sent to ${email}`)
      fetchPayslips()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(a => ({ ...a, [`em_${id}`]: false }))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure? This document will be permanently deleted.')) return
    setDeleting(id)
    try {
      await api.delete(`/payslips/${id}`)
      toast.success('Archive updated')
      fetchPayslips()
    } catch (err) {
      toast.error('Update failed')
    } finally {
      setDeleting(null)
    }
  }

  const handleDuplicate = async (id) => {
    setActionLoading(a => ({ ...a, [`dup_${id}`]: true }))
    try {
      const res = await api.get(`/payslips/${id}`)
      const data = res.data.data
      const { _id, createdAt, updatedAt, emailSent, emailSentAt, __v, ...duplicateData } = data
      navigate('/generate', { state: { duplicateData } })
    } catch (err) {
      toast.error('Failed to clone payslip')
    } finally {
      setActionLoading(a => ({ ...a, [`dup_${id}`]: false }))
    }
  }

  const handlePush = async (id) => {
    setActionLoading(a => ({ ...a, [`push_${id}`]: true }))
    try {
      const res = await api.post(`/payslips/${id}/push`)
      toast.success(res.data.message)
      fetchPayslips()
    } catch (err) {
      toast.error('Failed to update portal visibility')
    } finally {
      setActionLoading(a => ({ ...a, [`push_${id}`]: false }))
    }
  }

  const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
  const isFiltered = search || filterMonth || filterYear

  return (
    <PageShell>
      <PageHeader
        title="Payslip Vault"
        subtitle={<>Management console for <strong>{pagination.total}</strong> generated artifacts.</>}
        actions={
          <button onClick={() => navigate('/generate')} className="btn-primary btn-md">
            <Plus size={18} strokeWidth={3} />
            Create New
          </button>
        }
      />

      {/* Filter Management Bar */}
      <div className="fade-in glass" style={{
        padding: '16px 20px', marginBottom: 24,
        display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Filter by employee, ID, or department..."
            style={{
              width: '100%', padding: '12px 16px 12px 42px',
              border: '1.5px solid var(--border)', borderRadius: 12,
              fontSize: 14, color: 'var(--text)', outline: 'none',
              background: 'var(--bg)', fontWeight: 500
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} color="var(--text-light)" />
            <select
              value={filterMonth}
              onChange={e => { setFilterMonth(e.target.value); setPage(1) }}
              style={{
                border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)',
                padding: '10px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', cursor: 'pointer', fontWeight: 600
              }}
            >
              <option value="">Month</option>
              {MONTHS.slice(1).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <select
            value={filterYear}
            onChange={e => { setFilterYear(e.target.value); setPage(1) }}
            style={{
              border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)',
              padding: '10px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', cursor: 'pointer', fontWeight: 600
            }}
          >
            <option value="">Year</option>
            {YEARS.slice(1).map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {isFiltered && (
            <button
              onClick={() => { setSearch(''); setFilterMonth(''); setFilterYear(''); setPage(1) }}
              style={{
                background: 'var(--bg)', color: 'var(--primary)', border: '1px solid var(--primary)',
                borderRadius: 10, padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Racked Data View */}
      <div className="fade-in glass" style={{ animationDelay: '100ms', overflow: 'hidden' }}>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#58833b' }}>
                {['Employee Details', 'Period', 'Compensation', 'Tracking', 'Portal', 'Actions'].map((h, i) => (
                  <th key={h} style={{
                    padding: '16px 20px', textAlign: i === 5 ? 'right' : 'left',
                    fontSize: 11, fontWeight: 800, color: '#ffffff',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} style={{ padding: '20px' }}>
                        <div className="skeleton" style={{ height: 18, width: '80%', borderRadius: 6 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payslips.length === 0 ? (
                <EmptyState filtered={!!isFiltered} />
              ) : (
                payslips.map((p, idx) => (
                  <tr
                    key={p._id}
                    onClick={() => navigate(`/payslips/${p._id}`)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'all 0.2s',
                      background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                  >
                    {/* Employee Identity */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: 12,
                          background: 'var(--primary)', color: '#ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 900, fontSize: 15, flexShrink: 0,
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}>
                          {p.employeeName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.employeeName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{p.employeeId} · <span style={{ color: 'var(--primary)' }}>{p.department}</span></div>
                        </div>
                      </div>
                    </td>

                    {/* Timeline */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{p.month}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 600 }}>CY {p.year}</div>
                    </td>

                    {/* Salary */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: 15 }}>{fmt(p.netSalary)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Statutory Net</div>
                    </td>

                    {/* Status Tracking */}
                    <td style={{ padding: '16px 20px' }}>
                      {p.emailSent
                        ? <div className="badge badge-green">✓ Dispatched</div>
                        : <div className="badge" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Draft Only</div>
                      }
                    </td>

                    {/* Portal Visibility */}
                    <td style={{ padding: '16px 20px' }}>
                      {p.isPushedToPortal 
                        ? <div className="badge badge-emerald">Live</div>
                        : <div className="badge badge-red">Hidden</div>
                      }
                    </td>

                    {/* Professional Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <ActionBtn icon={Eye} label="View Full Slip" onClick={() => navigate(`/payslips/${p._id}`)} color="var(--primary)" />
                        <ActionBtn icon={Share2} label="Push to Portal" loading={actionLoading[`push_${p._id}`]} onClick={() => handlePush(p._id)} color="var(--primary)" />
                        <ActionBtn icon={Copy} label="Clone Document" loading={actionLoading[`dup_${p._id}`]} onClick={() => handleDuplicate(p._id)} color="var(--primary)" />
                        <ActionBtn icon={Download} label="Export PDF" loading={actionLoading[`dl_${p._id}`]} onClick={() => handleDownload(p._id, p.employeeName, p.month, p.year)} color="var(--primary)" />
                        <ActionBtn icon={Mail} label="Push to Email" loading={actionLoading[`em_${p._id}`]} onClick={() => handleEmail(p._id, p.employeeEmail)} color="var(--primary)" />
                        <ActionBtn icon={Trash2} label="Purge Record" loading={deleting === p._id} onClick={() => handleDelete(p._id)} color="var(--primary)" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Global Pagination Console */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 32px', borderTop: '1.5px solid var(--border)',
            background: 'var(--bg)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
              Viewing {((page - 1) * 10) + 1} – {Math.min(page * 10, pagination.total)} of {pagination.total} records
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="btn-hover"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', border: '1.5px solid var(--border)',
                  borderRadius: 12, background: 'var(--surface)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  color: page === 1 ? 'var(--text-light)' : 'var(--primary)', fontSize: 13, fontWeight: 700
                }}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, pagination.totalPages))}
                disabled={page === pagination.totalPages}
                className="btn-hover"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', border: '1.5px solid var(--border)',
                  borderRadius: 12, background: 'var(--surface)',
                  cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer',
                  color: page === pagination.totalPages ? 'var(--text-light)' : 'var(--primary)', fontSize: 13, fontWeight: 700
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}

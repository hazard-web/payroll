import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, Download, Mail, Trash2, FileText,
  ChevronLeft, ChevronRight, Loader2, Copy, Plus, Share2, MoreVertical
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import PageShell, { PageHeader } from '../components/PageShell'
import { Avatar, EmptyState, SearchInput, Modal } from '../components/UI'
import { motion } from 'framer-motion'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)

const ActionBtn = React.memo(({ icon: Icon, label, onClick, color = 'var(--text-muted)', loading }) => {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={label}
      disabled={loading}
      className="btn-icon btn-hover"
      style={{ width: 34, height: 34, borderRadius: 10, color }}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={15} />}
    </button>
  )
})

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
  const [selectedPayslip, setSelectedPayslip] = useState(null)

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
  useEffect(() => {
    if (selectedPayslip === null) return
    const handleClose = () => setSelectedPayslip(null)
    window.addEventListener('click', handleClose)
    return () => window.removeEventListener('click', handleClose)
  }, [selectedPayslip])



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
      toast.error(err.response?.data?.message || err.message || 'PDF generation failed')
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
      navigate('/payslips/generate', { state: { duplicateData } })
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
    <PageShell style={{ maxWidth: 'none' }}>
      {/* Filter Bar */}
      <div className="fade-in glass" style={{
        padding: 'var(--space-4) var(--space-5)', marginBottom: 'var(--space-6)',
        display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 300px' }}>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Filter by employee, ID, or department..."
          />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} color="var(--text-light)" />
            <select
              value={filterMonth}
              onChange={e => { setFilterMonth(e.target.value); setPage(1) }}
              className="input-field"
              style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, width: 'auto' }}
            >
              <option value="">Month</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <select
            value={filterYear}
            onChange={e => { setFilterYear(e.target.value); setPage(1) }}
            className="input-field"
            style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, width: 'auto' }}
          >
            <option value="">Year</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {isFiltered && (
            <button
              onClick={() => { setSearch(''); setFilterMonth(''); setFilterYear(''); setPage(1) }}
              className="btn-secondary btn-sm"
              style={{ height: 34, borderRadius: 8, fontSize: 12, fontWeight: 600 }}
            >
              Reset Filters
            </button>
          )}

          <button
            onClick={() => navigate('/payslips/generate')}
            className="btn-primary"
            style={{ 
              height: 34, 
              padding: '0 14px', 
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
            <Plus size={16} strokeWidth={2.5} /> Create New
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="fade-in glass" style={{ animationDelay: '100ms', overflow: 'visible' }}>
        <div className="table-card" style={{ border: 'none', overflow: 'visible' }}>
          <table className="data-table" style={{ minWidth: 800 }}>
            <thead>
              <tr style={{ background: 'var(--primary)' }}>
                {['Employee Details', 'Period', 'Compensation', 'Tracking', 'Actions'].map((h, i) => (
                  <th key={h} style={{
                    textAlign: i === 4 ? 'right' : 'left',
                    color: 'var(--primary-text)',
                    padding: '10px 16px',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && payslips.length === 0 ? (
                [...Array(5)].map((_, i) => (
                  <tr key={`skel-pl-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                        <div>
                          <div style={{ width: 120, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', marginBottom: 6 }} />
                          <div style={{ width: 80, height: 10, borderRadius: 4, background: 'var(--bg-alt)', animation: 'pulse 1.5s infinite' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ width: 60, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', marginBottom: 6 }} />
                      <div style={{ width: 45, height: 10, borderRadius: 4, background: 'var(--bg-alt)', animation: 'pulse 1.5s infinite' }} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ width: 70, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite', marginBottom: 6 }} />
                      <div style={{ width: 50, height: 10, borderRadius: 4, background: 'var(--bg-alt)', animation: 'pulse 1.5s infinite' }} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ width: 65, height: 18, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite', marginLeft: 'auto' }} />
                    </td>
                  </tr>
                ))
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '10px 16px' }}>
                    <div style={{ padding: '60px 24px' }}>
                      <EmptyState
                        icon={FileText}
                        title={isFiltered ? 'No search results' : 'Your archive is empty'}
                        description={isFiltered ? "We couldn't find any payslips matching those specific filters." : 'Generate your first professional payslip to see it appear here.'}
                      />
                    </div>
                  </td>
                </tr>
              ) : (
                payslips.map((p, i) => (
                  <motion.tr
                    key={p._id}
                    onClick={() => navigate(`/payslips/${p._id}`)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    className="table-row-hover"
                  >
                    {/* Employee Identity */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={p.employeeName} src={p.employeeImage} size="lg" style={{ width: 32, height: 32, fontSize: 11, borderRadius: 8, background: 'var(--primary)' }} />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.employeeName}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>{p.employeeId} · <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{p.department}</span></div>
                        </div>
                      </div>
                    </td>

                    {/* Period */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--primary)' }}>{p.month}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-light)', fontWeight: 600 }}>CY {p.year}</div>
                    </td>

                    {/* Salary */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12.5 }}>{fmt(p.netSalary)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Statutory Net</div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '10px 16px' }}>
                      {p.emailSent
                        ? <span className="badge badge-green" style={{ fontSize: 10, padding: '3px 8px' }}>✓ Dispatched</span>
                        : <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: 10, padding: '3px 8px' }}>Draft Only</span>
                      }
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 16px', textAlign: 'right', position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedPayslip(selectedPayslip?._id === p._id ? null : p)
                        }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          color: 'var(--text-light)',
                          background: 'transparent',
                          border: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        className="btn-hover"
                        title="Actions"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {selectedPayslip?._id === p._id && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: (i >= payslips.length - 2 && payslips.length > 2) ? 'auto' : '80%',
                            bottom: (i >= payslips.length - 2 && payslips.length > 2) ? '80%' : 'auto',
                            width: 170,
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            boxShadow: 'var(--shadow-lg)',
                            zIndex: 120,
                            overflow: 'hidden',
                            padding: '4px 0',
                            textAlign: 'left'
                          }}
                        >
                          <button
                            onClick={() => { setSelectedPayslip(null); navigate(`/payslips/${p._id}`); }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'background 0.15s'
                            }}
                          >
                            📄 View Full Slip
                          </button>
                          <button
                            onClick={async () => {
                              setSelectedPayslip(null);
                              await handlePush(p._id);
                            }}
                            disabled={actionLoading[`push_${p._id}`]}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              color: p.isPushedToPortal ? '#22c55e' : 'var(--text)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'background 0.15s'
                            }}
                          >
                            🌐 {p.isPushedToPortal ? 'Remove Portal' : 'Push to Portal'}
                          </button>
                          <button
                            onClick={async () => {
                              setSelectedPayslip(null);
                              await handleEmail(p._id, p.employeeEmail);
                            }}
                            disabled={actionLoading[`em_${p._id}`]}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              color: p.emailSent ? '#3b82f6' : 'var(--text)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'background 0.15s'
                            }}
                          >
                            ✉️ {p.emailSent ? 'Resend Email' : 'Send to Email'}
                          </button>
                          <button
                            onClick={async () => {
                              setSelectedPayslip(null);
                              await handleDownload(p._id, p.employeeName, p.month, p.year);
                            }}
                            disabled={actionLoading[`dl_${p._id}`]}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'background 0.15s'
                            }}
                          >
                            📥 Download PDF
                          </button>
                          <button
                            onClick={async () => {
                              setSelectedPayslip(null);
                              await handleDuplicate(p._id);
                            }}
                            disabled={actionLoading[`dup_${p._id}`]}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'background 0.15s'
                            }}
                          >
                            📋 Clone Record
                          </button>
                          <button
                            onClick={async () => {
                              setSelectedPayslip(null);
                              await handleDelete(p._id);
                            }}
                            disabled={deleting === p._id}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'background 0.15s'
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination-bar">
            <div className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>
              Viewing {((page - 1) * 10) + 1} – {Math.min(page * 10, pagination.total)} of {pagination.total} records
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="btn-ghost btn-hover"
                style={{ color: page === 1 ? 'var(--text-light)' : 'var(--primary)' }}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, pagination.totalPages))}
                disabled={page === pagination.totalPages}
                className="btn-ghost btn-hover"
                style={{ color: page === pagination.totalPages ? 'var(--text-light)' : 'var(--primary)' }}
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
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, Eye, Download, Mail, Trash2, FileText,
  ChevronLeft, ChevronRight, Loader2, Copy, Plus, Share2
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import PageShell, { PageHeader } from '../components/PageShell'
import { Avatar, EmptyState, SearchInput } from '../components/UI'

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

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="fade-in glass" style={{ animationDelay: '100ms', overflow: 'hidden' }}>
        <div className="table-card" style={{ border: 'none' }}>
          <table className="data-table" style={{ minWidth: 800 }}>
            <thead>
              <tr style={{ background: 'var(--primary)' }}>
                {['Employee Details', 'Period', 'Compensation', 'Tracking', 'Actions'].map((h, i) => (
                  <th key={h} style={{
                    textAlign: i === 4 ? 'right' : 'left',
                    color: 'var(--primary-text)',
                    padding: 'var(--space-4) var(--space-5)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j}>
                        <div className="skeleton" style={{ height: 18, width: '80%', borderRadius: 6 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={5}>
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
                payslips.map((p) => (
                  <tr
                    key={p._id}
                    onClick={() => navigate(`/payslips/${p._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Employee Identity */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <Avatar name={p.employeeName} size="lg" style={{ width: 42, height: 42, fontSize: 15, borderRadius: 12, background: 'var(--primary)' }} />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.employeeName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{p.employeeId} · <span style={{ color: 'var(--primary)' }}>{p.department}</span></div>
                        </div>
                      </div>
                    </td>

                    {/* Timeline */}
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{p.month}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 600 }}>CY {p.year}</div>
                    </td>

                    {/* Salary */}
                    <td>
                      <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: 15 }}>{fmt(p.netSalary)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Statutory Net</div>
                    </td>

                    {/* Status */}
                    <td>
                      {p.emailSent
                        ? <span className="badge badge-green">✓ Dispatched</span>
                        : <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Draft Only</span>
                      }
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
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
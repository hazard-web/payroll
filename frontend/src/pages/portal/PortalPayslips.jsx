import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Loader2, Search, Download, FileText } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import PageShell, { PageHeader } from '../../components/PageShell'
import { motion } from 'framer-motion'

export default function PortalPayslips() {
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchPayslips()
  }, [])

  const fetchPayslips = async (query = '') => {
    try {
      setLoading(true)
      const searchParam = encodeURIComponent(query.trim())
      const res = await api.get(`/portal/payslips?search=${searchParam}`)
      setPayslips(res.data.data)
    } catch (err) {
      console.error('Payslips error:', err)
      toast.error('Failed to load payslips')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (id) => {
    try {
      // Use /portal/payslips/:id/download so the api.js interceptor sends
      // the staffToken (portal routes get staffToken priority).
      const response = await api.get(`/portal/payslips/${id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Payslip_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Download failed')
    }
  }

  const handleSearch = (e) => {
    const val = e.target.value
    setSearch(val)
    fetchPayslips(val)
  }

  return (
    <PageShell>
      <PageHeader
        title="My Payslips"
        subtitle="Access and download your digital payslip archive."
        actions={
        <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            type="text"
            placeholder="Search by month or year..."
            value={search}
            onChange={handleSearch}
            className="input-field"
            style={{ width: '100%', paddingLeft: 44 }}
          />
        </div>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={40} className="animate-spin text-muted" />
        </div>
      ) : payslips.length === 0 ? (
        <div className="card" style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <FileText size={40} color="var(--text-light)" />
          </div>
          <h3 style={{ color: 'var(--primary)', marginBottom: 8 }}>No payslips found</h3>
          <p>Your workspace administrator has not pushed any payslips to your portal yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {payslips.map((p) => (
            <motion.div 
              key={p._id} 
              whileHover={{ y: -2 }} 
              className="card" 
              style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{p.month} {p.year}</div>
                <div style={{ fontSize: 13, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>Net Payable: ₹{p.netSalary.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2, fontWeight: 500 }}>Ref: {p._id.slice(-8).toUpperCase()}</div>
              </div>
              <button
                onClick={() => handleDownload(p._id)}
                style={{
                  width: 44, height: 44, borderRadius: 12, background: 'var(--primary)', color: 'white',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15,23,42,0.2)'
                }}
                title="Download PDF"
                className="btn-hover"
              >
                <Download size={20} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: 48, padding: 24, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
            <CalendarIcon size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: 15 }}>Policy Reminder</h4>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              The portal displays payslips for the <strong>last 3 months only</strong>. For older records or historical data, please contact your HR or Corporate Portal administrator.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

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
    <PageShell style={{ maxWidth: 'none' }}>
      <PageHeader
        title="My Payslips"
        subtitle="Access and download your digital payslip archive."
        actions={
          <div style={{ position: 'relative', width: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={handleSearch}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
            />
          </div>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      ) : payslips.length === 0 ? (
        <div 
          style={{ 
            padding: '60px 40px', 
            textAlign: 'center', 
            background: 'var(--surface)', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FileText size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 style={{ color: 'var(--text)', marginBottom: 6, fontSize: '16px', fontWeight: 700 }}>No Payslips Available</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
            Your company administrator has not published any digital payslips to your portal yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {payslips.map((p) => (
            <motion.div 
              key={p._id} 
              whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }} 
              style={{ 
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                transition: 'box-shadow 0.2s, border-color 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, overflow: 'hidden' }}>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '10px', 
                  background: 'rgba(88, 131, 59, 0.08)', 
                  color: 'var(--primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileText size={20} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.month} {p.year}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      color: 'var(--primary)', 
                      background: 'rgba(88, 131, 59, 0.08)', 
                      fontWeight: 700, 
                      padding: '3px 6px', 
                      borderRadius: '5px',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}>
                      Net: ₹{p.netSalary.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                    Ref: #{p._id.slice(-8).toUpperCase()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDownload(p._id)}
                style={{
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '10px', 
                  background: 'var(--primary)', 
                  color: 'white',
                  border: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  transition: 'all 0.2s', 
                  boxShadow: '0 4px 10px rgba(88, 131, 59, 0.2)',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                title="Download PDF"
              >
                <Download size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
      
      <div 
        style={{ 
          marginTop: '36px', 
          padding: '18px', 
          background: 'rgba(245, 158, 11, 0.02)', 
          borderRadius: '12px', 
          border: '1px dashed rgba(245, 158, 11, 0.2)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '8px', 
            background: 'rgba(245, 158, 11, 0.08)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#d97706', 
            flexShrink: 0 
          }}>
            <CalendarIcon size={16} />
          </div>
          <div>
            <h4 style={{ margin: 0, color: '#b45309', fontSize: '13px', fontWeight: 700 }}>Retention Policy Reminder</h4>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              The Employee Self-Service portal maintains active records for the <strong>last 3 months only</strong>. For historical payslips, legacy data, or records older than 90 days, please contact your company's HR department or Corporate Portal Administrator directly.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

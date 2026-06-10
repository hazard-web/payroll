import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Download, Mail, Printer, Loader2,
  Building2, User, Calendar, Banknote, CheckCircle2, Share2
} from 'lucide-react'
import api from '../api'
import PageShell from '../components/PageShell'

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '8px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)', flex: '0 0 160px' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius)',
      border: '1px solid var(--border)', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px', background: accent ? 'var(--primary)' : 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: accent ? 'rgba(201,168,76,0.2)' : 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} color={accent ? 'var(--primary)' : 'white'} />
        </div>
        <span style={{
          fontWeight: 700, fontSize: 13.5,
          color: accent ? 'white' : 'var(--primary)',
        }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

function SalaryRow({ label, amount, type = 'earning', bold }) {
  const color = type === 'earning' ? 'var(--green)' : type === 'deduction' ? 'var(--red)' : 'var(--primary)'
  if (!amount || parseFloat(amount) === 0) return null
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 12px', borderRadius: 7, marginBottom: 3,
      background: bold ? (type === 'net' ? 'var(--primary)' : 'var(--surface-2)') : 'transparent',
    }}>
      <span style={{
        fontSize: bold ? 13.5 : 13,
        fontWeight: bold ? 700 : 400,
        color: bold && type === 'net' ? 'var(--primary)' : 'var(--text)',
      }}>
        {label}
      </span>
      <span style={{
        fontWeight: bold ? 700 : 500,
        fontSize: bold ? 15 : 13,
        color: bold && type === 'net' ? 'white' : color,
      }}>
        ₹{parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </span>
    </div>
  )
}

function EmailModal({ payslip, onClose, onSent }) {
  const [email, setEmail] = useState(payslip.employeeEmail)
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!email) { toast.error('Enter an email address'); return }
    setLoading(true)
    try {
      await api.post(`/payslips/${payslip._id}/email`, { email })
      toast.success(`Payslip sent to ${email}`)
      onSent()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(2px)',
    }}>
      <div className="fade-up" style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        padding: '32px', width: 440, boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mail size={20} color="#0284c7" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Send Payslip via Email</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF will be attached automatically</div>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Recipient Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px',
              border: '1.5px solid var(--border)', borderRadius: 8,
              fontSize: 14, color: 'var(--text)', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
            Edit to send to a different address
          </div>
        </div>

        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          <strong>Subject:</strong> Salary Slip for {payslip.month} {payslip.year} — {payslip.companyName}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', border: '1.5px solid var(--border)',
              borderRadius: 8, background: 'none', fontWeight: 500, cursor: 'pointer', fontSize: 14,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading}
            style={{
              flex: 2, padding: '10px', border: 'none',
              borderRadius: 8, background: loading ? 'var(--text-light)' : '#0284c7',
              color: 'white', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</> : <><Mail size={15} /> Send Email</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PayslipDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [payslip, setPayslip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const fetchPayslip = async () => {
    try {
      const res = await api.get(`/payslips/${id}`)
      setPayslip(res.data.data)
    } catch (err) {
      toast.error('Failed to load payslip')
      navigate('/payslips')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayslip() }, [id])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/payslips/${id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Payslip_${payslip.employeeName.replace(/\s+/g,'_')}_${payslip.month}_${payslip.year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded!')
    } catch (err) {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const handlePush = async (id) => {
    setActionLoading(a => ({ ...a, [`push_${id}`]: true }))
    try {
      const res = await api.post(`/payslips/${id}/push`)
      toast.success(res.data.message)
      fetchPayslip()
    } catch (err) {
      toast.error('Failed to update portal visibility')
    } finally {
      setActionLoading(a => ({ ...a, [`push_${id}`]: false }))
    }
  }

  const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })

  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {[1, 2].map(i => (
            <div key={i} className="skeleton" style={{ flex: 1, height: 400, borderRadius: 'var(--radius)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!payslip) return null

  const p = payslip

  return (
    <PageShell wide>
      {showEmailModal && (
        <EmailModal payslip={p} onClose={() => setShowEmailModal(false)} onSent={fetchPayslip} />
      )}

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate('/payslips')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none',
            border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
            fontSize: 13, marginBottom: 16,
          }}
        >
          <ArrowLeft size={14} /> Back to All Payslips
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {p.companyLogo && (
              <img 
                src={p.companyLogo} 
                alt="Company Logo" 
                style={{ height: 60, width: 'auto', borderRadius: 12, objectFit: 'contain', background: 'white', padding: 4, border: '1px solid var(--border)' }} 
              />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>
                  {p.employeeName}
                </h1>
                {p.emailSent && (
                  <span className="badge badge-green">
                    <CheckCircle2 size={10} /> Emailed
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', marginTop: 5, fontSize: 14 }}>
                {p.employmentType === 'intern' ? 'Intern' : 'Regular Employee'} · {p.designation} · {p.department}
              </p>
            </div>
          </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
              <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--primary)' }}>
                {p.month} {p.year}
              </span>
              {p.annualCTC > 0 && (
                <span className="badge" style={{ background: 'var(--gold-pale)', color: 'var(--navy-dark)' }}>
                  Annual CTC: ₹{p.annualCTC.toLocaleString('en-IN')}
                </span>
              )}
            </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: '#16a34a', color: 'white',
                border: 'none', borderRadius: 9, padding: '10px 18px',
                fontWeight: 600, fontSize: 13.5, cursor: downloading ? 'wait' : 'pointer',
              }}
            >
              {downloading
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                : <><Download size={14} /> Download PDF</>
              }
            </button>
            <button
              onClick={() => handlePush(p._id)}
              disabled={actionLoading[`push_${p._id}`]}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: p.isPushedToPortal ? 'var(--emerald)' : 'var(--primary)', color: 'white',
                border: 'none', borderRadius: 9, padding: '10px 18px',
                fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
              }}
            >
              {actionLoading[`push_${p._id}`] ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              {p.isPushedToPortal ? 'Live on Portal' : 'Push to Portal'}
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: '#0284c7', color: 'white',
                border: 'none', borderRadius: 9, padding: '10px 18px',
                fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
              }}
            >
              <Mail size={14} /> Send Email
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Company Info */}
        <SectionCard title="Company" icon={Building2}>
          <InfoRow label="Company Name" value={p.companyName} />
          <InfoRow label="Address" value={p.companyAddress} />
          <InfoRow label="Email" value={p.companyEmail} />
          <InfoRow label="Phone" value={p.companyPhone} />
          <InfoRow label="CIN" value={p.companyCIN} />
        </SectionCard>

        {/* Employee Info */}
        <SectionCard title="Employee" icon={User}>
          <InfoRow label="Name" value={p.employeeName} />
          <InfoRow label="Employee ID" value={p.employeeId} />
          <InfoRow label="Designation" value={p.designation} />
          <InfoRow label="Department" value={p.department} />
          <InfoRow label="Email" value={p.employeeEmail} />
          <InfoRow label="Date of Joining" value={p.dateOfJoining} />
          <InfoRow label="PAN" value={p.panNumber} />
          <InfoRow label="PF No." value={p.pfNumber} />
          <InfoRow label="Bank Account" value={p.bankAccount ? `****${p.bankAccount.slice(-4)}` : null} />
          <InfoRow label="Bank Name" value={p.bankName} />
        </SectionCard>

        {/* Pay Period */}
        <SectionCard title="Pay Period" icon={Calendar}>
          <InfoRow label="Pay Period" value={`${p.month} ${p.year}`} />
          <InfoRow label="Pay Date" value={p.payDate} />
          <InfoRow label="Working Days" value={p.workingDays} />
          <InfoRow label="Paid Days" value={p.paidDays} />
          <InfoRow label="Loss of Pay Days" value={p.workingDays - p.paidDays} />
        </SectionCard>

        {/* Salary Breakdown */}
        <SectionCard title="Salary Breakdown" icon={Banknote} accent>
          {/* Earnings */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
              Earnings
            </div>
            {p.employmentType === 'intern' ? (
              <SalaryRow label="Monthly Stipend" amount={p.stipend || p.grossEarnings} type="earning" bold />
            ) : (
              <>
                <SalaryRow label="Basic Salary (50%)" amount={p.basicSalary} type="earning" />
                <SalaryRow label="House Rent Allowance (40%)" amount={p.hra} type="earning" />
                <SalaryRow label="Special Allowance" amount={p.specialAllowance} type="earning" />
                <SalaryRow label="Employer PF Contribution" amount={p.employerPF} type="earning" />
                <SalaryRow label="Gross Earnings" amount={p.grossEarnings} type="earning" bold />
              </>
            )}
            {p.otherEarnings > 0 && (
              <SalaryRow label={p.otherEarningsLabel || 'Other Earnings'} amount={p.otherEarnings} type="earning" />
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

          {/* Deductions */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
              Deductions
            </div>
            <SalaryRow label="Provident Fund (PF)" amount={p.providentFund} type="deduction" />
            <SalaryRow label="ESI" amount={p.esi} type="deduction" />
            <SalaryRow label="Tax Deducted (TDS)" amount={p.tds} type="deduction" />
            <SalaryRow label="Professional Tax" amount={p.professionalTax} type="deduction" />
            <SalaryRow label="Loan Deduction" amount={p.loanDeduction} type="deduction" />
            <SalaryRow label={p.otherDeductionsLabel || 'Other Deductions'} amount={p.otherDeductions} type="deduction" />
            <SalaryRow label="Total Deductions" amount={p.totalDeductions} type="deduction" bold />
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

          {/* Net */}
          <SalaryRow label="NET SALARY PAYABLE" amount={p.netSalary} type="net" bold />

          {p.notes && (
            <div style={{
              marginTop: 14, background: 'var(--surface-2)', borderRadius: 8,
              padding: '10px 14px', fontSize: 12.5, color: 'var(--text-muted)',
            }}>
              <strong style={{ color: 'var(--text)' }}>Notes:</strong> {p.notes}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Email status */}
      {p.emailSent && (
        <div className="fade-up" style={{
          marginTop: 20, background: 'var(--green-light)', borderRadius: 10,
          padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
          border: '1px solid #a7f3d0',
        }}>
          <CheckCircle2 size={16} color="var(--green)" />
          <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
            Payslip was emailed to <strong>{p.employeeEmail}</strong>
            {p.emailSentAt && ` on ${new Date(p.emailSentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          </span>
        </div>
      )}

      {/* Generated at */}
      <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-light)', textAlign: 'right' }}>
        Generated: {new Date(p.createdAt).toLocaleString('en-IN')} · ID: {p._id}
      </div>
    </PageShell>
  )
}

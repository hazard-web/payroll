import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Download, Mail, Loader2,
  Building2, User, Calendar, Banknote, CheckCircle2, Share2
} from 'lucide-react'
import api from '../api'
import PageShell, { PageLoading } from '../components/PageShell'
import { Modal, InputField } from '../components/UI'

function InfoRow({ label, value, always = false }) {
  if (!value && !always) return null
  return (
    <div className="preview-row">
      <span className="preview-row__label" style={{ flex: '0 0 160px' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: value ? 'var(--text)' : 'var(--text-muted)', textAlign: 'right', wordBreak: 'break-word' }}>
        {value || '—'}
      </span>
    </div>
  )
}

function SalaryRow({ label, amount, type = 'earning', bold }) {
  const color = type === 'earning' ? 'var(--primary)' : type === 'deduction' ? '#b91c1c' : 'var(--primary)'
  if (!amount || parseFloat(amount) === 0) return null
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 12px', borderRadius: 7, marginBottom: 3,
      background: bold ? (type === 'net' ? 'var(--primary)' : 'var(--bg)') : 'transparent',
    }}>
      <span style={{
        fontSize: bold ? 13 : 12.5,
        fontWeight: bold ? 700 : 400,
        color: bold && type === 'net' ? '#fff' : 'var(--text)',
      }}>{label}</span>
      <span style={{
        fontWeight: bold ? 700 : 500,
        fontSize: bold ? 14 : 12.5,
        color: bold && type === 'net' ? '#fff' : color,
      }}>
        ₹{parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </span>
    </div>
  )
}

function isOTLabel(label = '') {
  return /\b(ot|overtime|over time)\b/i.test(String(label))
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
    <Modal open onClose={onClose} size="sm" className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="stat-icon stat-icon--blue" style={{ width: 42, height: 42 }}>
          <Mail size={20} color="#0284c7" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Send Payslip via Email</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF will be attached automatically</div>
        </div>
      </div>

      <InputField
        label="Recipient Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        hint="Edit to send to a different address"
      />

      <div className="text-muted" style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12 }}>
        <strong>Subject:</strong> Salary Slip for {payslip.month} {payslip.year} — {payslip.companyName}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px' }}>Cancel</button>
        <button onClick={handleSend} disabled={loading} className="btn-primary" style={{ flex: 2, padding: '10px', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : <><Mail size={15} /> Send Email</>}
        </button>
      </div>
    </Modal>
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

  if (loading) return <PageLoading label="Loading payslip…" />
  if (!payslip) return null

  const p = payslip

  return (
    <PageShell wide>
      {showEmailModal && (
        <EmailModal payslip={p} onClose={() => setShowEmailModal(false)} onSent={fetchPayslip} />
      )}

      <div className="fade-up" style={{ marginBottom: 'var(--space-6)' }}>
        <button onClick={() => navigate('/payslips')} className="page-back-btn" style={{ marginBottom: 'var(--space-4)' }}>
          <ArrowLeft size={14} /> Back to All Payslips
        </button>

        <div className="page-header">
          <div className="page-header__main">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {p.employeeImage ? (
                <img src={p.employeeImage} alt="Employee Avatar" style={{ height: 60, width: 60, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border)' }} />
              ) : (
                <div style={{
                  height: 60, width: 60, borderRadius: '50%', background: 'var(--primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22
                }}>
                  {p.employeeName ? p.employeeName[0].toUpperCase() : 'E'}
                </div>
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 className="page-title" style={{ fontSize: 28, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 360 }}>{p.employeeName}</h1>
                  {p.emailSent && <span className="badge badge-green"><CheckCircle2 size={10} /> Emailed</span>}
                </div>
                <p className="page-subtitle" style={{ marginTop: 4 }}>
                  {p.employmentType === 'intern' ? 'Intern' : 'Regular Employee'} · {p.designation} · {p.department}
                </p>
              </div>
            </div>
          </div>
          <div className="page-header__actions" style={{ marginTop: 0 }}>
            <span className="badge" style={{ background: 'var(--bg)', color: 'var(--primary)' }}>{p.month} {p.year}</span>
            {p.annualCTC > 0 && (
              <span className="badge" style={{ background: 'var(--primary-tint)', color: 'var(--text-dark)' }}>
                Annual CTC: ₹{p.annualCTC.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleDownload} disabled={downloading} className="btn-primary" style={{ background: 'var(--primary)' }}>
            {downloading ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Download size={14} /> Download PDF</>}
          </button>
          <button
            onClick={() => handlePush(p._id)}
            disabled={actionLoading[`push_${p._id}`]}
            className="btn-primary"
            style={{ background: p.isPushedToPortal ? 'var(--emerald)' : 'var(--primary)' }}
          >
            {actionLoading[`push_${p._id}`] ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            Push to Portal
          </button>
          <button onClick={() => setShowEmailModal(true)} className="btn-primary" style={{ background: '#0284c7' }}>
            <Mail size={14} /> Send Email
          </button>
        </div>
      </div>

      <div className="form-grid-2">
        <div className="section-card">
          <div className="section-card__header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="stat-icon" style={{ width: 30, height: 30 }}>
              <Building2 size={14} />
            </div>
            <h3 className="section-card__title">Company</h3>
          </div>
          <div className="section-card__body">
            {p.companyLogo && (
              <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <img
                  src={p.companyLogo}
                  alt={p.companyName || 'Company Logo'}
                  style={{
                    height: 52, width: 'auto', maxWidth: '100%',
                    objectFit: 'contain', borderRadius: 8,
                    background: 'var(--bg)', padding: 6,
                    border: '1px solid var(--border)',
                    display: 'block',
                  }}
                />
              </div>
            )}
            <InfoRow label="Company Name" value={p.companyName || 'BDA Technologies Private Limited'} />
            <InfoRow label="Address" value={p.companyAddress || 'Flat No. 207, Plot No. 31A, Unione Residency, Akbarpur, Behrampur, Ghaziabad, Uttar Pradesh, India, 201009'} />
            <InfoRow label="Email" value={p.companyEmail || 'hr@bdatechnologies.com'} />
            <InfoRow label="Phone" value={p.companyPhone || '—'} />
            <InfoRow label="Website" value={p.companyWebsite || 'www.bdatechnologies.com'} />
            <InfoRow label="CIN" value={p.companyCIN || 'U74999UP2017PTC096671'} />
            <InfoRow label="GST No." value={p.companyGST || '09AAHCB4248F1ZO'} />
          </div>
        </div>

        <div className="section-card">
          <div className="section-card__header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="stat-icon" style={{ width: 30, height: 30 }}>
              <User size={14} />
            </div>
            <h3 className="section-card__title">Employee</h3>
          </div>
          <div className="section-card__body">
            <InfoRow label="Name" value={p.employeeName} />
            <InfoRow label="Employee ID" value={p.employeeId} />
            <InfoRow label="Designation" value={p.designation} />
            <InfoRow label="Department" value={p.department} />
            <InfoRow label="Email" value={p.employeeEmail} />
            <InfoRow label="Date of Joining" value={p.dateOfJoining} />
            <InfoRow label="PAN Number" value={p.panNumber} always />
            <InfoRow label="PF Number" value={p.pfNumber} always />
            <InfoRow label="Bank Account" value={p.bankAccount ? `****${String(p.bankAccount).slice(-4)}` : null} always />
            <InfoRow label="Bank Name" value={p.bankName} always />
          </div>
        </div>

        <div className="section-card">
          <div className="section-card__header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="stat-icon" style={{ width: 30, height: 30 }}>
              <Calendar size={14} />
            </div>
            <h3 className="section-card__title">Pay Period</h3>
          </div>
          <div className="section-card__body">
            <InfoRow label="Pay Period" value={`${p.month} ${p.year}`} />
            <InfoRow label="Pay Date" value={p.payDate} />
            <InfoRow label="Working Days" value={p.workingDays} />
            <InfoRow label="Paid Days" value={p.paidDays} />
            <InfoRow label="Loss of Pay Days" value={p.workingDays - p.paidDays} />
          </div>
        </div>

        <div className="section-card">
          <div className="section-card__header" style={{ background: 'var(--primary)', borderBottomColor: 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote size={14} color="#fff" />
            </div>
            <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700, color: '#fff' }}>Salary Breakdown</h3>
          </div>
          <div className="section-card__body">
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Earnings</div>
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
              {p.otherEarnings > 0 && !isOTLabel(p.otherEarningsLabel) && (
                <SalaryRow label={p.otherEarningsLabel || 'Other Earnings'} amount={p.otherEarnings} type="earning" />
              )}
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Deductions</div>
              <SalaryRow label="Provident Fund (PF)" amount={p.providentFund} type="deduction" />
              <SalaryRow label="ESI" amount={p.esi} type="deduction" />
              <SalaryRow label="Tax Deducted (TDS)" amount={p.tds} type="deduction" />
              <SalaryRow label="Professional Tax" amount={p.professionalTax} type="deduction" />
              <SalaryRow label="Loan Deduction" amount={p.loanDeduction} type="deduction" />
              <SalaryRow label={p.otherDeductionsLabel || 'Other Deductions'} amount={p.otherDeductions} type="deduction" />
              <SalaryRow label="Total Deductions" amount={p.totalDeductions} type="deduction" bold />
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

            <SalaryRow label="NET SALARY PAYABLE" amount={p.netSalary} type="net" bold />

            {p.notes && (
              <div style={{ marginTop: 14, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text)' }}>Notes:</strong> {p.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {p.emailSent && (
        <div className="fade-up" style={{
          marginTop: 'var(--space-6)', background: 'var(--primary-tint)', borderRadius: 10,
          padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
          border: '1px solid rgba(88,131,59, 0.25)',
        }}>
          <CheckCircle2 size={16} color="var(--primary)" />
          <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>
            Payslip was emailed to <strong>{p.employeeEmail}</strong>
            {p.emailSentAt && ` on ${new Date(p.emailSentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          </span>
        </div>
      )}

      <div className="text-light" style={{ marginTop: 'var(--space-4)', fontSize: 11, textAlign: 'right' }}>
        Generated: {new Date(p.createdAt).toLocaleString('en-IN')} · ID: {p._id}
      </div>
    </PageShell>
  )
}
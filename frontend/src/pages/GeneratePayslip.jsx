import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Calendar,
  ChevronRight, Loader2,
  IndianRupee, Landmark, Send
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import api from '../api'
import PageShell from '../components/PageShell'
import AnimatedNumber from '../components/AnimatedNumber'
import {
  InputField, SelectField, SegmentedControl, Toggle, StepLabel, StaffSearchDropdown
} from '../components/UI'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)

const INITIAL = {
  companyName: '', companyAddress: '', companyEmail: '', companyPhone: '',
  companyCIN: '', companyGST: '', companyWebsite: '', companyLogo: '',
  employeeName: '', employeeId: '', designation: '', department: '', employeeEmail: '',
  dateOfJoining: '', bankAccount: '', bankName: '', panNumber: '', pfNumber: '',
  month: MONTHS[new Date().getMonth()], year: CURRENT_YEAR,
  payDate: new Date().toISOString().split('T')[0],
  workingDays: 0, paidDays: 0,
  employmentType: 'regular', annualCTC: '', baseSalary: '', stipend: '', employerPF: '',
  basicSalary: '0', hra: '0', specialAllowance: '0', otherEarnings: '0',
  providentFund: '0', esi: '0', professionalTax: '0', tds: '0',
  loanDeduction: '0', otherDeductions: '0', notes: '',
  automationEnabled: true,
}

const SEGMENTED_OPTIONS = [
  { value: 'regular', label: 'Regular Employee' },
  { value: 'intern', label: 'Internship' },
]

function PreviewRow({ label, value, type = 'normal', isDeduction }) {
  const valueClass =
    type === 'bold'
      ? 'preview-row__value preview-row__value--bold'
      : isDeduction
        ? 'preview-row__value preview-row__value--deduction'
        : 'preview-row__value'

  return (
    <div className="preview-row">
      <span className="preview-row__label">{label}</span>
      <span className={valueClass}>
        {typeof value === 'number' ? (
          <AnimatedNumber value={parseFloat(value || 0)} decimals={0} />
        ) : (
          value || '—'
        )}
      </span>
    </div>
  )
}

export default function GeneratePayslip() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const staffId = searchParams.get('staffId')

  const [staffList, setStaffList] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState(staffId || null)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [workingDaysPeriod, setWorkingDaysPeriod] = useState(null)
  const [payrollBreakdown, setPayrollBreakdown] = useState(null) // { workingDays, presentDays, paidLeaveDays, lwpDays, absentDays, paidDays }

  // Helper: count Mon–Fri days between two dates (inclusive)
  function countWorkingDays(start, end) {
    let count = 0;
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endD = new Date(end);
    endD.setHours(23, 59, 59, 999);
    while (cur <= endD) {
      const dow = cur.getDay(); // 0=Sun
      if (dow !== 0) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }
  useEffect(() => {
    api.get('/staff').then(res => {
      const list = res.data.data;
      setStaffList(list);

      // If staffId from URL, auto-fill
      if (staffId) {
        const s = list.find(x => x._id === staffId);
        if (s) {
          const empType = s.type === 'Employee' ? 'regular' : 'intern';
          setForm(f => ({
            ...f,
            employmentType: empType,
            employeeName: s.fullName,
            employeeId: s.employeeId,
            employeeEmail: s.email,
            designation: s.designation || '',
            department: s.department || '',
            dateOfJoining: s.joiningDate ? s.joiningDate.split('T')[0] : '',
            panNumber: s.financials?.panNumber || '',
            pfNumber: s.pfNumber || '',
            bankAccount: s.financials?.accountNumber || '',
            bankName: s.financials?.bankName || '',
            annualCTC: s.type === 'Employee' ? (s.salaryDetails?.annualCTC || '') : '',
            baseSalary: s.type === 'Intern' ? (s.salaryDetails?.baseSalary || '') : '',
          }))
          setSelectedStaffId(staffId)
          setStep(1); // Jump to first form stage
        }
      }
    }).catch(console.error)
  }, [staffId])

  const [step, setStep] = useState(user?.companyName ? 1 : 0)
  const [form, setForm] = useState(() => {
    let initialValues = { ...INITIAL };
    if (user) {
      initialValues = {
        ...initialValues,
        companyName:    user.companyName    || '',
        companyAddress: user.companyAddress || '',
        companyEmail:   user.companyEmail   || '',
        companyPhone:   user.companyPhone   || '',
        companyCIN:     user.companyCIN     || '',
        companyGST:     user.companyGST     || '',
        companyWebsite: user.companyWebsite || '',
        companyLogo:    user.companyLogo    || '',
      };
    }

    if (location.state?.duplicateData) {
      const { _id, createdAt, updatedAt, __v, user: _user, ...rest } = location.state.duplicateData;
      return { ...initialValues, ...rest };
    }

    if (location.state?.predefinedStaff) {
      const s = location.state.predefinedStaff;
      return {
        ...initialValues,
        employmentType: s.type.toLowerCase(),
        employeeName: s.fullName,
        employeeEmail: s.email,
        designation: s.designation || '',
        department: s.department || '',
        dateOfJoining: s.joiningDate ? s.joiningDate.split('T')[0] : '',
        panNumber: s.financials?.panNumber || '',
        bankAccount: s.financials?.accountNumber || '',
        bankName: s.financials?.bankName || '',
        annualCTC: s.type === 'Employee' ? (s.salaryDetails?.annualCTC || '') : '',
        baseSalary: s.type === 'Intern' ? (s.salaryDetails?.baseSalary || '') : '',
      }
    }

    return initialValues;
  })

  // Sync company profile into form whenever user context loads/updates.
  // This handles the case where user is null at mount (async auth) and
  // becomes available later, or when the admin updates their profile.
  useEffect(() => {
    if (!user) return;
    setForm(f => ({
      ...f,
      companyName:    user.companyName    || f.companyName    || '',
      companyAddress: user.companyAddress || f.companyAddress || '',
      companyEmail:   user.companyEmail   || f.companyEmail   || '',
      companyPhone:   user.companyPhone   || f.companyPhone   || '',
      companyCIN:     user.companyCIN     || f.companyCIN     || '',
      companyGST:     user.companyGST     || f.companyGST     || '',
      companyWebsite: user.companyWebsite || f.companyWebsite || '',
      companyLogo:    user.companyLogo    || f.companyLogo    || '',
    }));
    // Auto-skip to step 1 once company data is confirmed
    if (user.companyName) setStep(s => (s === 0 ? 1 : s));
  }, [user]);

  const [submitting, setSubmitting] = useState(false)


  // ── Payroll calculation: fetch full breakdown when staff + month + year changes ──
  useEffect(() => {
    const monthIndex = MONTHS.indexOf(form.month); // 0-based
    const year = parseInt(form.year);
    if (monthIndex === -1 || !year) return;

    // Always compute working days locally (Mon–Fri for the month)
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    const localWorkingDays = countWorkingDays(start, end);

    if (!selectedStaffId) {
      // No staff selected — just show working days, reset paid days
      setForm(f => ({ ...f, workingDays: localWorkingDays, paidDays: 0 }));
      setWorkingDaysPeriod({ count: localWorkingDays });
      setPayrollBreakdown(null);
      return;
    }

    // Staff selected — fetch full payroll summary from backend
    setAttendanceLoading(true);
    setPayrollBreakdown(null);
    api.get('/attendance/admin/payroll-summary', {
      params: { staffId: selectedStaffId, month: monthIndex + 1, year },
      __skipCache: true,
    })
      .then(res => {
        const s = res.data.summary;
        setPayrollBreakdown(s);
        setForm(f => ({
          ...f,
          workingDays: s.workingDays,
          paidDays:    s.paidDays,
        }));
        setWorkingDaysPeriod({ count: s.workingDays });
      })
      .catch(err => {
        console.error('Payroll summary error:', err);
        // Fallback: just set working days locally, leave paid days as-is
        setForm(f => ({ ...f, workingDays: localWorkingDays }));
        setWorkingDaysPeriod({ count: localWorkingDays });
      })
      .finally(() => setAttendanceLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffId, form.month, form.year]);


  const totals = useMemo(() => {
    const annualCTC = parseFloat(form.annualCTC) || 0;
    const workingDays = parseInt(form.workingDays) || 26;
    const paidDays = parseInt(form.paidDays) || workingDays;
    const prorationFactor = workingDays > 0 ? (paidDays / workingDays) : 1;

    if (form.employmentType === 'intern') {
      const baseMonthly = parseFloat(form.baseSalary) || 0;
      const lossOfPay = workingDays > 0 ? Math.round((baseMonthly / workingDays) * Math.max(0, workingDays - paidDays)) : 0;
      const netStipend = baseMonthly - lossOfPay;
      // For interns, set basic/hra/special to 0 and only use stipend field to avoid double counting in backend
      return { basic: 0, hra: 0, special: 0, gross: baseMonthly, pf: 0, esi: 0, pt: 0, lossOfPay: lossOfPay, deductions: lossOfPay, net: netStipend, baseStipend: baseMonthly }
    }

    const basicAnnual = annualCTC * 0.5;
    const hraAnnual = basicAnnual * 0.5;
    const employerPFAnnual = basicAnnual * 0.12;
    const gratuityAnnual = basicAnnual * 0.0481;
    const retiralsAnnual = employerPFAnnual + gratuityAnnual;
    const grossAnnual = annualCTC - retiralsAnnual;
    const specialAnnual = grossAnnual - (basicAnnual + hraAnnual);

    const standardBasic = Math.round(basicAnnual / 12);
    const standardHra = Math.round(hraAnnual / 12);
    const standardSpecial = Math.round(specialAnnual / 12);

    const basic = Math.round(standardBasic * prorationFactor);
    const hra = Math.round(standardHra * prorationFactor);
    const special = Math.round(standardSpecial * prorationFactor);
    const gross = basic + hra + special;

    const empPF = form.automationEnabled ? Math.round(basic * 0.12) : 0;
    const esi = form.automationEnabled ? (gross <= 21000 ? Math.ceil(gross * 0.0075) : 0) : 0;
    const pt = form.automationEnabled ? ((paidDays > 0 && gross >= 15000) ? 200 : (paidDays > 0 && gross >= 10000) ? 150 : 0) : 0;
    const tds = Math.round(parseFloat(form.tds) || 0);
    const loan = Math.round(parseFloat(form.loanDeduction) || 0);

    const deductions = empPF + esi + pt + tds + loan;
    const net = Math.round(gross - deductions);

    return { basic, hra, special, gross, pf: empPF, esi, pt, deductions, net, lossOfPay: 0 }
  }, [form.annualCTC, form.baseSalary, form.employmentType, form.workingDays, form.paidDays, form.tds, form.loanDeduction, form.automationEnabled]);

  useEffect(() => {
    setForm(f => ({
      ...f,
      basicSalary: totals.basic.toString(),
      hra: totals.hra.toString(),
      specialAllowance: totals.special.toString(),
      providentFund: totals.pf.toString(),
      esi: totals.esi.toString(),
      professionalTax: totals.pt.toString(),
      stipend: form.employmentType === 'intern' ? totals.gross.toString() : '0'
    }));
  }, [totals]);

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const employerPFAmt = form.automationEnabled
        ? Math.round(totals.basic * 0.12)
        : 0;

      const payload = {
        ...form,
        basicSalary: totals.basic,
        hra: totals.hra,
        specialAllowance: totals.special,
        providentFund: totals.pf,
        esi: totals.esi,
        professionalTax: totals.pt,
        employerPF: form.employmentType === 'regular' ? employerPFAmt : 0,
        stipend: form.employmentType === 'intern' ? totals.gross : 0,
        grossEarnings: totals.gross,
        totalDeductions: totals.deductions,
        netSalary: totals.net,
      };
      const res = await api.post('/payslips', payload)
      toast.success('Payslip generated successfully!')
      navigate(`/payslips/${res.data.data._id}`)
    } catch (err) {
      toast.error(err?.message || 'Failed to generate payslip. Check all required fields.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell className="page-shell--flush">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="split-screen split-screen--narrow"
    >
      {/* LEFT: FORM ENGINE */}
      <div
        className="split-screen__pane-form"
        style={{ padding: 'var(--page-padding-y) var(--page-padding-x)' }}
      >
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <header style={{ marginBottom: 'var(--space-8)' }}>
            <div className="badge badge-navy" style={{ marginBottom: 12 }}>Statutory v2.6</div>
            <h1 className="page-title" style={{ marginBottom: 12 }}>Payroll Engine</h1>
            <p className="page-subtitle">Generate localized Indian payslips with 2026 tax standards.</p>
          </header>

          <div className="stepper">
            <StepLabel num={1} label="Identity" active={step === 1} completed={step > 1} />
            <StepLabel num={2} label="Timeline" active={step === 2} completed={step > 2} />
            <StepLabel num={3} label="Payroll" active={step === 3} completed={step > 3} />
          </div>

          <form onSubmit={e => { e.preventDefault(); step < 3 ? setStep(s => s + 1) : handleSubmit() }}>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                  <div className="panel" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)', background: 'var(--bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: 15 }}>Statutory Automation</h4>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Auto-calculate PF, ESI, and PT based on earnings.</p>
                      </div>
                      <Toggle
                        checked={form.automationEnabled}
                        onChange={(v) => setForm({...form, automationEnabled: v})}
                        label=""
                      />
                    </div>
                  </div>

                  <label className="label" style={{ marginBottom: 12 }}>Employment Category</label>
                  <SegmentedControl
                    options={SEGMENTED_OPTIONS}
                    value={form.employmentType}
                    onChange={(v) => setForm({...form, employmentType: v})}
                    className="mb-6"
                    style={{ marginBottom: 'var(--space-6)' }}
                  />

                  <StaffSearchDropdown
                    staffList={staffList}
                    label="Auto-fill from Team Directory"
                    placeholder="Search by name or Employee ID…"
                    onSelect={async (s) => {
                      if (!s) return
                      // The list API strips bankDetails/financials for performance.
                      // Fetch the full record so bank account, PAN, etc. are available.
                      let full = s
                      try {
                        const res = await api.get(`/staff/${s._id}`)
                        full = res.data.data || s
                      } catch {
                        // Silently fall back to list data if detail fetch fails
                      }
                      const empType  = full.type === 'Employee' ? 'regular' : 'intern'
                      // PAN: top-level (employee self-service) → legacy financials
                      const pan      = full.panNumber || full.financials?.panNumber || ''
                      // Bank: new bankDetails → legacy financials
                      const bankAcc  = full.bankDetails?.accountNumber || full.financials?.accountNumber || ''
                      const bankNm   = full.bankDetails?.bankName      || full.financials?.bankName      || ''
                      setSelectedStaffId(full._id)
                      setForm(f => ({
                        ...f,
                        employmentType: empType,
                        employeeName:   full.fullName,
                        employeeId:     full.employeeId     || '',
                        employeeEmail:  full.email          || '',
                        designation:    full.designation    || '',
                        department:     full.department     || '',
                        dateOfJoining:  full.joiningDate ? full.joiningDate.split('T')[0] : '',
                        panNumber:      pan,
                        pfNumber:       full.pfNumber       || '',
                        bankAccount:    bankAcc,
                        bankName:       bankNm,
                        annualCTC:      full.type === 'Employee' ? (full.salaryDetails?.annualCTC  || '') : '',
                        baseSalary:     full.type === 'Intern'   ? (full.salaryDetails?.baseSalary || '') : '',
                      }))
                    }}
                  />

                  <InputField label="Employee Name" required value={form.employeeName} onChange={e => setForm({...form, employeeName: e.target.value})} placeholder="Full Name" icon={User} />
                  <div className="form-grid-2">
                    <InputField label="ID Code" required value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} placeholder="EMP-001" />
                    <InputField label="Designation" required value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} placeholder="Role" />
                  </div>
                  <InputField label="Department" required value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="e.g. Engineering" />
                  <InputField label="Employee Email" required type="email" value={form.employeeEmail} onChange={e => setForm({...form, employeeEmail: e.target.value})} placeholder="email@company.com" icon={Send} />
                  <div className="form-grid-2">
                    <InputField label="PAN Number" required value={form.panNumber} onChange={e => setForm({...form, panNumber: e.target.value})} placeholder="ABCDE1234F" />
                    <InputField label="PF Number" required={form.employmentType === 'regular'} value={form.pfNumber} onChange={e => setForm({...form, pfNumber: e.target.value})} placeholder="XX/XXX/0000000" />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                  <div className="form-grid-2">
                    <SelectField
                      label="Pay Month"
                      required
                      value={form.month}
                      onChange={(v) => setForm({...form, month: v})}
                      options={MONTHS.map(m => ({ value: m, label: m }))}
                    />
                    <SelectField
                      label="Year"
                      required
                      value={form.year}
                      onChange={(v) => setForm({...form, year: v})}
                      options={YEARS.map(y => ({ value: y, label: y }))}
                    />
                  </div>
                  <div className="form-grid-2">
                    <InputField label="Date of Joining" required type="date" value={form.dateOfJoining} onChange={e => setForm({...form, dateOfJoining: e.target.value})} icon={Calendar} />
                    <InputField label="Payout Date" required type="date" value={form.payDate} onChange={e => setForm({...form, payDate: e.target.value})} icon={Calendar} />
                  </div>
                  <div className="panel" style={{ padding: 'var(--space-5)' }}>
                    <div className="form-grid-2" style={{ marginBottom: 0 }}>
                      <InputField
                        label={`Working Days — ${form.month} ${form.year}`}
                        required
                        type="number"
                        min="0"
                        max="31"
                        value={form.workingDays}
                        onChange={e => setForm({...form, workingDays: Math.max(0, parseInt(e.target.value) || 0)})}
                      />
                      <InputField
                        label={attendanceLoading ? 'Paid Days (calculating…)' : selectedStaffId ? 'Paid Days (auto)' : 'Paid Days'}
                        required
                        type="number"
                        min="0"
                        max="31"
                        value={form.paidDays}
                        onChange={e => setForm({...form, paidDays: Math.min(form.workingDays, Math.max(0, parseInt(e.target.value) || 0))})}
                      />
                    </div>

                    {/* Payroll Breakdown Panel */}
                    {attendanceLoading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                        <Loader2 size={13} className="animate-spin" />
                        Calculating from attendance &amp; leave records…
                      </div>
                    )}

                    {!attendanceLoading && payrollBreakdown && (
                      <div style={{
                        marginTop: 14, padding: '12px 14px',
                        background: 'var(--bg)', borderRadius: 8,
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                          Payroll Breakdown — {form.month} {form.year}
                        </div>
                        {[
                          { label: 'Working Days',  value: payrollBreakdown.workingDays,  color: 'var(--text)',       bold: false },
                          { label: 'Present',       value: payrollBreakdown.presentDays,  color: '#16a34a',           bold: false },
                          { label: 'Paid Leave',    value: payrollBreakdown.paidLeaveDays,color: '#2563eb',           bold: false },
                          { label: 'LWP',           value: payrollBreakdown.lwpDays,      color: '#dc2626',           bold: false },
                          { label: 'Absent',        value: payrollBreakdown.absentDays,   color: '#b45309',           bold: false },
                        ].map(row => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{row.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0 2px', marginTop: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Final Paid Days</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-tint, #e5ebdd)', padding: '2px 10px', borderRadius: 6 }}>
                            {payrollBreakdown.paidDays}
                          </span>
                        </div>
                        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                          Auto-calculated from attendance + approved leaves. Edit the fields above to override.
                        </p>
                      </div>
                    )}

                    {!attendanceLoading && !payrollBreakdown && workingDaysPeriod && (
                      <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                        📅 {workingDaysPeriod.count} working days (Mon–Fri) in <strong>{form.month} {form.year}</strong>.
                        {!selectedStaffId && ' Select an employee to auto-calculate Paid Days.'}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}


              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                  {form.employmentType === 'intern' ? (
                     <InputField label="Monthly Stipend (Base Salary)" required type="number" min="0" value={form.baseSalary || ''} onChange={e => setForm({...form, baseSalary: Math.max(0, parseFloat(e.target.value) || 0)})} placeholder="Stipend in INR" icon={IndianRupee} />
                  ) : (
                     <InputField label="Annual Cost to Company (CTC)" required type="number" min="0" value={form.annualCTC} onChange={e => setForm({...form, annualCTC: Math.max(0, parseFloat(e.target.value) || 0)})} placeholder="Salary in INR" icon={IndianRupee} />
                  )}

                  {form.employmentType === 'regular' && (
                    <div className="panel" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                      <div className="form-grid-2">
                        <InputField label="TDS" required type="number" min="0" value={form.tds} onChange={e => setForm({...form, tds: Math.max(0, parseFloat(e.target.value) || 0)})} placeholder="0" />
                        <InputField label="Loan/Recovery" required type="number" min="0" value={form.loanDeduction} onChange={e => setForm({...form, loanDeduction: Math.max(0, parseFloat(e.target.value) || 0)})} placeholder="0" />
                      </div>
                      {!form.automationEnabled && (
                        <div className="form-grid-2" style={{ marginTop: 12 }}>
                          <InputField label="Custom PF" type="number" value={form.providentFund} onChange={e => setForm({...form, providentFund: e.target.value})} />
                          <InputField label="Custom ESI" type="number" value={form.esi} onChange={e => setForm({...form, esi: e.target.value})} />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="form-grid-2">
                    <InputField label="Bank Account (Masked)" required value={form.bankAccount} onChange={e => setForm({...form, bankAccount: e.target.value})} placeholder="Account No" icon={Landmark} />
                    <InputField label="Bank Name" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} placeholder="e.g. Union Bank of India" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', gap: 14, marginTop: 'var(--space-8)' }}>
              {step > 1 && (
                <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary" style={{ width: 110, height: 48 }}>Back</button>
              )}
              <button
                type="submit" disabled={submitting} className="btn-primary"
                style={{ flex: 1, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                {submitting ? <Loader2 size={20} className="animate-spin" /> : step === 3 ? 'Generate Professional Slip' : 'Next Stage'}
                {step < 3 && <ChevronRight size={20} />}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT: PROFESSIONAL PREVIEW */}
      <div
        className="split-screen__pane-preview"
        style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}
      >
        <div style={{ width: '100%', maxWidth: 500 }} className="fade-in">
          <div className="card" style={{ padding: 'clamp(24px, 5vw, 40px)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0, flex: 1 }}>
                {form.companyLogo && (
                  <img src={form.companyLogo} alt="Logo" style={{ height: 44, width: 44, borderRadius: 6, objectFit: 'contain', background: 'var(--bg)', padding: 4, flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.companyName || 'Corporate Entity'}</div>
                  <div className="badge badge-navy" style={{ marginTop: 4, display: 'inline-block' }}>Certified Payroll</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Period</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{form.month} {form.year}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, padding: 16, background: 'var(--bg)', borderRadius: 6 }}>
              <div className="avatar avatar--lg" style={{ background: 'var(--primary)' }}>
                {(form.employeeName || 'U')[0].toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{form.employeeName || 'Active User'}</div>
                <div className="text-muted" style={{ fontSize: 12, fontWeight: 500 }}>{form.designation || 'Position Unspecified'} · {form.department}</div>
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <PreviewRow label="Identity Code" value={form.employeeId || '—'} />
              {form.employmentType === 'intern' ? (
                <>
                  <PreviewRow label="Monthly Stipend (Base)" value={totals.baseStipend} />
                  {totals.lossOfPay > 0 && <PreviewRow label="Absent Deduction (Loss of Pay)" value={totals.lossOfPay} isDeduction />}
                </>
              ) : (
                <>
                  <PreviewRow label="Basic Component" value={totals.basic} />
                  <PreviewRow label="HRA Component" value={totals.hra} />
                  <PreviewRow label="Other Allowances" value={totals.special} />
                  <PreviewRow label="Statutory PF" value={totals.pf} isDeduction />
                  <PreviewRow label="TDS/Tax" value={totals.deductions - totals.pf} isDeduction />
                </>
              )}
              <PreviewRow label="Gross Earnings" value={totals.gross} type="bold" />
              <PreviewRow label="Total Deductions" value={totals.deductions} isDeduction type="bold" />
            </div>

            <div style={{
              background: 'var(--primary)', color: 'white', padding: 24,
              borderRadius: 6, textAlign: 'center'
            }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                {form.employmentType === 'intern' ? 'Net Stipend Payable' : 'Net Salary Payable'}
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AnimatedNumber value={totals.net} decimals={0} />
              </div>
            </div>

            <div className="text-muted" style={{ marginTop: 24, padding: 12, background: 'var(--bg)', borderRadius: 12, fontSize: 11, fontWeight: 500, textAlign: 'center' }}>
              System generated professional artifact (ISO-Standard)
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    </PageShell>
  )
}
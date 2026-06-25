const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employmentType: {
      type: String,
      enum: ['regular', 'intern'],
      default: 'regular',
    },
    annualCTC: { type: Number, default: 0, min: 0 },
    employerPF: { type: Number, default: 0, min: 0 },
    stipend: { type: Number, default: 0, min: 0 },
    // ── Company Info ─────────────────────────────────
    companyName: { type: String, required: true, trim: true },
    companyAddress: { type: String, trim: true, default: '' },
    companyLogo: { type: String }, // Base64 or URL
    companyEmail: { type: String, trim: true, default: '' },
    companyPhone: { type: String, trim: true, default: '' },
    companyWebsite: { type: String, trim: true, default: '' },
    companyCIN: { type: String, trim: true, default: '' },
    companyGST: { type: String, trim: true, default: '' },

    // ── Employee Info ─────────────────────────────────
    employeeName: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, trim: true, index: true },
    designation: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    employeeEmail: { type: String, required: true, trim: true, lowercase: true },
    dateOfJoining: { type: String, default: '' },
    bankAccount: { type: String, trim: true, default: '' },
    bankName: { type: String, trim: true, default: '' },
    panNumber: { type: String, trim: true, default: '' },
    pfNumber: { type: String, trim: true, default: '' },

    // ── Pay Period ────────────────────────────────────
    month: { type: String, required: true },
    year: { type: Number, required: true },
    payDate: { type: String, required: true },
    workingDays: { type: Number, default: 26, min: 0 },
    paidDays: { type: Number, default: 26, min: 0 },

    // ── Earnings (₹) ─────────────────────────────────
    basicSalary: { type: Number, default: 0, min: 0 },
    hra: { type: Number, default: 0, min: 0 },
    conveyanceAllowance: { type: Number, default: 0, min: 0 },
    medicalAllowance: { type: Number, default: 0, min: 0 },
    specialAllowance: { type: Number, default: 0, min: 0 },
    otherEarnings: { type: Number, default: 0, min: 0 },
    otherEarningsLabel: { type: String, default: 'Other Earnings' },

    // ── Deductions (₹) ───────────────────────────────
    providentFund: { type: Number, default: 0, min: 0 },
    esi: { type: Number, default: 0, min: 0 },
    tds: { type: Number, default: 0, min: 0 },
    professionalTax: { type: Number, default: 0, min: 0 },
    loanDeduction: { type: Number, default: 0, min: 0 },
    otherDeductions: { type: Number, default: 0, min: 0 },
    otherDeductionsLabel: { type: String, default: 'Other Deductions' },

    // ── Computed Totals ───────────────────────────────
    grossEarnings: { type: Number, min: 0 },
    totalDeductions: { type: Number, min: 0 },
    netSalary: { type: Number, min: 0 },

    // ── Meta ─────────────────────────────────────────
    notes: { type: String, default: '' },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    isPushedToPortal: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Auto-compute totals before saving
payslipSchema.pre('save', function (next) {
  if (this.employmentType === 'intern') {
    // For interns: gross = stipend only (basicSalary, hra, special are 0)
    this.grossEarnings = (this.stipend || 0) + (this.otherEarnings || 0);
  } else {
    // For regular employees: gross = salary components (stipend is 0)
    this.grossEarnings =
      (this.basicSalary || 0) +
      (this.hra || 0) +
      (this.conveyanceAllowance || 0) +
      (this.medicalAllowance || 0) +
      (this.specialAllowance || 0) +
      (this.otherEarnings || 0) +
      (this.employerPF || 0);
  }

  this.totalDeductions =
    (this.providentFund || 0) +
    (this.esi || 0) +
    (this.tds || 0) +
    (this.professionalTax || 0) +
    (this.loanDeduction || 0) +
    (this.otherDeductions || 0);

  this.netSalary = this.grossEarnings - this.totalDeductions;
  next();
});

// Instance helper: formatted month-year string
payslipSchema.methods.getPeriodLabel = function () {
  return `${this.month} ${this.year}`;
};

// Indexes for the hottest payslip queries:
//  • { user, createdAt: -1 } — list-page default sort
//  • { user, month, year } — month/year filter on list and bulk-email
//  • { user, employeeId, year, month } — "is this employee paid this month?" (idempotency check)
//  • { employeeId, isPushedToPortal } — staff portal payslip feed
payslipSchema.index({ user: 1, createdAt: -1 });
payslipSchema.index({ user: 1, month: 1, year: 1 });
payslipSchema.index({ user: 1, employeeId: 1, year: 1, month: 1 });
payslipSchema.index({ employeeId: 1, isPushedToPortal: 1 });

module.exports = mongoose.model('Payslip', payslipSchema);

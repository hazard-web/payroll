# Product Requirements Document (PRD): PaySlip Pro Enterprise Edition

**Version:** 3.0  
**Status:** Live-Production / Scaled HRMS  
**Primary Deployment:** Vercel (Serverless Stack)  
**Database:** MongoDB Atlas  

---

## 1. Executive Summary & Product Overview

**PaySlip Pro Enterprise Edition** has evolved from a simple salary slip generator into a comprehensive, lightweight **Human Resource Management System (HRMS)** and **Employee Self-Service (ESS) Portal**. Custom-tailored for SMBs (Small-to-Medium Businesses) like BDA Technologies, this application simplifies the entire employee lifecycle—from onboarding and secure credential generation to attendance tracking, leave applications, task management, company-wide announcements, and compliant Indian payroll generation.

### Core Objectives:
1. **Administrative Efficiency:** Provide HR/Admin with an analytical dashboard to run payroll, track attendance, manage leave policies, assign tasks, and monitor system activities.
2. **Employee Empowerment:** Enable a fully-featured self-service portal where employees can punch in/out, view tasks, request leaves, download verified payslips, update bank details, and upload regulatory KYC documents.
3. **Regulatory & Statutory Compliance:** Automate salary computations (Basic, HRA, HRA adjustments, PF, ESI, Professional Tax, and Stipends) using up-to-date Indian taxation standards.
4. **Resiliency & Performance:** Build a lightweight architecture capable of running within Vercel's serverless time-limits, featuring database index safeguards and SMTP email verifications.

---

## 2. System Architecture & Workflow

```mermaid
graph TD
    subgraph Client Layer (React + Vite)
        Admin[Company Admin UI]
        Employee[Employee ESS Portal UI]
    end

    subgraph API Gateway / Server Layer (Express + Node.js)
        Server[Express App]
        Auth[Auth Middleware]
        RawDB[Raw DB In-Memory Matcher Helper]
        PDFEngine[PDFKit Engine]
        MailEngine[Nodemailer SMTP Service]
    end

    subgraph Storage Layer (MongoDB Atlas)
        M_User[(Users Collection - Admins)]
        M_Staff[(Staffs Collection - Employees)]
        M_Payslips[(Payslips Collection)]
        M_Attendance[(Attendance Collection)]
        M_Leaves[(Leaves & Policies)]
        M_Tasks[(Tasks & Activities)]
    end

    Admin -->|Manage Staff & Payroll| Server
    Employee -->|Self-Service & Punch-in| Server
    Server --> Auth
    Auth -->|Database Index Hang Safeguard| RawDB
    RawDB --> M_Staff
    RawDB --> M_User
    Server -->|Generate PDF| PDFEngine
    Server -->|Send Emails| MailEngine
    PDFEngine --> M_Payslips
    Server --> M_Attendance
    Server --> M_Leaves
    Server --> M_Tasks
```

---

## 3. Product Modules (A to Z)

### Module A: Company Admin Portal (HR & Operations)

#### A.1 Admin Authentication & Profile Management
- **Company Registration & Login:** Email/password setup with a custom Gmail SMTP-driven email verification pipeline.
- **Company Profile Setup:** Stores company name, legal address, phone, CIN (Corporate Identification Number), and base64-encoded company logo (up to 10MB payload support).
- **Auto-population:** Profile metadata and logo are automatically injected into the generated payslip PDFs.

#### A.2 Staff & Onboarding Management
- **Onboarding Wizard:** Admin inputs name, email, phone, designation, department, joining date, employment type (Employee vs. Intern), salary details (Annual CTC or Stipend), and overtime eligibility.
- **Portal Activation Control:** A toggle (`isPortalEnabled`) generates a secure token sent to the employee’s email, allowing them to activate their account and set up their own portal password.
- **Workday Overrides:** Admins can define custom working-day configurations (e.g., Mon-Fri vs. Mon-Sat) for individual staff members, overriding company defaults.

#### A.3 Interactive Payslip Generator & Calculations
- **Guided 3-Step Form:**
  1. *Employee Identity & Registry:* Dynamic selection of onboarding records.
  2. *Timeline details:* Month, year, actual working days, paid days (for pro-rated deductions).
  3. *Financial Details:* Annual CTC input dynamically computes all components; customizable fields for TDS, loan recoveries, and overtime.
- **Auto-Calculations (2026 Indian Statutory Standards):**
  - *Basic Salary:* 50% of monthly CTC.
  - *House Rent Allowance (HRA):* 40% of Basic.
  - *Special Allowance:* Net balance to match gross salary.
  - *Employer PF:* 12% of Basic (annualized and subtracted from CTC).
  - *Employee PF:* 12% of Basic (deducted monthly).
  - *ESI:* 0.75% of Gross (applicable if monthly Gross $\le$ ₹21,000).
  - *Professional Tax (PT):* Fixed ₹200/month (if monthly Gross $\ge$ ₹15,000).
  - *Pro-ration:* Formula: $\text{Paid Salary} = \frac{\text{Paid Days}}{\text{Working Days}} \times \text{Gross Component}$.
  - *Intern Mode:* Simplifies layout by rendering a fixed monthly stipend without complex breakdowns.

#### A.4 Leave Management & Settings
- **Leave Policy Controller:** Define standard annual quotas for Leave Types (Casual Leave, Sick Leave, Paid Leave).
- **Approvals Dashboard:** Real-time stream of incoming leave applications. Admins can approve or reject with custom comments, which updates the employee's remaining leave balance.

#### A.5 Task Assignment System
- **Delegation Board:** Create tasks, assign them to single or multiple staff, set due dates, write detailed descriptions, and assign priorities (Low, Medium, High).
- **Review Pipeline:** View uploaded employee deliverables and approve task completion or request revisions.

#### A.6 Announcements Broadcast Engine
- **Global Notices:** Publish company-wide announcements.
- **Urgency Matrix:** Categorize notices (Urgent, Important, Normal) to dictate order and color styling on the Employee Dashboard.
- **Scheduling:** Define start/end dates for automatic publishing and expiration of notices.

#### A.7 Support Desk & Ticketing
- **Issue Tracker:** Centralized view of tickets raised by employees (hardware issues, payroll queries, portal bugs).
- **Ticket Lifecycle:** Categorize, update status (Pending, In Progress, Resolved), and log admin feedback.

#### A.8 System Audit Logs
- **Activity Monitoring:** Searchable history recording administrative operations (e.g., "Payslip generated for VG", "Leave request approved for RK") to ensure accountability.

---

### Module B: Employee Self-Service (ESS) Portal

#### B.1 First-Time Login & Security Flow
- **Invitation Link Setup:** Secure, token-based link sent via SMTP. First-time login prompts password setup (enforces: $\ge$ 8 chars, uppercase, lowercase, number, special character).
- **Account Lockouts:** Auto-locks for 15 minutes after 5 consecutive failed login attempts.

#### B.2 Self-Service Profile & Document Upload (KYC)
- **Profile Completion Wizard:** Wizard to collect missing fields required for statutory checks:
  - Personal Details (DOB, Gender, Address).
  - Emergency Contact (Name, Relationship, Phone).
  - Bank details (Account Holder, Bank Name, Account Number, IFSC Code, Branch).
- **KYC Document Vault:** Direct base64 upload (maximum 3MB/file, support for PDF, JPEG, PNG, WEBP) of:
  1. *Profile Image*
  2. *Aadhar Card*
  3. *PAN Card*
- **Verification:** Verification of PAN structure using regex matching (`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`).

#### B.3 Digital Attendance Manager
- **Punch Cards:** Real-time Check-In and Check-Out.
- **Status Metrics:** Daily active timers displaying total logged hours, late check-in tags, and weekly attendance visual charts.
- **Geo-Notes:** Option to record custom comments (e.g., "Working from client site") upon clocking in.

#### B.4 Leave Application Portal
- **Balance Indicator:** Interactive cards displaying remaining Sick Leaves (SL) and Casual Leaves (CL).
- **Application Form:** Date ranges, reason description, leave category, and instant submit.
- **Request Tracking:** History with colored status tags (Pending, Approved, Rejected).

#### B.5 Tasks & Deliverables Panel
- **My Tasks Board:** Grouped by status (Pending, In Progress, Completed).
- **Deliverable Submission:** Text area for submission links or notes to mark tasks as "Completed" for Admin review.

#### B.6 Payslip History
- **Portal Access:** Employees can view and download payslips that the admin explicitly pushes to the portal (`isPushedToPortal: true`) for the last 3 months.

#### B.7 Support Desk
- **Create Tickets:** Employees can submit tickets specifying category, urgency, and description.

---

## 4. Database Schema Design (Data Models)

### 4.1 User Schema (Admins)
```javascript
{
  companyName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: String,
  address: String,
  cin: String,
  companyLogo: String, // Base64 Data URI
  isVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  defaultWorkDays: { type: [Number], default: [1, 2, 3, 4, 5] } // Mon-Fri
}
```

### 4.2 Staff Schema (Employees)
```javascript
{
  user: { type: ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  employeeId: { type: String, index: true, sparse: true },
  email: { type: String, required: true, index: true },
  phone: String,
  panNumber: { type: String, match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/ },
  dob: Date,
  gender: { type: String, enum: ['Male', 'Female', 'Other', ''] },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  emergencyContact: { name: String, relationship: String, phone: String },
  designation: String,
  department: String,
  pfNumber: String,
  joiningDate: Date,
  type: { type: String, enum: ['Employee', 'Intern'], default: 'Employee' },
  overtimeEligible: { type: Boolean, default: false },
  financials: { panNumber: String, bankName: String, accountNumber: String, ifscCode: String }, // Legacy PDF support
  bankDetails: { accountHolderName: String, bankName: String, accountNumber: String, ifscCode: String, branch: String },
  documents: {
    aadharCard: { fileName: String, originalName: String, url: String, uploadedAt: Date },
    panCard: { fileName: String, originalName: String, url: String, uploadedAt: Date },
    profileImage: { fileName: String, originalName: String, url: String, uploadedAt: Date }
  },
  salaryDetails: { annualCTC: Number, baseSalary: Number },
  leaveBalance: { casual: { type: Number, default: 0 }, sick: { type: Number, default: 0 } },
  internLeaveQuota: { type: Number, default: 1 },
  workingDays: [Number], // Individual override
  clientAssignment: String,
  portalPassword: { type: String },
  isPortalEnabled: { type: Boolean, default: false },
  mustChangePassword: { type: Boolean, default: true },
  profileCompleted: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date
}
```

### 4.3 Payslip Schema
```javascript
{
  user: { type: ObjectId, ref: 'User', required: true },
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  email: { type: String, required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  designation: String,
  department: String,
  panNumber: String,
  pfNumber: String,
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  workingDays: Number,
  paidDays: Number,
  joiningDate: Date,
  type: { type: String, default: 'Employee' },
  earnings: {
    basic: Number,
    hra: Number,
    specialAllowance: Number,
    overtime: Number,
    otherEarnings: Number
  },
  deductions: {
    employeePF: Number,
    esi: Number,
    professionalTax: Number,
    tds: Number,
    loanRecovery: Number,
    otherDeductions: Number
  },
  netSalary: { type: Number, required: true },
  grossSalary: { type: Number, required: true },
  employerPF: Number,
  annualCTC: Number,
  emailSent: { type: Boolean, default: false },
  emailSentAt: Date,
  isPushedToPortal: { type: Boolean, default: false },
  pushedToPortalAt: Date
}
```

### 4.4 Attendance Schema
```javascript
{
  staff: { type: ObjectId, ref: 'Staff', required: true },
  date: { type: Date, required: true }, // Normalized to UTC start of day
  sessions: [{
    startTime: { type: Date, required: true },
    endTime: Date,
    isActive: { type: Boolean, default: true },
    source: { type: String, enum: ['MANUAL', 'AUTO_PUNCH_OUT'] },
    reason: String
  }],
  totalLoggedHours: { type: Number, default: 0 },
  status: { type: String, enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE'], default: 'PRESENT' },
  lastAutoPunchOutAt: Date,
  lastAutoPunchOutReason: String,
  notes: String
}
```

---

## 5. Critical Engineering Edge Cases & Solutions

### 5.1 MongoDB Atlas M0 Email Index Hang
* **The Problem:** Queries utilizing email filters on M0 tier clusters occasionally encounter an index hang issue, leading to request timeouts.
* **The Solution:** Implemented a raw database helper bypass. The login route queries the `mongoose.connection.db` collection directly without filters, loading records into memory and completing the lookup using standard JavaScript array matching:
  ```javascript
  const all = await db.collection('staffs').find({}).toArray();
  const staff = all.find(s => s.email.toLowerCase() === normalizedEmail);
  ```

### 5.2 Auto-Punch Out Cron Jobs
* **The Problem:** Staff members occasionally forget to check out at the end of their shifts.
* **The Solution:** Dual automated safety routines are integrated:
  1. *Daily cron check (7:30 PM IST):* Scans open sessions, closes them with an end-of-day timestamp, and issues automated alerts.
  2. *In-memory login sweep:* When a staff member logs in, the backend evaluates if an active session remains open from the previous calendar day. If found, it executes a retro-active auto-punch out at `23:59:59` to maintain timecard accuracy.

### 5.3 PDF Generation Font Resiliency
* **The Problem:** Font loading errors on serverless hosting platforms due to environment configuration differences.
* **The Solution:** Custom font handler utilizing `PDFKit` that targets `Inter-Regular.ttf` with a fallback chain to system standard `Helvetica` to guarantee PDF generation remains operational under any hosting conditions.

---

## 6. Future Candidates (v4.0 Roadmap)

1. **Bulk Upload CSV Parser:** Allow HR to upload a structured CSV to import staff details or attendance records in a single action.
2. **WhatsApp Notification API Integration:** Deliver interactive alerts, task assignments, and payslip PDFs directly to employees via WhatsApp Business API.
3. **Advanced Biometric API Sync:** Sync digital attendance with physical hardware clocking machines using biometric webhooks.
4. **Geo-Fencing Clock-in Restrictions:** Restrict check-in actions to specific latitude and longitude boundaries using mobile GPS coordination.

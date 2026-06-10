# Product Requirements Document (PRD): PaySlip Pro

**Version:** 2.0  
**Last Updated:** April 2026  
**Status:** Production-Live  
**Deployment:** [Vercel](https://payslip-gen-rouge.vercel.app)

---

## 1. Product Overview

**PaySlip Pro** is a production-grade, full-stack web application built for **BDA Technologies** and similar SMBs to streamline the generation, management, and distribution of professional Indian salary slips. The system handles the complete payroll lifecycle — from authenticated access and CTC-based auto-calculation to branded PDF generation and one-click employee email delivery.

---

## 2. Target Audience

| Audience | Use Case |
|----------|----------|
| **HR Managers & Administrators** | Generate and distribute monthly payslips with statutory compliance |
| **Small to Medium Businesses (SMBs)** | Manage payroll without enterprise HR software |
| **Finance Teams** | Maintain a searchable, auditable history of all issued salary slips |

---

## 3. Current Feature Set (v2.0)

### 3.1 Authentication & Company Profiles
- JWT-based registration and login with **email verification** via Gmail SMTP.
- Company profile stores: name, address, email, phone, CIN, and logo (Base64).
- Company details **auto-populate** into every new payslip generated.

### 3.2 Payslip Generation (3-Step Guided Form)
- **Step 1 — Identity:** Employee name, ID code, designation, department, email, PAN Number, PF Number.
- **Step 2 — Timeline:** Pay month/year, Date of Joining, Payout Date, Working Days, Paid Days.
- **Step 3 — Payroll:** Annual CTC (auto-computes all salary components), TDS, Loan/Recovery.
- **Employment Types:** Supports both *Regular Employee* (CTC-based breakdown) and *Intern* (stipend-based).
- **Real-time Preview Panel:** Live salary breakdown with animated figures as the user types.

### 3.3 Indian Payroll Auto-Calculation (2026 Statutory Standards)
All calculations are derived from the Annual CTC with pro-ration support:

| Component | Formula |
|-----------|---------|
| Basic Salary | 50% of Annual CTC |
| HRA | 40% of Basic |
| Special Allowance | Gross − (Basic + HRA) |
| Employer PF | 12% of Basic (annual, subtracted from CTC) |
| Employee PF | 12% of Basic monthly |
| ESI | 0.75% of Gross (if ≤ ₹21,000) |
| Professional Tax | ₹200/month (if Gross ≥ ₹15,000) |
| Pro-ration | `(Paid Days / Working Days) × salary component` |

### 3.4 PDF Generation
- Server-side A4 PDF rendered via **PDFKit**.
- **BDA Technologies Three-Tone Brand Palette:**
  - Primary: `#58833b` (Forest Green) — header, table headers, net salary band, footer
  - Secondary: `#e5ebdd` (Soft Sage) — employee info panel, alternate table rows, totals row
  - Tertiary: `#ffffff` (White) — alternating table rows, page background
- Layout includes: Company header with logo, Employee details grid, Working days summary, Earnings & Deductions table, Net Salary band with amount-in-words, Signature lines, Footer.
- **Hardened font system:** Attempts to load Inter TTF; gracefully falls back to Helvetica if unavailable (serverless-resilient).

### 3.5 Email Delivery
- One-click email sends the payslip PDF as an attachment to the employee.
- Sender address customizable per company via `EMAIL_FROM` environment variable.
- Uses explicit **Gmail SMTP** (`smtp.gmail.com:465`, SSL) — not the unreliable `service:'gmail'` shortcut.
- The system performs a **connection verification** before dispatching, returning a clear, actionable error message if SMTP authentication fails.
- Email template uses BDA brand colours (`#58833b`, `#e5ebdd`) with table-based layout for universal email client compatibility.

### 3.6 Payslip Management
- Full **CRUD**: Create, Read, Update, Delete payslips.
- **Searchable list** with filters by month, year, and employee name/ID/department.
- **Pagination** (10 per page).
- **Duplicate** any existing payslip to pre-fill a new one.
- Email sent status tracked with timestamp; displayed with a badge in the UI.

### 3.7 Dashboard Analytics
- **Total Payslips Generated** (all time)
- **This Month's Count**
- **Emails Sent**
- **Total Payroll Disbursed** (sum of all net salaries)
- **Average Net Salary**

---

## 4. Technical Architecture

### 4.1 Frontend
| Concern | Technology |
|---------|-----------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Animations | Framer Motion |
| HTTP Client | Axios (with JWT interceptor) |
| Notifications | React Hot Toast |
| Icons | Lucide React |
| State | React Context (AuthContext) |

### 4.2 Backend & API
| Concern | Technology |
|---------|-----------|
| Server | Node.js + Express |
| Database | MongoDB via Mongoose |
| Authentication | JSON Web Tokens (JWT, 7-day expiry) |
| PDF Generation | PDFKit |
| Email Transport | Nodemailer (explicit SMTP/SSL) |
| Password Security | bcryptjs (salted hashing) |

### 4.3 API Routes

**Auth (`/api/auth`)**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register company account |
| POST | `/login` | Login, returns JWT |
| GET | `/verify-email?token=` | Verify email address |
| GET | `/profile` | Get company profile |
| PUT | `/profile` | Update profile & logo |

**Payslips (`/api/payslips`)**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create new payslip |
| GET | `/` | List payslips (with search/filter/pagination) |
| GET | `/stats/summary` | Dashboard statistics |
| GET | `/:id` | Get single payslip |
| PUT | `/:id` | Update payslip (whitelist-sanitized) |
| DELETE | `/:id` | Delete payslip |
| GET | `/:id/download` | Download PDF |
| POST | `/:id/email` | Email PDF to employee |

### 4.4 Deployment
- **Platform:** Vercel (Serverless)
- **Entry Point:** `/api/index.js` → Express app
- **Frontend:** Static build from `/dist` served via Vercel CDN
- **Environment Variables:** `MONGODB_URI`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`

---

## 5. Security

| Concern | Implementation |
|---------|---------------|
| Authentication | JWT on every protected route via `auth` middleware |
| Data Isolation | All DB queries scoped to `user._id` — users cannot access others' data |
| Field Sanitization | PUT route uses an explicit field whitelist; prevents `user` field reassignment |
| Password Storage | bcrypt with salt rounds (never stored in plain text) |
| Credential Safety | Gmail App Passwords required; credentials trimmed of whitespace before use |
| Payload Limit | 10MB JSON limit to support Base64 company logos |
| Email Verification | Token-based, 24-hour expiry; account blocked until verified |

---

## 6. Known Limitations

- **No bulk generation:** Payslips are generated one at a time.
- **Single company per account:** One login = one company profile.
- **Gmail only:** Email transport is hardcoded to Gmail SMTP. Other providers require a config change.
- **No employee portal:** Employees receive payslips via email only; no self-service login.

---

## 7. Future Roadmap (v3 Candidates)

| Feature | Priority | Notes |
|---------|----------|-------|
| **Bulk CSV Generation** | High | Upload a CSV, generate 100+ payslips at once |
| **Employee Portal** | High | Separate employee login to view/download own payslips |
| **Multi-company Support** | Medium | One user manages multiple company profiles |
| **Custom Salary Templates** | Medium | Allow HR to define custom earning/deduction heads |
| **Offer Letter Generation** | Low | Extend PDF engine to generate offer letters |
| **WhatsApp Delivery** | Low | Send payslip via WhatsApp Business API |
| **Audit Logs** | Medium | Track who generated/sent which payslip and when |

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStaffPortal } from '../../context/StaffPortalContext'
import { Save, Loader2, AlertCircle, CheckCircle2, Upload, FileText } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import PageShell from '../../components/PageShell'
import { motion } from 'framer-motion'

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

const emptyForm = {
  phone: '',
  panNumber: '',
  dob: '',
  gender: '',
  address: { street: '', city: '', state: '', pincode: '', country: 'India' },
  emergencyContact: { name: '', relationship: '', phone: '' },
  bankDetails: {
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: ''
  }
}

function Section({ title, subtitle, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 24 }}>
      <h3 style={{ margin: 0, marginBottom: 6, color: 'var(--primary)', fontSize: 18 }}>{title}</h3>
      {subtitle && <p style={{ margin: 0, marginBottom: 20, color: 'var(--text-muted)', fontSize: 13 }}>{subtitle}</p>}
      {children}
    </div>
  )
}

function Field({ label, required, children, hint, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}{required && <span style={{ color: 'var(--primary)' }}> *</span>}
      </label>
      {children}
      {hint && !error && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{hint}</div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6, fontWeight: 600 }}>{error}</div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '12px 14px', background: 'var(--bg)',
  border: '2px solid var(--border)', borderRadius: 10, outline: 'none', fontSize: 14,
  color: 'var(--text)', transition: 'all 0.2s', fontWeight: 600
}

const DOCUMENT_CONFIG = [
  { type: 'profileImage', label: 'Profile Photo', hint: 'JPEG, PNG or WEBP · Max 3MB', accept: 'image/jpeg,image/png,image/webp', required: true },
  { type: 'aadharCard', label: 'Aadhar Card', hint: 'Image or PDF · Max 3MB', accept: 'image/jpeg,image/png,image/webp,application/pdf', required: true },
  { type: 'panCard', label: 'PAN Card', hint: 'Image or PDF · Max 3MB', accept: 'image/jpeg,image/png,image/webp,application/pdf', required: true },
]

function DocumentUpload({ type, label, hint, accept, required, document, onUpload, uploading, error }) {
  const isPdf = document?.url?.startsWith('data:application/pdf')
  const isImage = document?.url?.startsWith('data:image')

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      toast.error('File size must be under 3MB')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      onUpload(type, reader.result, file.name)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div style={{
      border: `2px dashed ${error ? '#dc2626' : 'var(--border)'}`,
      borderRadius: 12, padding: 20,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 12
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {label}{required && <span style={{ color: 'var(--primary)' }}> *</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>
        </div>
        {document?.uploadedAt && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 100,
            background: 'rgba(99, 107, 47, 0.1)', color: '#636B2F'
          }}>Uploaded</span>
        )}
      </div>

      {document?.url && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isImage ? (
            <img
              src={document.url}
              alt={label}
              style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
            />
          ) : isPdf ? (
            <div style={{
              width: 72, height: 72, borderRadius: 10, border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)'
            }}>
              <FileText size={28} color="var(--primary)" />
            </div>
          ) : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {document.originalName || 'Document'}
            </div>
            {document.uploadedAt && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {new Date(document.uploadedAt).toLocaleDateString('en-IN')}
              </div>
            )}
          </div>
        </div>
      )}

      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        fontSize: 13, fontWeight: 700, color: 'var(--primary)', cursor: uploading ? 'not-allowed' : 'pointer',
        alignSelf: 'flex-start', opacity: uploading ? 0.6 : 1
      }}>
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {document?.url ? 'Replace File' : 'Upload File'}
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
      {error && (
        <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{error}</div>
      )}
    </div>
  )
}

export default function PortalProfile() {
  const { staffUser, refresh } = useStaffPortal()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [documents, setDocuments] = useState({})
  const [uploadingDoc, setUploadingDoc] = useState(null)

  // Track which staffUser the form was last initialized from.
  // When the underlying user changes (e.g. login switch, or a real profile
  // save that mutated fields), we reinitialize. When `staffUser` updates
  // for a reason that shouldn't clobber the user's unsaved typing — most
  // importantly, a document upload via refresh() — we MUST NOT reinitialize
  // the form, because the server snapshot doesn't have the user's in-flight
  // edits and overwriting would lose them.
  const lastInitUserIdRef = useRef(null)
  useEffect(() => {
    if (!staffUser) return
    const userId = staffUser.id || staffUser._id
    // First load, or the actual logged-in user changed → full reinitialize.
    if (lastInitUserIdRef.current !== userId) {
      setForm({
        phone: staffUser.phone || '',
        panNumber: staffUser.panNumber || '',
        dob: staffUser.dob ? String(staffUser.dob).split('T')[0] : '',
        gender: staffUser.gender || '',
        address: {
          street: staffUser.address?.street || '',
          city: staffUser.address?.city || '',
          state: staffUser.address?.state || '',
          pincode: staffUser.address?.pincode || '',
          country: staffUser.address?.country || 'India'
        },
        emergencyContact: {
          name: staffUser.emergencyContact?.name || '',
          relationship: staffUser.emergencyContact?.relationship || '',
          phone: staffUser.emergencyContact?.phone || ''
        },
        bankDetails: {
          accountHolderName: staffUser.bankDetails?.accountHolderName || '',
          bankName: staffUser.bankDetails?.bankName || '',
          accountNumber: staffUser.bankDetails?.accountNumber || '',
          ifscCode: staffUser.bankDetails?.ifscCode || '',
          branch: staffUser.bankDetails?.branch || ''
        }
      })
      setDocuments(staffUser.documents || {})
      lastInitUserIdRef.current = userId
      return
    }
    // Same user, but a background refresh (e.g. document upload, profile
    // save with no field changes): update ONLY the documents section.
    // The form fields stay as the user typed them — that's the source of
    // truth for unsaved edits. After the next save, the server snapshot
    // will match what the user sees and the page will be in sync.
    if (staffUser.documents) {
      setDocuments(staffUser.documents)
    }
  }, [staffUser])

  const handleDocumentUpload = async (type, data, originalName) => {
    setUploadingDoc(type)
    try {
      // Snapshot the current form so we can restore it if the API response
      // doesn't include the user's in-flight (unsaved) field values.
      const formSnapshot = form
      const res = await api.post(`/portal/me/documents/${type}`, { data, originalName })
      const label = DOCUMENT_CONFIG.find((d) => d.type === type)?.label || 'Document'

      // Optimistic: update the local documents state immediately so the UI
      // shows the just-uploaded file with the "Uploaded" badge right away,
      // without waiting for the server round-trip.
      if (res.data?.document) {
        setDocuments((prev) => ({ ...prev, [type]: res.data.document }))
      }

      // Refresh staff state from the server so profileCompleted is current.
      const refreshed = await refresh()

      // CRITICAL: re-apply the form snapshot after refresh() updates context.
      // refresh() replaces `staffUser` with the server snapshot; the
      // useEffect that depends on `staffUser` will then run and (per the
      // guard above) update only `documents`, but in case the snapshot
      // contains different form fields (e.g. a typo fix landed in DB),
      // we re-apply the user's in-flight edits on top.
      setForm(formSnapshot)

      if (errors[`documents.${type}`]) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next[`documents.${type}`]
          return next
        })
      }

      if (refreshed?.profileCompleted && !staffUser?.profileCompleted) {
        toast.success(`${label} uploaded. Profile is now complete! Redirecting…`)
        setTimeout(() => navigate('/portal/dashboard'), 600)
      } else {
        toast.success(`${label} uploaded successfully`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed')
    } finally {
      setUploadingDoc(null)
    }
  }

  const updateField = (path, value) => {
    setForm((prev) => {
      const next = { ...prev }
      const keys = path.split('.')
      let cursor = next
      for (let i = 0; i < keys.length - 1; i++) {
        cursor[keys[i]] = { ...(cursor[keys[i]] || {}) }
        cursor = cursor[keys[i]]
      }
      cursor[keys[keys.length - 1]] = value
      return next
    })
    if (errors[path]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[path]
        return next
      })
    }
  }

  // Format validation runs on every save (always blocking). This catches
  // malformed inputs (e.g. bad PAN, non-10-digit phone) without forcing
  // the user to re-fill every field when they just want to update one.
  const validateFormat = () => {
    const e = {}
    if (form.phone && form.phone.replace(/\D/g, '').length !== 10) {
      e['phone'] = 'Enter a valid 10-digit phone number'
    }
    if (form.panNumber && !PAN_REGEX.test(form.panNumber.toUpperCase())) {
      e['panNumber'] = 'Invalid PAN format. Expected: ABCDE1234F'
    }
    if (form.emergencyContact.phone &&
        form.emergencyContact.phone.replace(/\D/g, '').length !== 10) {
      e['emergencyContact.phone'] = 'Enter a valid 10-digit phone number'
    }
    return e
  }

  // Required-field validation only blocks the FIRST-TIME profile completion.
  // After profileCompleted is true, the user is just editing — never block
  // a partial save with a "this field is required" error.
  const validateRequired = () => {
    const e = {}
    if (!form.phone || form.phone.replace(/\D/g, '').length !== 10) {
      e['phone'] = 'Enter a valid 10-digit phone number'
    }
    if (!form.panNumber) {
      e['panNumber'] = 'PAN Number is required'
    } else if (!PAN_REGEX.test(form.panNumber.toUpperCase())) {
      e['panNumber'] = 'Invalid PAN format. Expected: ABCDE1234F'
    }
    if (!form.dob) e['dob'] = 'Date of birth is required'
    if (!form.gender) e['gender'] = 'Please select a gender'
    if (!form.address.street) e['address.street'] = 'Street is required'
    if (!form.address.city) e['address.city'] = 'City is required'
    if (!form.address.state) e['address.state'] = 'State is required'
    if (!form.address.pincode) e['address.pincode'] = 'Pincode is required'
    if (!form.emergencyContact.name) e['emergencyContact.name'] = 'Name is required'
    if (!form.emergencyContact.phone || form.emergencyContact.phone.replace(/\D/g, '').length !== 10) {
      e['emergencyContact.phone'] = 'Enter a valid 10-digit phone number'
    }
    if (!form.bankDetails.accountHolderName) e['bankDetails.accountHolderName'] = 'Required'
    if (!form.bankDetails.bankName) e['bankDetails.bankName'] = 'Required'
    if (!form.bankDetails.accountNumber) e['bankDetails.accountNumber'] = 'Required'
    if (!form.bankDetails.ifscCode) e['bankDetails.ifscCode'] = 'Required'
    DOCUMENT_CONFIG.forEach((doc) => {
      if (doc.required && !documents[doc.type]?.url) {
        e[`documents.${doc.type}`] = `${doc.label} is required`
      }
    })
    return e
  }

  const handleSave = async (e) => {
    e.preventDefault()

    // Always run format validation (block save on bad format).
    const formatErrors = validateFormat()
    // Only run required-field validation if the profile is not yet complete.
    const requiredErrors = staffUser?.profileCompleted ? {} : validateRequired()
    const v = { ...formatErrors, ...requiredErrors }
    setErrors(v)
    if (Object.keys(v).length > 0) {
      toast.error('Please fix the highlighted fields')
      return
    }

    setSaving(true)
    try {
      const payload = {
        phone: form.phone.replace(/\D/g, ''),
        panNumber: form.panNumber.toUpperCase().trim(),
        dob: form.dob,
        gender: form.gender,
        address: { ...form.address, pincode: form.address.pincode.trim() },
        emergencyContact: { ...form.emergencyContact, phone: form.emergencyContact.phone.replace(/\D/g, '') },
        bankDetails: { ...form.bankDetails, ifscCode: form.bankDetails.ifscCode.toUpperCase().trim() }
      }
      await api.put('/portal/me', payload)

      // Single source of truth: re-fetch the full staff from the server
      // and let the useEffect re-initialize the form from that.
      const refreshed = await refresh()

      if (refreshed?.profileCompleted && !staffUser?.profileCompleted) {
        // First-time completion: navigate to dashboard so the user doesn't
        // get stuck on the profile page after the "Profile completed!" toast.
        toast.success('Profile completed! Redirecting…')
        setTimeout(() => navigate('/portal/dashboard'), 600)
      } else {
        toast.success('Profile updated successfully.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const completed = staffUser?.profileCompleted
  const allDocumentsUploaded = DOCUMENT_CONFIG.every(
    (doc) => !doc.required || documents[doc.type]?.url
  )
  const requiredComplete = Boolean(
    form.phone && form.panNumber && form.dob && form.gender &&
    form.address.street && form.address.city && form.address.state && form.address.pincode &&
    form.emergencyContact.name && form.emergencyContact.phone &&
    form.bankDetails.accountHolderName && form.bankDetails.bankName &&
    form.bankDetails.accountNumber && form.bankDetails.ifscCode &&
    allDocumentsUploaded
  )

  return (
    <PageShell>
      <header className="page-header">
        <div className="page-header__main">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>My Profile</h1>
            {completed ? (
              <span style={{
                padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                background: 'rgba(99, 107, 47, 0.1)', color: '#636B2F',
                border: '1px solid rgba(99, 107, 47, 0.2)', display: 'inline-flex', alignItems: 'center', gap: 6
              }}>
                <CheckCircle2 size={14} /> Profile Complete
              </span>
            ) : (
              <span style={{
                padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                background: 'rgba(234, 88, 12, 0.1)', color: '#c2410c',
                border: '1px solid rgba(234, 88, 12, 0.2)', display: 'inline-flex', alignItems: 'center', gap: 6
              }}>
                <AlertCircle size={14} /> Profile Incomplete
              </span>
            )}
          </div>
          <p className="page-subtitle">
            {completed
              ? 'Your profile is up to date. You can still update your contact details below.'
              : 'Please complete all sections below including mandatory documents. Fields marked with * are required.'}
          </p>
        </div>
      </header>

      <form onSubmit={handleSave}>
        <Section title="Contact Information" subtitle="Your email is set by your administrator and cannot be changed here.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Field label="Email" required>
              <input type="email" disabled value={staffUser?.email || ''} style={{ ...inputStyle, background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
            </Field>
            <Field label="Phone Number" required error={errors.phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                style={inputStyle}
                maxLength={10}
              />
            </Field>
          </div>
        </Section>

        <Section title="Identity" subtitle="PAN is mandatory for payroll / TDS purposes.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <Field label="PAN Number" required hint="Format: ABCDE1234F" error={errors.panNumber}>
              <input
                type="text"
                value={form.panNumber}
                onChange={(e) => updateField('panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                placeholder="ABCDE1234F"
                style={inputStyle}
                maxLength={10}
                pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
              />
            </Field>
            <Field label="Date of Birth" required error={errors.dob}>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => updateField('dob', e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Gender" required error={errors.gender}>
              <select
                value={form.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                style={inputStyle}
              >
                <option value="">Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Address" subtitle="Your current residential address.">
          <Field label="Street / House No." required error={errors['address.street']}>
            <input
              type="text"
              value={form.address.street}
              onChange={(e) => updateField('address.street', e.target.value)}
              placeholder="123, Main Street, Apt 4B"
              style={inputStyle}
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <Field label="City" required error={errors['address.city']}>
              <input
                type="text"
                value={form.address.city}
                onChange={(e) => updateField('address.city', e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="State" required error={errors['address.state']}>
              <input
                type="text"
                value={form.address.state}
                onChange={(e) => updateField('address.state', e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Pincode" required error={errors['address.pincode']}>
              <input
                type="text"
                value={form.address.pincode}
                onChange={(e) => updateField('address.pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={inputStyle}
                maxLength={6}
                inputMode="numeric"
              />
            </Field>
          </div>
        </Section>

        <Section title="Emergency Contact" subtitle="Person to reach in case of emergency.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <Field label="Full Name" required error={errors['emergencyContact.name']}>
              <input
                type="text"
                value={form.emergencyContact.name}
                onChange={(e) => updateField('emergencyContact.name', e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Relationship">
              <input
                type="text"
                value={form.emergencyContact.relationship}
                onChange={(e) => updateField('emergencyContact.relationship', e.target.value)}
                placeholder="Spouse, Parent, Sibling…"
                style={inputStyle}
              />
            </Field>
            <Field label="Phone" required error={errors['emergencyContact.phone']}>
              <input
                type="tel"
                value={form.emergencyContact.phone}
                onChange={(e) => updateField('emergencyContact.phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                style={inputStyle}
                maxLength={10}
                inputMode="numeric"
              />
            </Field>
          </div>
        </Section>

        <Section title="Identity Documents" subtitle="All documents are mandatory. Upload your profile photo, Aadhar and PAN card. These will be visible to your administrator.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {DOCUMENT_CONFIG.map((doc) => (
              <DocumentUpload
                key={doc.type}
                type={doc.type}
                label={doc.label}
                hint={doc.hint}
                accept={doc.accept}
                required={doc.required}
                document={documents[doc.type]}
                onUpload={handleDocumentUpload}
                uploading={uploadingDoc === doc.type}
                error={errors[`documents.${doc.type}`]}
              />
            ))}
          </div>
        </Section>

        <Section title="Bank Details" subtitle="Used for salary disbursement.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Field label="Account Holder Name" required error={errors['bankDetails.accountHolderName']}>
              <input
                type="text"
                value={form.bankDetails.accountHolderName}
                onChange={(e) => updateField('bankDetails.accountHolderName', e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Bank Name" required error={errors['bankDetails.bankName']}>
              <input
                type="text"
                value={form.bankDetails.bankName}
                onChange={(e) => updateField('bankDetails.bankName', e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Account Number" required error={errors['bankDetails.accountNumber']}>
              <input
                type="text"
                value={form.bankDetails.accountNumber}
                onChange={(e) => updateField('bankDetails.accountNumber', e.target.value.replace(/\D/g, ''))}
                style={inputStyle}
                inputMode="numeric"
              />
            </Field>
            <Field label="IFSC Code" required error={errors['bankDetails.ifscCode']}>
              <input
                type="text"
                value={form.bankDetails.ifscCode}
                onChange={(e) => updateField('bankDetails.ifscCode', e.target.value.toUpperCase().slice(0, 11))}
                style={inputStyle}
                maxLength={11}
              />
            </Field>
            <Field label="Branch (optional)">
              <input
                type="text"
                value={form.bankDetails.branch}
                onChange={(e) => updateField('bankDetails.branch', e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>
        </Section>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, background: requiredComplete ? 'rgba(99, 107, 47, 0.06)' : 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {requiredComplete
              ? 'All required fields and documents are filled. Saving will mark your profile as complete.'
              : 'Some required fields or documents are still missing.'}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit" disabled={saving}
            style={{
              padding: '12px 28px', background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Profile
          </motion.button>
        </div>
      </form>
    </PageShell>
  )
}

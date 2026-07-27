import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStaffPortal } from '../../context/StaffPortalContext'
import {
  Save, Loader2, AlertCircle, CheckCircle2, Upload, FileText,
  Mail, Phone, CreditCard, Calendar, User, MapPin, Landmark, ShieldCheck, Hash,
  FileDigit, Briefcase, Shield, Edit, Download, Plus
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import PageShell, { PageHeader } from '../../components/PageShell'
import { InputField, SelectField } from '../../components/UI'
import { motion } from 'framer-motion'

const PAN_REGEX = /^[A-Z0-9]{5,15}$/i

const emptyForm = {
  employeeId: '',
  joiningDate: '',
  department: '',
  designation: '',
  type: 'Employee',
  workLocation: 'Office',
  email: '',
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
  },
  salaryDetails: {
    annualCtc: '',
    baseSalary: ''
  }
}

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' }
]

function Section({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="section-card" style={{ marginBottom: 28 }}>
      <div className="section-card__header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        {Icon && <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', background: 'var(--bg)', padding: 8, borderRadius: 8 }}><Icon size={18} /></div>}
        <div>
          <h3 className="section-card__title" style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          {subtitle && <p className="section-card__subtitle" style={{ margin: '4px 0 0', fontSize: 12 }}>{subtitle}</p>}
        </div>
      </div>
      <div className="section-card__body" style={{ padding: 0 }}>
        {children}
      </div>
    </div>
  )
}

const initials = (name) => {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function DocumentCardRowView({ label, document, onUploadClick }) {
  const isUploaded = Boolean(document?.url);
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '16px',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: 120
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: isUploaded ? 'rgba(88, 131, 59, 0.08)' : 'var(--bg)',
            color: isUploaded ? 'var(--primary)' : 'var(--text-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {label === 'Profile Picture' ? <User size={18} /> : <FileText size={18} />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {isUploaded ? (
                <>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'rgba(88, 131, 59, 0.08)', padding: '2px 6px', borderRadius: 4 }}>
                    Verified ✓
                  </span>
                  {document.uploadedAt && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      on {new Date(document.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>
                  Not uploaded
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isUploaded && (
        <button type="button" onClick={onUploadClick} className="btn-secondary" style={{ width: '100%', height: 32, borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
          <Plus size={12} /> Upload Document
        </button>
      )}
      
      {isUploaded && (
        <a 
          href={document.url} 
          download={document.originalName || label}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ width: '100%', height: 32, borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', color: 'var(--text)', border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <Download size={12} /> Download / View
        </a>
      )}
    </div>
  );
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
      border: `1.5px dashed ${error ? '#ef4444' : 'var(--border)'}`,
      borderRadius: 14,
      padding: 20,
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      transition: 'all 0.2s ease',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            {label}{required && <span style={{ color: 'var(--primary)' }}> *</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>
        </div>
        {document?.url && (
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 100,
            background: 'rgba(88,131,59, 0.08)', color: '#58833b', border: '1px solid rgba(88,131,59, 0.15)'
          }}>VERIFIED ✓</span>
        )}
      </div>

      {document?.url ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          background: 'var(--bg)',
          borderRadius: 10,
          border: '1px solid var(--border)'
        }}>
          {isImage ? (
            <img
              src={document.url}
              alt={label}
              style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
            />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: 6, border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--primary)'
            }}>
              <FileText size={24} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {document.originalName || 'Document'}
            </div>
            {document.uploadedAt && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {new Date(document.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          height: 80,
          border: '1px dashed var(--border)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          background: 'var(--bg)',
          color: 'var(--text-light)',
          fontSize: 11,
          fontWeight: 500
        }}>
          <Upload size={18} style={{ marginBottom: 4, opacity: 0.5 }} />
          Not uploaded yet
        </div>
      )}

      <label style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
        fontSize: 12, fontWeight: 700, color: 'var(--primary)', cursor: uploading ? 'not-allowed' : 'pointer',
        opacity: uploading ? 0.6 : 1, transition: 'all 0.15s ease', width: '100%', boxSizing: 'border-box'
      }} className="btn-hover">
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {document?.url ? 'Replace Document' : 'Upload Document'}
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
  
  const [isEditing, setIsEditing] = useState(false)
  const isEditingInitialized = useRef(false)
  const hasInitializedForm = useRef(false)

  useEffect(() => {
    if (!staffUser) return
    
    // Set isEditing view initial state depending on profileCompletion
    if (!isEditingInitialized.current) {
      setIsEditing(!staffUser.profileCompleted)
      isEditingInitialized.current = true
    }

    if (!hasInitializedForm.current || !isEditing) {
      setForm({
        employeeId: staffUser.employeeId || '',
        joiningDate: staffUser.joiningDate ? String(staffUser.joiningDate).split('T')[0] : '',
        department: staffUser.department || '',
        designation: staffUser.designation || '',
        type: staffUser.type || 'Employee',
        workLocation: staffUser.workLocation || 'Office',
        email: staffUser.email || '',
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
        },
        salaryDetails: {
          annualCtc: staffUser.salaryDetails?.annualCTC || staffUser.salaryDetails?.annualCtc || '',
          baseSalary: staffUser.salaryDetails?.baseSalary || ''
        }
      })
      hasInitializedForm.current = true
    }
    setDocuments(staffUser.documents || {})
  }, [staffUser, isEditing])

  const handleDocumentUpload = async (type, data, originalName) => {
    setUploadingDoc(type)
    try {
      const formSnapshot = form
      const res = await api.post(`/portal/me/documents/${type}`, { data, originalName })
      const label = DOCUMENT_CONFIG.find((d) => d.type === type)?.label || 'Document'

      if (res.data?.document) {
        setDocuments((prev) => ({ ...prev, [type]: res.data.document }))
      }

      const refreshed = await refresh()
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

  const validateFormat = () => {
    const e = {}
    const phoneLen = (form.phone || '').replace(/\D/g, '').length
    if (form.phone && (phoneLen < 8 || phoneLen > 12)) {
      e['phone'] = 'Enter a valid phone number (8-12 digits)'
    }
    if (form.panNumber && !PAN_REGEX.test(form.panNumber.toUpperCase())) {
      e['panNumber'] = 'Invalid PAN format. Expected: ABCDE1234F'
    }
    const emergencyPhoneLen = (form.emergencyContact.phone || '').replace(/\D/g, '').length
    if (form.emergencyContact.phone && (emergencyPhoneLen < 8 || emergencyPhoneLen > 12)) {
      e['emergencyContact.phone'] = 'Enter a valid phone number (8-12 digits)'
    }
    return e
  }

  const validateRequired = () => {
    const e = {}
    const phoneLen = (form.phone || '').replace(/\D/g, '').length
    if (!form.phone || phoneLen < 8 || phoneLen > 12) {
      e['phone'] = 'Enter a valid phone number (8-12 digits)'
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
    const emergencyPhoneLen = (form.emergencyContact.phone || '').replace(/\D/g, '').length
    if (!form.emergencyContact.phone || emergencyPhoneLen < 8 || emergencyPhoneLen > 12) {
      e['emergencyContact.phone'] = 'Enter a valid phone number (8-12 digits)'
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

    const formatErrors = validateFormat()
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
        employeeId: form.employeeId,
        joiningDate: form.joiningDate,
        department: form.department,
        designation: form.designation,
        type: form.type,
        workLocation: form.workLocation,
        email: form.email,
        phone: form.phone.replace(/\D/g, ''),
        panNumber: form.panNumber.toUpperCase().trim(),
        dob: form.dob,
        gender: form.gender,
        address: { ...form.address, pincode: form.address.pincode.trim() },
        emergencyContact: { ...form.emergencyContact, phone: form.emergencyContact.phone.replace(/\D/g, '') },
        bankDetails: { ...form.bankDetails, ifscCode: form.bankDetails.ifscCode.toUpperCase().trim() },
        salaryDetails: { 
          annualCTC: Number(form.salaryDetails?.annualCtc || staffUser.salaryDetails?.annualCTC || 0),
          baseSalary: Number(form.salaryDetails?.baseSalary || staffUser.salaryDetails?.baseSalary || 0)
        }
      }
      await api.put('/portal/me', payload)

      const refreshed = await refresh()

      if (refreshed?.profileCompleted && !staffUser?.profileCompleted) {
        toast.success('Profile completed! Redirecting…')
        setTimeout(() => navigate('/portal/dashboard'), 600)
      } else {
        toast.success('Profile updated successfully.')
        setIsEditing(false)
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

  const isIntern = staffUser?.type === 'Intern'

  if (!staffUser) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Loader2 size={40} className="animate-spin text-muted" /></div>
  }

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      <style>{`
        .detail-panel-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .panel-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 800;
          color: var(--primary);
        }
        .panel-card-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .info-kv-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 1px dashed var(--border);
        }
        .info-kv-row:last-child {
          border-bottom: none;
        }
        .info-kv-key {
          font-size: 11px;
          color: var(--text-light);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .info-kv-val {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          text-align: right;
        }
      `}</style>

      {!isEditing ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* ── Top Header Card ── */}
          <div style={{ 
            background: 'var(--surface)', 
            borderRadius: 16, 
            border: '1px solid var(--border)', 
            padding: '24px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: 20,
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{
                width: 72, 
                height: 72, 
                borderRadius: 14, 
                background: 'var(--primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white', 
                fontSize: 24, 
                fontWeight: 800,
                flexShrink: 0
              }}>
                {documents?.profileImage?.url ? (
                  <img src={documents.profileImage.url} alt={staffUser.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} />
                ) : (
                  initials(staffUser.fullName)
                )}
              </div>
              <div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <h1 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{staffUser.fullName}</h1>
                  {completed ? (
                    <span style={{ 
                      padding: '3px 10px', 
                      borderRadius: 100, 
                      fontSize: 10, 
                      fontWeight: 700, 
                      background: 'rgba(88, 131, 59, 0.08)', 
                      color: 'var(--primary)', 
                      border: '1px solid rgba(88, 131, 59, 0.2)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                      Verified Profile
                    </span>
                  ) : (
                    <span style={{ 
                      padding: '3px 10px', 
                      borderRadius: 100, 
                      fontSize: 10, 
                      fontWeight: 700, 
                      background: 'rgba(239, 68, 68, 0.08)', 
                      color: '#ef4444', 
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                      Incomplete Profile
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${staffUser.type === 'Employee' ? 'badge-navy' : 'badge-emerald'}`} style={{ fontSize: 10, padding: '2px 8px', textTransform: 'uppercase' }}>
                    {staffUser.type || 'Employee'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {staffUser.designation || 'No Designation'} - {staffUser.department || 'General'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button 
                onClick={() => setIsEditing(true)} 
                className="btn-secondary"
                style={{ 
                  height: 38,
                  padding: '0 16px',
                  borderRadius: 8, 
                  border: '1px solid var(--border)', 
                  background: 'var(--surface)', 
                  color: 'var(--text)', 
                  fontWeight: 700, 
                  fontSize: 12,
                  cursor: 'pointer', 
                  display: 'flex', 
                  gap: 8, 
                  alignItems: 'center' 
                }}
              >
                <Edit size={14} /> Edit Profile
              </button>
            </div>
          </div>

          {/* ── Horizontal Stats Grid Card ── */}
          <div style={{
            background: 'var(--surface)',
            borderRadius: 16,
            border: '1px solid var(--border)',
            padding: '20px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(88, 131, 59, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileDigit size={16} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee ID</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{staffUser.employeeId || '—'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(88, 131, 59, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={16} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date of Joining</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                  {staffUser.joiningDate ? new Date(staffUser.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(88, 131, 59, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Landmark size={16} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{staffUser.department || '—'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(88, 131, 59, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={16} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Designation</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{staffUser.designation || '—'}</div>
              </div>
            </div>
          </div>

          {/* ── Three Column Details Panel Row ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
            marginBottom: 20
          }}>
            {/* Panel 1: Employment & Role */}
            <div className="detail-panel-card">
              <div className="panel-card-header">
                <User size={16} style={{ color: 'var(--primary)' }} />
                <span>Employment & Role</span>
              </div>
              <div className="panel-card-body">
                <div className="info-kv-row">
                  <span className="info-kv-key">Employee ID / Code</span>
                  <span className="info-kv-val">{staffUser.employeeId || '—'}</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-key">Date of Joining</span>
                  <span className="info-kv-val">{staffUser.joiningDate ? new Date(staffUser.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-key">Department</span>
                  <span className="info-kv-val">{staffUser.department || '—'}</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-key">Designation</span>
                  <span className="info-kv-val">{staffUser.designation || '—'}</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-key">Employment Type</span>
                  <span className="info-kv-val">{staffUser.type || 'Employee'}</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-key">Work Location</span>
                  <span className="info-kv-val">{staffUser.workLocation || 'Office'}</span>
                </div>
              </div>
            </div>

            {/* Panel 2: Contact & Personal */}
            <div className="detail-panel-card">
              <div className="panel-card-header">
                <Mail size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ color: 'var(--primary)' }}>Contact & Personal</span>
              </div>
              <div className="panel-card-body">
                <div className="info-kv-row">
                  <span className="info-kv-key">Email Address</span>
                  <span className="info-kv-val">{staffUser.email || '—'}</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-key">Phone Number</span>
                  <span className="info-kv-val">{staffUser.phone || '—'}</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-key">Date of Birth</span>
                  <span className="info-kv-val">{staffUser.dob ? new Date(staffUser.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-key">Gender</span>
                  <span className="info-kv-val">{staffUser.gender || '—'}</span>
                </div>
                <div className="info-kv-row" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                  <span className="info-kv-key">Registered Address</span>
                  <span className="info-kv-val" style={{ textAlign: 'left', lineHeight: 1.4 }}>
                    {staffUser.address && (staffUser.address.street || staffUser.address.city)
                      ? `${staffUser.address.street || ''}${staffUser.address.street ? ', ' : ''}${staffUser.address.city || ''}${staffUser.address.state ? `, ${staffUser.address.state}` : ''}${staffUser.address.pincode ? ` - ${staffUser.address.pincode}` : ''}`
                      : '—'}
                  </span>
                </div>
                <div className="info-kv-row" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                  <span className="info-kv-key">Emergency Contact</span>
                  <span className="info-kv-val" style={{ textAlign: 'left', lineHeight: 1.4 }}>
                    {staffUser.emergencyContact?.name
                      ? `${staffUser.emergencyContact.name} (${staffUser.emergencyContact.relationship || 'Emergency'}) · ${staffUser.emergencyContact.phone || ''}`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Panel 3: Compensation & Financial */}
            <div className="detail-panel-card">
              <div className="panel-card-header">
                <Landmark size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ color: 'var(--primary)' }}>Compensation & Financial</span>
              </div>
              <div className="panel-card-body">
                <div className="info-kv-row">
                  <span className="info-kv-key">PAN Card Number</span>
                  <span className="info-kv-val">{staffUser.panNumber || '—'}</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-key">Bank Name</span>
                  <span className="info-kv-val">{staffUser.bankDetails?.bankName || '—'}</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-key">Account Number</span>
                  <span className="info-kv-val">{staffUser.bankDetails?.accountNumber || '—'}</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-key">IFSC Code</span>
                  <span className="info-kv-val">{staffUser.bankDetails?.ifscCode || '—'}</span>
                </div>
                
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    {isIntern ? 'Monthly Stipend Structure' : 'Annual CTC Structure'}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.01em' }}>
                    ₹ {isIntern 
                      ? (staffUser.salaryDetails?.baseSalary?.toLocaleString('en-IN') || 0) 
                      : (staffUser.salaryDetails?.annualCTC?.toLocaleString('en-IN') || 0)}
                  </div>
                  
                  <div style={{ 
                    padding: '10px 12px', 
                    background: 'rgba(88, 131, 59, 0.04)', 
                    borderRadius: 8, 
                    border: '1px solid rgba(88, 131, 59, 0.12)', 
                    fontSize: 11, 
                    color: 'var(--text-muted)', 
                    lineHeight: 1.4, 
                    marginTop: 10 
                  }}>
                    {isIntern
                      ? 'Intern payslips will be generated based on this monthly stipend amount. Absence deductions are applied automatically in the generator.'
                      : 'Employee payslips (Basic, HRA, PF, PT, etc.) are automatically derived from this Annual CTC figure during generation.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Identity Document Registry ── */}
          <div style={{
            background: 'var(--surface)',
            borderRadius: 16,
            border: '1px solid var(--border)',
            padding: '24px',
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} color="var(--primary)" />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Identity Document Registry</h3>
              </div>
              <button onClick={() => setIsEditing(true)} className="btn-secondary" style={{ height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)', padding: '0 12px' }}>
                <Plus size={14} /> Upload New Document
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px 0' }}>Official verification document attachments uploaded by you.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              <DocumentCardRowView label="Profile Picture" document={documents?.profileImage} onUploadClick={() => setIsEditing(true)} />
              <DocumentCardRowView label="Aadhar Card" document={documents?.aadharCard} onUploadClick={() => setIsEditing(true)} />
              <DocumentCardRowView label="PAN Card" document={documents?.panCard} onUploadClick={() => setIsEditing(true)} />
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <PageHeader
            title="Edit Profile"
            subtitle={completed
              ? 'Your profile is verified and active. You can keep your contact details updated below.'
              : 'Please complete all required sections below to activate your employee portal access.'}
            actions={
              completed ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                  background: 'rgba(88,131,59, 0.08)', color: '#58833b', borderRadius: 99,
                  fontSize: 12, fontWeight: 700, border: '1px solid rgba(88,131,59, 0.15)'
                }}>
                  <CheckCircle2 size={14} /> Profile Verified
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                  background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', borderRadius: 99,
                  fontSize: 12, fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.15)'
                }}>
                  <AlertCircle size={14} /> Profile Incomplete
                </div>
              )
            }
          />

          <form onSubmit={handleSave} style={{ marginTop: 24 }}>
            <Section title="Employment & Role" subtitle="Official employment status, code, and department details." icon={Briefcase}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                <InputField
                  label="Employee ID / Code"
                  value={form.employeeId}
                  onChange={(e) => updateField('employeeId', e.target.value)}
                  icon={FileDigit}
                  disabled
                />
                <InputField
                  label="Date of Joining"
                  value={form.joiningDate}
                  onChange={(e) => updateField('joiningDate', e.target.value)}
                  type="date"
                  icon={Calendar}
                  disabled
                />
                <InputField
                  label="Department"
                  value={form.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  icon={Landmark}
                  disabled
                />
                <InputField
                  label="Designation"
                  value={form.designation}
                  onChange={(e) => updateField('designation', e.target.value)}
                  icon={Briefcase}
                  disabled
                />
                <SelectField
                  label="Employment Type"
                  value={form.type}
                  onChange={(v) => updateField('type', v)}
                  options={[
                    { value: 'Employee', label: 'Employee' },
                    { value: 'Intern', label: 'Intern' }
                  ]}
                  disabled
                />
                <SelectField
                  label="Work Location"
                  value={form.workLocation}
                  onChange={(v) => updateField('workLocation', v)}
                  options={[
                    { value: 'Office', label: 'Office' },
                    { value: 'Remote', label: 'Remote' },
                    { value: 'Client Site', label: 'Client Site' }
                  ]}
                />
              </div>
            </Section>

            <Section title="Contact Information" subtitle="Your primary details and contact telephone number." icon={Mail}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                <InputField
                  label="Email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                  icon={Mail}
                />
                <InputField
                  label="Official Phone Number"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  required
                  icon={Phone}
                  maxLength={12}
                />
              </div>
            </Section>

            <Section title="Identity Details" subtitle="Statutory tax and identity information used for salary disbursement and TDS filing." icon={CreditCard}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                <InputField
                  label="PAN Number"
                  value={form.panNumber}
                  onChange={(e) => updateField('panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                  placeholder="ABCDE1234F"
                  required
                  error={errors.panNumber}
                  hint="Format: ABCDE1234F"
                  icon={CreditCard}
                  maxLength={10}
                />
                <InputField
                  label="Date of Birth"
                  value={form.dob}
                  onChange={(e) => updateField('dob', e.target.value)}
                  type="date"
                  required
                  error={errors.dob}
                  icon={Calendar}
                />
                <SelectField
                  label="Gender"
                  value={form.gender}
                  onChange={(v) => updateField('gender', v)}
                  options={GENDER_OPTIONS}
                  required
                  placeholder="Select Gender..."
                  error={errors.gender}
                />
              </div>
            </Section>

            <Section title="Residential Address" subtitle="Your current residential address for official communication and billing." icon={MapPin}>
              <InputField
                label="Street / House No."
                value={form.address.street}
                onChange={(e) => updateField('address.street', e.target.value)}
                placeholder="e.g. 123, Main Street, Apartment 4B"
                required
                error={errors['address.street']}
                icon={MapPin}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
                <InputField
                  label="City"
                  value={form.address.city}
                  onChange={(e) => updateField('address.city', e.target.value)}
                  required
                  error={errors['address.city']}
                />
                <InputField
                  label="State"
                  value={form.address.state}
                  onChange={(e) => updateField('address.state', e.target.value)}
                  required
                  error={errors['address.state']}
                />
                <InputField
                  label="Pincode"
                  value={form.address.pincode}
                  onChange={(e) => updateField('address.pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  error={errors['address.pincode']}
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
            </Section>

            <Section title="Emergency Contact" subtitle="Person to reach out to in case of work or personal emergencies." icon={User}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                <InputField
                  label="Contact Full Name"
                  value={form.emergencyContact.name}
                  onChange={(e) => updateField('emergencyContact.name', e.target.value)}
                  required
                  error={errors['emergencyContact.name']}
                  icon={User}
                />
                <InputField
                  label="Relationship"
                  value={form.emergencyContact.relationship}
                  onChange={(e) => updateField('emergencyContact.relationship', e.target.value)}
                  placeholder="e.g. Spouse, Parent, Sibling"
                  icon={User}
                />
                <InputField
                  label="Emergency Phone"
                  value={form.emergencyContact.phone}
                  onChange={(e) => updateField('emergencyContact.phone', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  required
                  error={errors['emergencyContact.phone']}
                  icon={Phone}
                  maxLength={12}
                  inputMode="numeric"
                />
              </div>
            </Section>

            <Section title="Identity Documents" subtitle="Please upload high-resolution images or PDF documents. All documents are mandatory and verified by HR." icon={FileText}>
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

            <Section title="Bank Details" subtitle="Provide your official bank account details where your monthly salary will be disbursed." icon={Landmark}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                <InputField
                  label="Account Holder Name"
                  value={form.bankDetails.accountHolderName}
                  onChange={(e) => updateField('bankDetails.accountHolderName', e.target.value)}
                  required
                  error={errors['bankDetails.accountHolderName']}
                  icon={User}
                />
                <InputField
                  label="Bank Name"
                  value={form.bankDetails.bankName}
                  onChange={(e) => updateField('bankDetails.bankName', e.target.value)}
                  required
                  error={errors['bankDetails.bankName']}
                  icon={Landmark}
                />
                <InputField
                  label="Account Number"
                  value={form.bankDetails.accountNumber}
                  onChange={(e) => updateField('bankDetails.accountNumber', e.target.value.replace(/\D/g, ''))}
                  required
                  error={errors['bankDetails.accountNumber']}
                  icon={CreditCard}
                  inputMode="numeric"
                />
                <InputField
                  label="IFSC Code"
                  value={form.bankDetails.ifscCode}
                  onChange={(e) => updateField('bankDetails.ifscCode', e.target.value.toUpperCase().slice(0, 11))}
                  required
                  error={errors['bankDetails.ifscCode']}
                  icon={Hash}
                  maxLength={11}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginTop: 20 }}>
                <InputField
                  label="Branch Name (Optional)"
                  value={form.bankDetails.branch}
                  onChange={(e) => updateField('bankDetails.branch', e.target.value)}
                  icon={MapPin}
                />
                <InputField
                  label={isIntern ? "Monthly Stipend Structure (₹)" : "Annual CTC Structure (₹)"}
                  value={isIntern ? form.salaryDetails?.baseSalary : form.salaryDetails?.annualCtc}
                  type="number"
                  icon={CreditCard}
                  disabled
                />
              </div>
            </Section>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 32px',
              background: requiredComplete ? 'rgba(88,131,59, 0.05)' : 'var(--bg)',
              borderRadius: 16,
              border: '1px solid var(--border)',
              marginBottom: 48,
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                {requiredComplete
                  ? '🎉 All required fields and documents are complete. Click Save to finalize.'
                  : '⚠️ Please fill out all required fields and upload all documents before saving.'}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {completed && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{
                      padding: '12px 24px',
                      background: 'var(--surface)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '12px 32px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Profile Changes
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      )}
    </PageShell>
  )
}

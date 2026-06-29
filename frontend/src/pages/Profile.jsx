import { useState, useEffect } from 'react'
import { Building2, MapPin, Mail, Phone, Hash, Globe, Loader2, Save, Image as ImageIcon, Camera, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import PageShell, { PageHeader } from '../components/PageShell'

const BDA_LOGO_BASE64 = `data:image/png;base64,iVBORw0KGgoAAAANSSuQmCC`;

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    companyCIN: '',
    companyGST: '',
    companyWebsite: '',
    companyLogo: ''
  })

  useEffect(() => {
    if (user) {
      setForm({
        companyName:    user.companyName    || '',
        companyAddress: user.companyAddress || '',
        companyEmail:   user.companyEmail   || '',
        companyPhone:   user.companyPhone   || '',
        companyCIN:     user.companyCIN     || '',
        companyGST:     user.companyGST     || '',
        companyWebsite: user.companyWebsite || '',
        companyLogo:    user.companyLogo    || ''
      })
    }
  }, [user])

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return toast.error('File size must be under 2MB')
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm({ ...form, companyLogo: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.put('/auth/profile', form)
      updateProfile(res.data.user)
      toast.success('Professional identity updated')
    } catch (err) {
      toast.error('Failed to update workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell narrow>
      <PageHeader
        title="Company Profile"
        subtitle="Manage your statutory company branding and workspace configurations in a unified, professional screen."
        actions={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: 'var(--primary-tint, #e5ebdd)',
            color: 'var(--primary, #58833b)',
            borderRadius: 99,
            fontSize: 13,
            fontWeight: 700,
            border: '1px solid var(--border)'
          }}>
            <ShieldCheck size={16} />
            Verified Profile
          </div>
        }
      />

      <div className="fade-in glass profile-card-container" style={{ marginTop: 24 }}>
        <form onSubmit={handleSubmit}>
          
          {/* Top Section: Profile Header & Logo */}
          <div className="profile-top-branding">
            <div style={{ position: 'relative' }}>
              <div className="profile-logo-circle">
                {form.companyLogo ? (
                  <img src={form.companyLogo} alt="Logo" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <ImageIcon size={36} color="var(--text-light)" strokeWidth={1.5} />
                    <div style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 700, marginTop: 4 }}>NO LOGO</div>
                  </div>
                )}
              </div>
              <label className="profile-camera-btn btn-hover">
                <Camera size={16} />
                <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
              </label>
            </div>
            
            <h2 className="profile-branding-title">{form.companyName || 'BDA TECHNOLOGIES PVT. LTD.'}</h2>
            <p className="profile-branding-subtitle">OFFICIAL WORKSPACE BRANDING</p>
          </div>

          <div className="profile-divider"></div>

          {/* Bottom Section: Form Details */}
          <div className="profile-form-body">
            
            <div className="profile-form-section-header">General Identification</div>
            <div className="profile-form-grid">
              <div className="profile-form-field">
                <label className="profile-input-label">Legal Entity Name</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} className="profile-input-icon" />
                  <input 
                    type="text" required value={form.companyName}
                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                    className="profile-premium-input"
                  />
                </div>
              </div>

              <div className="profile-form-field">
                <label className="profile-input-label">Corporate Identification Number (CIN)</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} className="profile-input-icon" />
                  <input 
                    type="text" value={form.companyCIN}
                    onChange={e => setForm({ ...form, companyCIN: e.target.value })}
                    className="profile-premium-input"
                    placeholder="e.g. U72900UP2026PTC123456"
                  />
                </div>
              </div>
            </div>

            <div className="profile-form-section-header" style={{ marginTop: 32 }}>Headquarters & Communication</div>
            <div className="profile-form-grid">
              <div className="profile-form-field profile-field-full">
                <label className="profile-input-label">Statutory Mailing Address</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} className="profile-input-icon" />
                  <input 
                    type="text" required value={form.companyAddress}
                    onChange={e => setForm({ ...form, companyAddress: e.target.value })}
                    className="profile-premium-input"
                  />
                </div>
              </div>

              <div className="profile-form-field">
                <label className="profile-input-label">Official Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} className="profile-input-icon" />
                  <input 
                    type="email" value={form.companyEmail}
                    onChange={e => setForm({ ...form, companyEmail: e.target.value })}
                    className="profile-premium-input"
                    placeholder="e.g. hr@yourcompany.com"
                  />
                </div>
              </div>

              <div className="profile-form-field">
                <label className="profile-input-label">Contact Line</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} className="profile-input-icon" />
                  <input 
                    type="text" value={form.companyPhone}
                    onChange={e => setForm({ ...form, companyPhone: e.target.value })}
                    className="profile-premium-input"
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
              </div>

              <div className="profile-form-field">
                <label className="profile-input-label">GST Number</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} className="profile-input-icon" />
                  <input 
                    type="text" value={form.companyGST}
                    onChange={e => setForm({ ...form, companyGST: e.target.value })}
                    className="profile-premium-input"
                    placeholder="e.g. 09AAHCB4248F1ZO"
                  />
                </div>
              </div>

              <div className="profile-form-field">
                <label className="profile-input-label">Website URL</label>
                <div style={{ position: 'relative' }}>
                  <Globe size={16} className="profile-input-icon" />
                  <input 
                    type="text" value={form.companyWebsite}
                    onChange={e => setForm({ ...form, companyWebsite: e.target.value })}
                    className="profile-premium-input"
                    placeholder="e.g. www.yourcompany.com"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="profile-submit-button btn-hover"
            >
              {loading ? <Loader2 size={20} className="spin" /> : <><Save size={18} /> Save Workspace Changes</>}
            </button>

          </div>
        </form>
      </div>

      <style>{`
        .profile-card-container {
          padding: 40px;
          border-radius: var(--radius-card);
        }

        .profile-top-branding {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 32px;
        }

        .profile-logo-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: var(--bg);
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 4px;
          box-shadow: var(--shadow-sm);
        }

        .profile-camera-btn {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          border: 3px solid var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .profile-branding-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--text);
          margin-top: 20px;
          letter-spacing: -0.02em;
        }

        .profile-branding-subtitle {
          font-size: 10px;
          font-weight: 800;
          color: var(--primary);
          letter-spacing: 0.1em;
          margin-top: 4px;
        }

        .profile-divider {
          height: 1px;
          background: var(--border);
          margin: 0 -40px 32px -40px;
        }

        .profile-form-section-header {
          font-size: 13px;
          font-weight: 800;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 18px;
        }

        .profile-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .profile-form-field {
          display: flex;
          flex-direction: column;
        }

        .profile-field-full {
          grid-column: span 2;
        }

        .profile-input-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .profile-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-light);
        }

        .profile-premium-input {
          width: 100%;
          padding: 12px 12px 12px 42px;
          border-radius: 8px;
          border: 2px solid var(--border);
          background: var(--bg);
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .profile-premium-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-tint, rgba(21,128,61,0.1));
        }

        .profile-submit-button {
          margin-top: 40px;
          width: 100%;
          height: 50px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(15,23,42,0.15);
          transition: all 0.2s;
        }

        .profile-submit-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(15,23,42,0.25);
        }

        @media (max-width: 600px) {
          .profile-form-grid {
            grid-template-columns: 1fr;
          }
          .profile-field-full {
            grid-column: 1;
          }
          .profile-card-container {
            padding: 24px;
          }
          .profile-divider {
            margin: 0 -24px 24px -24px;
          }
        }
      `}</style>
    </PageShell>
  )
}

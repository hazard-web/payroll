import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Settings, Radio, Activity } from 'lucide-react'
import PageShell from '../components/PageShell'
import Profile from './Profile'
import Announcements from './Announcements'
import AuditLogs from './AuditLogs'

const pageStyles = `
  .la-tabs { display:flex; gap:4px; padding:4px; background:var(--bg); border:1px solid var(--border); border-radius:10px; width:fit-content; }
  .la-tab  { padding:8px 20px; border-radius:7px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all 0.18s; color:var(--text-muted); background:transparent; }
  .la-tab.active { background:var(--surface); color:var(--text); box-shadow:0 1px 4px rgba(0,0,0,0.10); }
`

export default function SettingsPage() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'profile')

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  useEffect(() => {
    const id = 'settings-page-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.innerHTML = pageStyles
      document.head.appendChild(el)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      {/* Tabs */}
      <div className="la-tabs" style={{ marginBottom: 22 }}>
        <button 
          className={`la-tab${activeTab === 'profile' ? ' active' : ''}`} 
          onClick={() => setActiveTab('profile')}
        >
          <Settings size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Company Profile
        </button>
        <button 
          className={`la-tab${activeTab === 'announcements' ? ' active' : ''}`} 
          onClick={() => setActiveTab('announcements')}
        >
          <Radio size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Announcements
        </button>
        <button 
          className={`la-tab${activeTab === 'auditlogs' ? ' active' : ''}`} 
          onClick={() => setActiveTab('auditlogs')}
        >
          <Activity size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Activity Logs
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        {activeTab === 'profile' && <Profile isSettings />}
        {activeTab === 'announcements' && <Announcements isSettings />}
        {activeTab === 'auditlogs' && <AuditLogs isSettings />}
      </div>
    </PageShell>
  )
}

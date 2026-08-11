import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, LogOut, User, Clock,
  CalendarDays, Menu, ChevronLeft, ChevronRight, Sun, Moon, Monitor, FileText, Bell, Loader2, CheckCheck, AlertTriangle, Settings, ListChecks, Radio
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useStaffPortal } from '../context/StaffPortalContext'
import { useTheme } from '../context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import GlobalSearch from './GlobalSearch'
import api from '../api'
import PageTransition from './PageTransition'

const navItems = [
  { to: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/portal/profile', label: 'My Profile', icon: User },
  { to: '/portal/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/portal/attendance', label: 'Attendance', icon: Clock },
  { to: '/portal/leave', label: 'Leave', icon: CalendarDays },
  { to: '/portal/payslips', label: 'Payslip', icon: FileText },
  { to: '/portal/announcements', label: 'Announcements', icon: Bell },
]

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    const listener = (e) => setMatches(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])
  return matches
}

export default function PortalLayout() {
  const isMobile = useMediaQuery('(max-width: 1024px)')
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const { staffUser, logout } = useStaffPortal()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [showNotif, setShowNotif] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)



  // Announcements state
  const [announcements, setAnnouncements] = useState([])
  const [showAnnouncements, setShowAnnouncements] = useState(false)

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/portal/announcements')
      setAnnouncements(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch portal announcements:', err)
    }
  }

  useEffect(() => {
    if (staffUser) {
      fetchAnnouncements()
    }
  }, [staffUser])

  // Inactivity timeout monitor (15 minutes)
  useEffect(() => {
    if (!staffUser) return

    let timeoutId
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes

    const handleTimeout = async () => {
      toast('You have been logged out due to inactivity.', { icon: '⏳', duration: 5000 })
      try {
        await api.post('/attendance/punch-out', {
          source: 'AUTO_PUNCH_OUT',
          reason: 'Inactivity logout auto-punch'
        })
      } catch (e) {
        // Suppress if they were not clocked in
      }
      logout()
    }

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(handleTimeout, INACTIVITY_TIMEOUT)
    }

    resetTimer()

    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart']
    events.forEach(name => window.addEventListener(name, resetTimer))

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      events.forEach(name => window.removeEventListener(name, resetTimer))
    }
  }, [staffUser, logout])

  useEffect(() => {
    setSidebarOpen(!window.matchMedia('(max-width: 1024px)').matches)
  }, [])

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname, isMobile])

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  const getActiveTitle = () => {
    const path = location.pathname
    const sorted = [...navItems].sort((a, b) => b.to.length - a.to.length)
    const matched = sorted.find(item => {
      if (item.to === '/portal') return path === '/portal'
      return path.startsWith(item.to)
    })
    return matched ? matched.label : 'Team Portal'
  }

  const getBreadcrumbs = () => {
    const path = location.pathname
    const segments = path.split('/').filter(Boolean)
    const crumbs = [{ label: 'Home', to: '/portal/dashboard' }]
    let currentPath = ''
    segments.forEach((seg) => {
      if (seg === 'portal') {
        currentPath = '/portal'
        return
      }
      currentPath += `/${seg}`
      let label = seg
      if (seg === 'dashboard') {
        label = 'Dashboard'
      } else if (seg === 'profile') {
        label = 'My Profile'
      } else if (seg === 'tasks') {
        label = 'Tasks'
      } else if (seg === 'attendance') {
        label = 'Attendance'
      } else if (seg === 'leave') {
        label = 'Leave'
      } else if (seg === 'payslips') {
        label = 'Payslip'
      } else if (seg === 'announcements') {
        label = 'Announcements'
      } else if (seg === 'settings') {
        label = 'Settings'
      } else {
        label = seg.charAt(0).toUpperCase() + seg.slice(1)
      }
      crumbs.push({ label, to: currentPath })
    })
    if (path === '/portal/dashboard' || path === '/portal') return [{ label: 'Dashboard', to: '/portal/dashboard' }]
    return crumbs
  }

  const fetchNotifications = async () => {
    setNotifLoading(true)
    try {
      const res = await api.get('/notifications/staff')
      setNotifications(res.data.data)
    } catch (err) {
      console.error('Notif error:', err)
    } finally {
      setNotifLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      fetchNotifications()
    } catch (err) {
      console.error('Failed to mark as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/staff/mark-all-read')
      fetchNotifications()
    } catch (err) {
      console.error('Failed to mark all as read')
    }
  }

  useEffect(() => {
    if (staffUser) fetchNotifications()
  }, [staffUser])



  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      window.deferredPrompt = e
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      window.deferredPrompt = null
      setDeferredPrompt(null)
    }

    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else {
      toast('To install, click the Install icon in your browser menu or "Add to Home Screen" on your device.', { duration: 5000, icon: '💡' });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', transition: 'all 0.3s' }}>
      {/* Header Container */}
      <header style={{
        height: 'var(--header-h)',
        background: 'var(--sidebar-bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky', 
        top: 0, 
        zIndex: 130,
        backdropFilter: 'blur(8px)',
      }}>
        {/* Brand Logo & Name Container (with separator border on right) */}
        <div style={{
          width: isMobile ? 'auto' : (sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-mini-w)'),
          height: '100%',
          padding: sidebarOpen ? '0 16px 0 24px' : '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
          flexShrink: 0,
          position: 'relative'
        }}>
          <div 
            onClick={!sidebarOpen ? toggleSidebar : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: !sidebarOpen ? 'pointer' : 'default' }}
            title={!sidebarOpen ? "Expand sidebar" : ""}
          >
            {staffUser?.companyLogo ? (
              <img
                src={staffUser.companyLogo}
                alt="Company Logo"
                style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', background: 'white', padding: 1, border: '1px solid var(--border)', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                background: 'var(--primary)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 13,
              }}>
                {(staffUser?.companyName || 'B').charAt(0).toUpperCase()}
              </div>
            )}
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 16,
                  fontWeight: 800,
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.02em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 160
                }} title={staffUser?.companyName || 'Team Portal'}>
                  {staffUser?.companyName || 'Team Portal'}
                </div>
              </motion.div>
            )}
          </div>
          
          {sidebarOpen && !isMobile && (
            <button 
              onClick={toggleSidebar} 
              style={{ 
                background: 'none', border: 'none', color: 'var(--text-muted)', 
                cursor: 'pointer', padding: 4, borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {!sidebarOpen && !isMobile && (
            <button
              onClick={toggleSidebar}
              title="Expand sidebar"
              style={{
                position: 'absolute',
                left: 'calc(var(--sidebar-mini-w) - 1px)',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                boxShadow: 'var(--shadow-sm)',
                zIndex: 140
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ChevronRight size={12} />
            </button>
          )}
        </div>

        {/* Universal Breadcrumbs Header */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, paddingLeft: 24, fontSize: 13, fontWeight: 600 }}>
          {isMobile && (
            <button 
              onClick={toggleSidebar}
              style={{ 
                background: 'var(--bg)', border: '1px solid var(--border)', 
                color: 'var(--text)', cursor: 'pointer', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 12, transition: 'all 0.2s',
                marginRight: 16
              }}
              className="btn-hover"
            >
              <Menu size={20} />
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {getBreadcrumbs().map((crumb, idx, arr) => {
              const isLast = idx === arr.length - 1
              return (
                <div key={crumb.to} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                  {idx > 0 && <span style={{ color: 'var(--text-light)', opacity: 0.5, fontSize: 11 }}>/</span>}
                  {isLast ? (
                    <span style={{ color: 'var(--text)', fontWeight: 700 }}>{crumb.label}</span>
                  ) : (
                    <span 
                      onClick={() => navigate(crumb.to)}
                      className="hover-primary"
                      style={{ cursor: 'pointer', color: 'var(--text-muted)', transition: 'color 0.15s' }}
                    >
                      {crumb.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 'clamp(16px, 4vw, 32px)' }}>
          <GlobalSearch portal="team" />

          {/* Announcement Megaphone in Red */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => {
                setShowAnnouncements(!showAnnouncements);
                if(!showAnnouncements) fetchAnnouncements();
              }}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)', 
                color: '#ef4444', cursor: 'pointer', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 12, transition: 'all 0.2s',
                position: 'relative'
              }}
              className="btn-hover"
            >
              <Radio size={20} />
              {announcements.some(a => !a.isRead) && (
                <span style={{ position: 'absolute', top: -3, right: -3, display: 'flex', height: 10, width: 10 }}>
                  <span className="animate-ping" style={{ position: 'absolute', inlineSize: '100%', blockSize: '100%', borderRadius: '50%', background: '#ef4444', opacity: 0.75 }} />
                  <span style={{ position: 'relative', borderRadius: '50%', inlineSize: 10, blockSize: 10, background: '#ef4444' }} />
                </span>
              )}
            </button>

            <AnimatePresence>
              {showAnnouncements && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 110 }} onClick={() => setShowAnnouncements(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    style={{
                      position: 'absolute', top: 46, right: 0, width: 380,
                      background: 'var(--surface)', borderRadius: 14,
                      boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
                      zIndex: 120, overflow: 'hidden'
                    }}
                  >
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Recent Announcements</h4>
                    </div>
                    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                      {announcements.length === 0 ? (
                        <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                          No announcements yet
                        </div>
                      ) : (
                        announcements.map((a) => (
                          <div key={a._id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                background: a.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                color: a.priority === 'High' ? '#ef4444' : '#3b82f6'
                              }}>
                                {a.priority}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--text-light)' }}>
                                {new Date(a.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h5 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.title}</h5>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{a.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications Megaphone in Primary color */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => {
                setShowNotif(!showNotif);
                if(!showNotif) fetchNotifications();
              }}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)', 
                color: 'var(--text)', cursor: 'pointer', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 12, transition: 'all 0.2s',
                position: 'relative'
              }}
              className="btn-hover"
            >
              <Bell size={20} />
              {notifications.some(n => !n.isRead) && (
                <span style={{ position: 'absolute', top: -3, right: -3, display: 'flex', height: 10, width: 10 }}>
                  <span className="animate-ping" style={{ position: 'absolute', inlineSize: '100%', blockSize: '100%', borderRadius: '50%', background: 'var(--primary)', opacity: 0.75 }} />
                  <span style={{ position: 'relative', borderRadius: '50%', inlineSize: 10, blockSize: 10, background: 'var(--primary)' }} />
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotif && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 110 }} onClick={() => setShowNotif(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    style={{
                      position: 'absolute', top: 46, right: 0, width: 340,
                      background: 'var(--surface)', borderRadius: 14,
                      boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
                      zIndex: 120, overflow: 'hidden'
                    }}
                  >
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Notifications</h4>
                      {notifications.some(n => !n.isRead) && (
                        <button 
                          onClick={markAllAsRead}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                      {notifLoading ? (
                        <div style={{ padding: '24px 20px', display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" size={20} /></div>
                      ) : notifications.length === 0 ? (
                        <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No notifications</div>
                      ) : (
                        notifications.map((n) => {
                          const typeMap = {
                            TASK: { icon: CheckCheck, bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
                            LEAVE: { icon: CalendarDays, bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
                            PAYSLIP: { icon: FileText, bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' },
                            OTHER: { icon: Bell, bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }
                          }
                          const { icon: Icon, bg, color } = typeMap[n.type] || typeMap.OTHER
                          return (
                            <div
                              key={n._id}
                              onClick={() => !n.isRead && markAsRead(n._id)}
                              style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: n.isRead ? 'var(--surface)' : 'var(--bg-alt)', cursor: n.isRead ? 'default' : 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}
                            >
                              <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Icon size={16} color={color} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{n.message}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 4, fontWeight: 600 }}>
                                  {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              {!n.isRead && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 5 }} />}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="btn-hover"
                style={{ 
                  width: 40, height: 40, borderRadius: 12, 
                  background: 'var(--primary)', color: 'white', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(88,131,59, 0.15)'
                }}
                title="Install Application"
              >
                <Monitor size={20} />
              </button>
            )}
          </div>

          {/* Theme toggle single button */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="btn-hover"
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40, borderRadius: 12, transition: 'all 0.2s'
            }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content & Sidebar Wrapper */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{ 
              position: 'fixed', inset: 0, background: 'rgba(26, 26, 26, 0.5)', 
              zIndex: 100, backdropFilter: 'blur(4px)', transition: 'all 0.3s'
            }}
          />
        )}

        {/* Sidebar */}
        <aside style={{
          width: isMobile ? 'var(--sidebar-w)' : (sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-mini-w)'),
          background: 'var(--sidebar-bg)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 'var(--header-h)', left: 0, bottom: 0,
          zIndex: 120,
          transform: (isMobile && !sidebarOpen) ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRight: '1px solid var(--border)',
          overflow: 'hidden'
        }}>
          {/* Navigation Sidebar */}
          <nav style={{ padding: '24px 16px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <div style={{ 
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', 
              letterSpacing: '0.1em', padding: sidebarOpen ? '0 12px 14px' : '0 0 14px', 
              textTransform: 'uppercase', textAlign: sidebarOpen ? 'left' : 'center',
              whiteSpace: 'nowrap'
            }}>
              {sidebarOpen ? 'Portal Menu' : '•••'}
            </div>
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={!sidebarOpen ? label : ''}
                className="sidebar-link"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 6,
                  marginBottom: 4,
                  textDecoration: 'none',
                  fontSize: 12.5,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'white' : 'var(--text-muted)',
                  background: isActive ? 'var(--sidebar-active)' : 'transparent',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                })}
              >
                <Icon size={17} opacity={0.8} style={{ flexShrink: 0 }} />
                {sidebarOpen && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* User Profile Hook */}
          <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            {sidebarOpen ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '10px 12px',
              }}>
                {staffUser?.documents?.profileImage?.url ? (
                  <img
                    src={staffUser.documents.profileImage.url}
                    alt={staffUser.fullName}
                    style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, objectFit: 'cover', border: '1px solid var(--border)' }}
                    title={staffUser.fullName}
                  />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: 'var(--primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 15,
                  }} title={staffUser?.fullName}>
                    {(staffUser?.fullName || 'E').charAt(0).toUpperCase()}
                  </div>
                )}

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {staffUser?.fullName || 'Employee'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {staffUser?.email || 'email'}
                  </div>
                </div>

                <button
                  onClick={logout}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  title="Sign Out"
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={logout}
                title="Sign Out"
                style={{
                  width: '100%', background: 'transparent', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 0', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </aside>

        {/* Global Body */}
        <main style={{ 
          marginLeft: isMobile ? 0 : (sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-mini-w)'), 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          minWidth: 0
        }}>
          <div className="page-viewport" style={{ flex: 1, position: 'relative' }}>
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}

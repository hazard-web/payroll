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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', transition: 'all 0.3s' }}>
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
        top: 0, left: 0, bottom: 0,
        zIndex: 120,
        transform: (isMobile && !sidebarOpen) ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRight: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Brand Header */}
        <div style={{
          height: 'var(--header-h)',
          padding: sidebarOpen ? '0 24px' : '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 6,
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <div style={{ color: 'var(--primary)', fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '-0.05em' }}>
                BDA
              </div>
            </div>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 12, fontWeight: 700,
                  color: 'var(--text-muted)', letterSpacing: '0.1em',
                  whiteSpace: 'nowrap', textTransform: 'uppercase'
                }}>Team Portal</div>
              </motion.div>
            )}
          </div>
          
          {!isMobile && (
            <button 
              onClick={toggleSidebar} 
              style={{ 
                background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', 
                cursor: 'pointer', padding: 6, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                marginLeft: 0
              }}
              className="btn-hover"
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          )}

          {isMobile && (
            <button 
              onClick={() => setSidebarOpen(false)} 
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', padding: 6, borderRadius: 8 }}
              className="btn-hover"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

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
              justifyContent: 'space-between',
              gap: 10,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '8px 10px',
            }}>
              {staffUser?.documents?.profileImage?.url ? (
                <img
                  src={staffUser.documents.profileImage.url}
                  alt={staffUser.fullName}
                  style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, objectFit: 'cover', border: '1px solid var(--border)' }}
                  title={staffUser.fullName}
                />
              ) : (
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: 'var(--primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14,
                }} title={staffUser?.fullName}>
                  {(staffUser?.fullName || 'E').charAt(0).toUpperCase()}
                </div>
              )}

              <button
                onClick={logout}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', color: 'var(--text-muted)',
                  fontSize: 12, fontWeight: 600, borderRadius: 8,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <LogOut size={13} style={{ flexShrink: 0 }} />
                Sign Out
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

      {/* Main Framework */}
      <main style={{ 
        marginLeft: isMobile ? 0 : (sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-mini-w)'), 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        minWidth: 0
      }}>
        
        {/* Universal Header */}
        <header style={{
          height: 'var(--header-h)', 
          background: 'var(--surface)', 
          borderBottom: '1px solid var(--border)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 clamp(16px, 4vw, 32px)',
          position: 'sticky', 
          top: 0, 
          zIndex: 80,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {isMobile && (
              <button 
                onClick={toggleSidebar}
                style={{ 
                  background: 'var(--bg)', border: '1px solid var(--border)', 
                  color: 'var(--text)', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 40, borderRadius: 12, transition: 'all 0.2s'
                }}
                className="btn-hover"
              >
                <Menu size={20} />
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                {announcements.length > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, background: '#ef4444', borderRadius: '50%', border: '2px solid var(--surface)' }} />
                )}
              </button>

              <AnimatePresence>
                {showAnnouncements && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowAnnouncements(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 12,
                        width: 320, background: 'var(--surface)', borderRadius: 14,
                        border: '1px solid var(--border)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.12)',
                        zIndex: 100, overflow: 'hidden'
                      }}
                    >
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Radio size={15} color="#ef4444" />
                          <span style={{ fontWeight: 800, fontSize: 13, color: '#ef4444' }}>Announcements</span>
                        </div>
                      </div>
                      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {announcements.length === 0 ? (
                          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            <Radio size={26} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px', color: '#ef4444' }} />
                            No active announcements.
                          </div>
                        ) : (
                          announcements.map((a) => (
                            <div 
                              key={a._id}
                              style={{ 
                                padding: '12px 16px', 
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                textAlign: 'left'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{
                                  fontSize: 8,
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: a.priority === 'Urgent' ? '#fef2f2' : a.priority === 'Important' ? '#fffbeb' : '#f0fdf4',
                                  color: a.priority === 'Urgent' ? '#ef4444' : a.priority === 'Important' ? '#d97706' : '#22c55e',
                                  border: `1px solid ${a.priority === 'Urgent' ? '#fca5a5' : a.priority === 'Important' ? '#fcd34d' : '#86efac'}`
                                }}>
                                  {a.priority}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                  {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                                {a.title}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                                {a.message}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Notification Bell */}
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
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, background: 'var(--primary)', color: 'white', fontSize: 10, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, border: '2px solid var(--surface)' }}>
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotif && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowNotif(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 12,
                        width: 340, background: 'var(--surface)', borderRadius: 14,
                        border: '1px solid var(--border)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.12)',
                        zIndex: 100, overflow: 'hidden'
                      }}
                    >
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Bell size={15} color="var(--primary)" />
                          <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--primary)' }}>Notifications</span>
                          {notifications.filter(n => !n.isRead).length > 0 && (
                            <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 20, fontSize: 10, fontWeight: 800, padding: '2px 7px' }}>
                              {notifications.filter(n => !n.isRead).length}
                            </span>
                          )}
                        </div>
                        <button onClick={markAllAsRead} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 700 }}>
                          <CheckCheck size={12} /> Mark all read
                        </button>
                      </div>
                      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                        {notifLoading ? (
                          <div style={{ padding: 40, textAlign: 'center' }}>
                            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
                          </div>
                        ) : notifications.length === 0 ? (
                          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            <Bell size={26} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((n) => {
                            const typeMap = {
                              LEAVE_REQUEST:  { icon: CalendarDays, bg: '#e0f2fe', color: '#0369a1' },
                              PAYSLIP_PUSHED: { icon: FileText,     bg: '#e5ebdd', color: '#58833b' },
                              PROFILE_UPDATE: { icon: User,         bg: '#f3e8ff', color: '#7e22ce' },
                              ATTENDANCE_ALERT:{ icon: AlertTriangle, bg: '#fee2e2', color: '#dc2626' },
                              OTHER:          { icon: Bell,         bg: 'var(--bg)', color: 'var(--text-muted)' },
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

            {/* Theme Control System */}
            <div style={{ 
              display: 'flex', background: 'var(--bg)', borderRadius: 6, 
              padding: 3, border: '1.5px solid var(--border)' 
            }}>
              {[
                { id: 'light', icon: Sun, label: 'Light' },
                { id: 'dark', icon: Moon, label: 'Dark' }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    background: theme === t.id ? 'var(--bg)' : 'transparent',
                    color: theme === t.id ? 'var(--primary)' : 'var(--primary)',
                    boxShadow: theme === t.id ? 'var(--shadow-sm)' : 'none',
                    border: 'none', borderRadius: 11, padding: '7px 14px',
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.2s'
                  }}
                >
                  <t.icon size={15} strokeWidth={2.5} />
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Global Body */}
        <div className="page-viewport" style={{ flex: 1, position: 'relative' }}>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>


    </div>
  )
}

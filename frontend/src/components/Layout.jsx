import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, List, Menu,
  Settings, User, Users,
  Sun, Moon, ChevronLeft, ChevronRight, Bell, CalendarDays, Activity, TrendingUp,
  LogOut, AlertTriangle, Loader2, FileText, UserCheck, CheckCheck,
  Download, Sparkles, ChevronDown
} from 'lucide-react'
import api from '../api'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import PageTransition from './PageTransition'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/staff', label: 'Team Management', icon: Users },
  { to: '/leave-requests', label: 'Attendance & Leave', icon: CalendarDays },
  { to: '/performance', label: 'Team Performance', icon: TrendingUp },
  { to: '/payslips', label: 'All Payslips', icon: List },
  { to: '/audit-logs', label: 'Activity Logs', icon: Activity },
  { to: '/profile', label: 'Company Profile', icon: Settings },
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

export default function Layout() {
  const isMobile = useMediaQuery('(max-width: 1024px)')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 60000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/admin')
      setNotifications(res.data.data)
    } catch (err) {
      console.error('Failed to fetch notifications')
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

  const archiveNotification = async (id) => {
    try {
      await api.put(`/notifications/${id}/archive`)
      fetchNotifications()
      toast.success('Notification archived')
    } catch (err) {
      toast.error('Failed to archive')
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/admin/mark-all-read')
      fetchNotifications()
      toast.success('All marked as read')
    } catch (err) {
      toast.error('Action failed')
    }
  }

  const handleLeaveAction = async (id, status) => {
    try {
      await api.post('/leaves/admin/respond', { id, status })
      toast.success(`Leave ${status.toLowerCase()}`)
      fetchNotifications()
    } catch (err) {
      toast.error('Action failed')
    }
  }

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
      toast('To install, click the Install icon (🖥️) in your address bar, or use "Add to Home Screen" in your mobile menu.', { duration: 5000, icon: '💡' });
    }
  }

  useEffect(() => {
    setSidebarOpen(!window.matchMedia('(max-width: 1024px)').matches)
  }, [])

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname, isMobile])

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Universal Header */}
      <header style={{
        height: 'var(--header-h)', 
        background: 'var(--surface)', 
        borderBottom: '1px solid var(--border)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        position: 'sticky', 
        top: 0, 
        zIndex: 130,
        backdropFilter: 'blur(8px)',
      }}>
        {/* Brand Logo & Name Container (with separator border on right) */}
        <div style={{
          width: isMobile ? 'auto' : (sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-mini-w)'),
          height: '100%',
          padding: sidebarOpen ? '0 24px' : '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* SVG Logo */}
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect x="4" y="6" width="16" height="18" rx="3" fill="var(--primary)" opacity="0.35" transform="rotate(-5 12 15)" />
              <rect x="8" y="4" width="16" height="18" rx="3" fill="url(#logo-grad)" />
              <line x1="12" y1="9" x2="20" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="13" x2="20" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="17" x2="17" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <defs>
                <linearGradient id="logo-grad" x1="8" y1="4" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="var(--primary)" />
                  <stop offset="1" stopColor="var(--primary)" style={{ filter: 'brightness(0.9)' }} />
                </linearGradient>
              </defs>
            </svg>
            {sidebarOpen && (
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.02em'
              }}>
                PaySlip <span style={{ color: 'var(--primary)' }}>Pro</span>
              </span>
            )}
          </div>
        </div>

        {/* Left-center part of header: Menu toggle button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: '100%', flex: 1, paddingLeft: 16 }}>
          <button 
            onClick={toggleSidebar}
            style={{ 
              background: 'none', border: 'none', 
              color: 'var(--text)', cursor: 'pointer', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 8, borderRadius: 8, transition: 'all 0.2s'
            }}
            className="btn-hover"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Right side of header: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 'clamp(16px, 4vw, 32px)' }}>

          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="btn-hover"
              style={{ 
                width: 38, height: 38, borderRadius: 10, 
                background: 'var(--primary)', color: 'white', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(88,131,59, 0.15)'
              }}
              title="Install Application"
            >
              <Download size={18} />
            </button>
          )}

          {/* Notification System */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setNotifOpen(!notifOpen)}
              style={{ 
                background: 'var(--bg)', border: '1px solid var(--border)', 
                color: 'var(--text)', cursor: 'pointer', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 38, height: 38, borderRadius: 10, position: 'relative'
              }}
              className="btn-hover"
            >
              <Bell size={18} />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span style={{
                  position: 'absolute', top: -3, right: -3,
                  width: 16, height: 16, background: 'var(--primary)', color: 'white',
                  borderRadius: '50%', fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--surface)'
                }}>
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 190 }} onClick={() => setNotifOpen(false)} />
                <div style={{
                  position: 'absolute', top: 46, right: 0, width: 380,
                  background: 'var(--surface)', borderRadius: 14,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.18)', border: '1px solid var(--border)',
                  zIndex: 200, overflow: 'hidden'
                }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bell size={16} color="var(--primary)" />
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)' }}>Notifications</span>
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 20, fontSize: 10, fontWeight: 800, padding: '2px 7px' }}>
                          {notifications.filter(n => !n.isRead).length} new
                        </span>
                      )}
                    </div>
                    <button onClick={markAllAsRead} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <CheckCheck size={13} /> Mark all read
                    </button>
                  </div>
                  <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        <Bell size={28} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map(n => {
                        const typeMap = {
                          LEAVE_REQUEST:   { icon: CalendarDays, bg: '#e0f2fe', color: '#0369a1', nav: '/leave-requests' },
                          STAFF_CREATED:   { icon: UserCheck,    bg: '#e5ebdd', color: '#58833b', nav: '/staff' },
                          PAYSLIP_PUSHED:  { icon: FileText,     bg: '#fef3c7', color: '#b45309', nav: '/payslips' },
                          PROFILE_UPDATE:  { icon: User,         bg: '#f3e8ff', color: '#7e22ce', nav: '/staff' },
                          ATTENDANCE_ALERT:{ icon: AlertTriangle, bg: '#fee2e2', color: '#dc2626', nav: '/leave-requests' },
                          OTHER:           { icon: Bell,         bg: 'var(--bg)', color: 'var(--text-muted)', nav: '/' },
                        }
                        const { icon: Icon, bg, color, nav } = typeMap[n.type] || typeMap.OTHER
                        return (
                          <div key={n._id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: n.isRead ? 'var(--surface)' : 'var(--bg-alt)' }}>
                            <div
                              onClick={() => { markAsRead(n._id); navigate(nav); setNotifOpen(false) }}
                              style={{ display: 'flex', gap: 12, cursor: 'pointer', marginBottom: n.type === 'LEAVE_REQUEST' && !n.isRead ? 10 : 0 }}
                            >
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Icon size={17} color={color} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {n.staff?.fullName && (
                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{n.staff.fullName}</div>
                                )}
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>{n.message}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 4 }}>
                                  {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 4 }} />}
                            </div>
                            {n.type === 'LEAVE_REQUEST' && !n.isRead && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <button onClick={() => handleLeaveAction(n.referenceId, 'Approved')} style={{ flex: 1, padding: '7px', borderRadius: 8, background: 'var(--primary)', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                  Approve
                                </button>
                                <button onClick={() => handleLeaveAction(n.referenceId, 'Rejected')} style={{ flex: 1, padding: '7px', borderRadius: 8, background: 'var(--bg)', color: 'var(--primary)', border: '1px solid var(--primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                  Deny
                                </button>
                                <button onClick={() => archiveNotification(n._id)} style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: 11, cursor: 'pointer' }}>
                                  Archive
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profile Dropdown with Chevron */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px 4px 4px',
                borderRadius: 9999,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              className="btn-hover"
            >
              {/* User Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--primary)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 11
              }}>
                {(user?.companyName || 'A').charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{user?.companyName || 'Admin'}</span>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </button>

            {profileOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 190 }} onClick={() => setProfileOpen(false)} />
                <div style={{
                  position: 'absolute', top: 42, right: 0, width: 220,
                  background: 'var(--surface)', borderRadius: 12,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid var(--border)',
                  zIndex: 200, padding: 6, display: 'flex', flexDirection: 'column', gap: 4
                }}>
                  {/* Theme toggler inside dropdown */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>THEME</span>
                    <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 6, padding: 2, border: '1px solid var(--border)' }}>
                      {[
                        { id: 'light', label: 'Light' },
                        { id: 'dark', label: 'Dark' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          style={{
                            background: theme === t.id ? 'var(--surface)' : 'transparent',
                            color: theme === t.id ? 'var(--primary)' : 'var(--text-muted)',
                            border: 'none', borderRadius: 4, padding: '3px 8px',
                            cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.2s'
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { navigate('/profile'); setProfileOpen(false); }}
                    style={{
                      width: '100%', padding: '10px 12px', background: 'none', border: 'none',
                      textAlign: 'left', fontSize: 13, color: 'var(--text)', cursor: 'pointer',
                      borderRadius: 8, transition: 'background 0.2s', fontWeight: 600
                    }}
                    onMouseEnter={e => e.target.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.target.style.background = 'none'}
                  >
                    Company Profile
                  </button>
                  <button
                    onClick={() => { logout(); setProfileOpen(false); }}
                    style={{
                      width: '100%', padding: '10px 12px', background: 'none', border: 'none',
                      textAlign: 'left', fontSize: 13, color: '#dc2626', cursor: 'pointer',
                      borderRadius: 8, transition: 'background 0.2s', fontWeight: 700
                    }}
                    onMouseEnter={e => e.target.style.background = '#fef2f2'}
                    onMouseLeave={e => e.target.style.background = 'none'}
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
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
          borderRight: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden'
        }}>
          {/* Navigation Sidebar */}
          <nav style={{ padding: '24px 16px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: sidebarOpen ? '0 12px 16px' : '0 0 16px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              marginBottom: 16
            }}>
              <span style={{ 
                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', 
                letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap'
              }}>
                {sidebarOpen ? 'Technologies' : '•••'}
              </span>
              {sidebarOpen && (
                <button 
                  onClick={toggleSidebar} 
                  style={{ 
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', 
                    cursor: 'pointer', padding: 4, borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={!sidebarOpen ? label : ''}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 6,
                  marginBottom: 6,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                  background: isActive ? 'var(--sidebar-active)' : 'transparent',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                })}
              >
                <Icon size={20} opacity={0.8} style={{ flexShrink: 0 }} />
                {sidebarOpen && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          <div style={{ padding: '0 14px 12px' }}>
            {/* Logout button */}
            <button
              onClick={logout}
              title={!sidebarOpen ? 'Sign Out' : ''}
              style={{
                width: '100%', background: 'transparent', color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
                padding: sidebarOpen ? '8px 12px' : '8px 0', marginTop: 4,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                gap: 8, fontSize: 12, fontWeight: 600, transition: 'all 0.2s'
              }}
            >
              <LogOut size={14} style={{ flexShrink: 0 }} />
              {sidebarOpen && 'Sign Out'}
            </button>
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

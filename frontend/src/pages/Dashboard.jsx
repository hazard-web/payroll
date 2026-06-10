import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserCheck, UserX, Calendar, ClipboardList, Loader2, Clock, AlertTriangle, ArrowRight, X, TrendingUp } from 'lucide-react'
import api from '../api'
import PageShell, { PageHeader, PageLoading } from '../components/PageShell'
import { useAuth } from '../context/AuthContext'

const dashStyles = `
  .dash-stat-row {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  .dash-stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px 20px 16px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    cursor: pointer;
    transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
    text-decoration: none;
    position: relative;
    overflow: hidden;
  }
  .dash-stat-card:hover {
    box-shadow: 0 8px 28px rgba(0,0,0,0.10);
    transform: translateY(-2px);
    border-color: var(--primary-light, #a3c986);
  }
  .dash-stat-card .arrow-hint {
    position: absolute;
    bottom: 12px;
    right: 14px;
    opacity: 0;
    transition: opacity 0.18s;
  }
  .dash-stat-card:hover .arrow-hint {
    opacity: 1;
  }
  .dash-icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .dash-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: 1fr;
  }
  @media(min-width: 1024px) {
    .dash-grid { grid-template-columns: repeat(2, 1fr); }
  }
  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
  }
  .dash-panel {
    height: 350px;
    display: flex;
    flex-direction: column;
  }
  .dash-panel .panel-head { padding: 14px 20px; }
  .dash-panel .panel-subhead { padding: 8px 20px; }
  .dash-panel .att-table-head { padding: 8px 20px; }
  .dash-panel .att-row { padding: 10px 20px; }
  .dash-panel .avg-bar { margin: 0 16px 10px; }
  .att-panel .scroll-list { flex: 1; }
  .panel-head {
    padding: 16px 22px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .panel-subhead {
    padding: 9px 22px;
    border-bottom: 1px solid var(--border);
    background: rgba(0,0,0,0.02);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  /* Attendance overview table */
  .att-table-head {
    display: grid;
    grid-template-columns: 1fr 90px 90px 80px;
    gap: 8px;
    padding: 10px 22px;
    border-bottom: 1px solid var(--border);
    background: rgba(0,0,0,0.025);
  }
  .att-row {
    display: grid;
    grid-template-columns: 1fr 90px 90px 80px;
    gap: 8px;
    align-items: center;
    padding: 11px 22px;
    border-bottom: 1px solid var(--border);
    transition: background 0.13s;
  }
  .att-row:last-child { border-bottom: none; }
  .att-row:hover { background: rgba(0,0,0,0.018); }
  /* Punch-in list */
  .punch-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 22px;
    border-bottom: 1px solid var(--border);
    transition: background 0.13s;
  }
  .punch-row:last-child { border-bottom: none; }
  .punch-row:hover { background: rgba(0,0,0,0.018); }
  /* Join list */
  .join-row {
    display: grid;
    grid-template-columns: 38px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 12px 22px;
    border-bottom: 1px solid var(--border);
    transition: background 0.13s;
  }
  .join-row:last-child { border-bottom: none; }
  .join-row:hover { background: rgba(0,0,0,0.018); }
  /* Pills */
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    line-height: 1.6;
  }
  .pill-green  { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; }
  .pill-orange { background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }
  .pill-slate  { background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
  .pill-blue   { background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }
  .pill-red    { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
  /* Scroll containers */
  .scroll-list { max-height: 320px; min-height: 320px; overflow-y: auto; overflow-x: hidden; }
  .scroll-list.att-scroll { max-height: 186px; min-height: 186px; }
  .scroll-list::-webkit-scrollbar { width: 4px; }
  .scroll-list::-webkit-scrollbar-track { background: transparent; }
  .scroll-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  /* Donut */
  .donut-chart {
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .donut-inner {
    width: 96px;
    height: 96px;
    background: var(--surface);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .avg-bar {
    margin: 0 20px 18px;
    padding: 11px 16px;
    background: linear-gradient(135deg,#f0fdf4,#dcfce7);
    border: 1px solid #bbf7d0;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(9, 12, 16, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 50;
  }
  .modal-card {
    width: min(900px, 96vw);
    max-height: 84vh;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .modal-head {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .modal-body {
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .modal-scroll {
    overflow: auto;
  }
`;

// ── Helpers ────────────────────────────────────────────────────────
const LATE_START_HOUR = 10;
const LATE_START_MINUTE = 30;
const LATE_CUTOFF_HOUR = 11;
const LATE_CUTOFF_MINUTE = 0;

const fmtTime = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getLateInfo = (punchIn) => {
  if (!punchIn) return { isLate: false, lateByMinutes: 0 };
  const d = new Date(punchIn);
  const minutesSinceMidnight = d.getHours() * 60 + d.getMinutes();
  const startMinutes = LATE_START_HOUR * 60 + LATE_START_MINUTE;
  const cutoffMinutes = LATE_CUTOFF_HOUR * 60 + LATE_CUTOFF_MINUTE;

  if (minutesSinceMidnight <= cutoffMinutes) {
    return { isLate: false, lateByMinutes: 0 };
  }

  return {
    isLate: true,
    lateByMinutes: Math.max(0, minutesSinceMidnight - startMinutes)
  };
};

const calcWorkedTime = (record, now) => {
  if (!record.punchIn) return '—';
  const start = new Date(record.punchIn);
  const end   = record.punchOut ? new Date(record.punchOut) : now;
  const diffMs = Math.max(0, end - start);
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

const fmtLateDuration = (mins) => {
  const total = Math.max(0, Number(mins) || 0);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const Avatar = ({ name, bg, color, size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <span style={{ fontSize: size * 0.38, fontWeight: 700, color }}>{(name || '?').charAt(0).toUpperCase()}</span>
  </div>
);

// ── StatCard ──────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, value, title, subtitle, iconBg, iconColor, onClick }) => (
  <div className="dash-stat-card" onClick={onClick} role="button" tabIndex={0}
    onKeyDown={e => e.key === 'Enter' && onClick?.()}>
    <div className="dash-icon-wrap" style={{ background: iconBg }}>
      <Icon size={22} color={iconColor} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', marginTop: 2, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 5 }}>{subtitle}</div>
    </div>
  </div>
);

const AttentionRequired = ({ leaveToday, pendingLeaveCount, absentCount, onViewLeave, onViewPending, onViewAbsent }) => {
  const cards = [
    {
      title: 'Absent Today',
      value: absentCount,
      icon: UserX,
      iconBg: '#fef2f2',
      iconColor: '#b91c1c',
      onClick: onViewAbsent,
    },
    {
      title: 'Employees on Leave',
      value: leaveToday,
      icon: Calendar,
      iconBg: '#eff6ff',
      iconColor: '#1d4ed8',
      onClick: onViewLeave,
    },
    {
      title: 'Pending Leave Requests',
      value: pendingLeaveCount,
      icon: AlertTriangle,
      iconBg: '#fff7ed',
      iconColor: '#c2410c',
      onClick: onViewPending,
    },
  ]

  return (
    <div className="panel dash-panel" style={{ height: 'auto', minHeight: 350 }}>
      <div className="panel-head" style={{ borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={17} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Attention Required</span>
        </div>
      </div>
      <div style={{ padding: '0 22px 22px', display: 'grid', gap: 16, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {cards.map(card => {
          const Icon = card.icon
          return (
            <button 
              key={card.title} 
              onClick={card.onClick} 
              style={{
                border: '1px solid var(--border)', 
                borderRadius: 14,
                background: 'var(--surface)', 
                padding: '16px 20px',
                textAlign: 'left', 
                cursor: 'pointer', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between', 
                height: 128,
                transition: 'all 0.2s',
                outline: 'none'
              }}
              className="btn-hover"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  background: card.iconBg, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexShrink: 0 
                }}>
                  <Icon size={16} color={card.iconColor} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                  {card.title}
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', marginTop: 12 }}>
                {card.value}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading]         = useState(true);
  const [staffData, setStaffData]     = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [todayPunchins, setTodayPunchins] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [now, setNow]                 = useState(new Date());
  const [showNotActiveModal, setShowNotActiveModal] = useState(false);
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showActiveModal, setShowActiveModal] = useState(false);

  // Live clock — tick every 30 s so active worked-times refresh
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const styleId = 'dash-styles-v4';
    if (!document.getElementById(styleId)) {
      const el = document.createElement('style');
      el.id = styleId;
      el.innerHTML = dashStyles;
      document.head.appendChild(el);
    }
    const fetchData = async () => {
      try {
        const [staffRes, activeRes, punchinsRes, approvedLeaveRes, pendingLeaveRes] = await Promise.all([
          api.get('/staff'),
          api.get('/attendance/admin/active'),
          api.get('/attendance/admin/today-punchins'),
          api.get('/leaves/admin/pending', { params: { status: 'Approved' } }),
          api.get('/leaves/admin/pending', { params: { status: 'Pending' } })
        ]);
        setStaffData(staffRes.data.data || []);
        setActiveCount(activeRes.data?.activeCount || 0);
        setTodayPunchins(punchinsRes.data?.data || []);
        setApprovedLeaves(approvedLeaveRes.data?.data || []);
        setPendingLeaves(pendingLeaveRes.data?.data || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  if (loading) {
    return <PageLoading label="Loading dashboard…" />;
  }

  // ── Compute Stats ────────────────────────────────────────────────
  const totalEmployees = staffData.length;
  const safeActive = Math.min(Math.max(activeCount, 0), totalEmployees);
  const totalPresentToday = todayPunchins.length;

  const today        = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const isLeaveOverlappingToday = (leave) => {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    return start <= endOfToday && end >= startOfToday;
  };
  const approvedOnLeaveToday = approvedLeaves.filter(isLeaveOverlappingToday);
  const onLeave = approvedOnLeaveToday.length;

  // Punch-in meta
  const latePunchins  = todayPunchins.filter(r => getLateInfo(r.punchIn).isLate);
  const validPunchins = todayPunchins.filter(r => r.punchIn);
  const punchedInStaffIds = new Set(todayPunchins.map(r => String(r.staff?._id || '')));
  const notActiveStaff = staffData.filter(s => !punchedInStaffIds.has(String(s._id)));
  const notActiveCount = notActiveStaff.length;

  const avgLoginTime = (() => {
    if (!validPunchins.length) return null;
    const avgSec = validPunchins.reduce((sum, r) => {
      const d = new Date(r.punchIn);
      return sum + d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    }, 0) / validPunchins.length;
    const h = Math.floor(avgSec / 3600);
    const m = Math.floor((avgSec % 3600) / 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  })();

  // Sort attendance: late first, then active, then by recent punch-in
  const sortedAttendance = [...todayPunchins].sort((a, b) => {
    const aLate = getLateInfo(a.punchIn).isLate ? 1 : 0;
    const bLate = getLateInfo(b.punchIn).isLate ? 1 : 0;
    if (aLate !== bLate) return bLate - aLate;

    const aActive = !a.punchOut ? 1 : 0;
    const bActive = !b.punchOut ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return new Date(b.punchIn) - new Date(a.punchIn);
  });
  const activeAttendance = sortedAttendance.filter((r) => !r.punchOut);

  return (
    <PageShell>
      {/* ── Welcome Greeting ── */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.02em' }}>
          Welcome back, {user?.companyName || 'BDA'}! 👋
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Here's an overview of your payroll dashboard.
        </p>
      </div>

      {/* ── Stat Row ─────────────────────────────────────────────── */}
      <div className="dash-stat-row" style={{ marginBottom: 22 }}>
        <StatCard
          icon={Users} title="TOTAL EMPLOYEES" value={totalEmployees}
          subtitle="All registered team members"
          iconBg="#e5ebdd" iconColor="#58833b"
          onClick={() => navigate('/staff')}
        />
        <StatCard
          icon={UserCheck} title="ACTIVE TODAY" value={safeActive}
          subtitle="Currently punched in"
          iconBg="#dbeafe" iconColor="#1d4ed8"
          onClick={() => setShowActiveModal(true)}
        />
        <StatCard
          icon={Calendar} title="ON LEAVE TODAY" value={onLeave}
          subtitle="Approved leave today"
          iconBg="#fef3c7" iconColor="#d97706"
          onClick={() => setShowLeaveModal(true)}
        />
        <StatCard
          icon={UserX} title="NOT ACTIVE" value={notActiveCount}
          subtitle="Not punched in today"
          iconBg="#fef2f2" iconColor="#b91c1c"
          onClick={() => setShowNotActiveModal(true)}
        />
      </div>

      {/* ── Middle Row ───────────────────────────────────────────── */}
      <div className="dash-grid" style={{ marginBottom: 22 }}>

        <AttentionRequired
          leaveToday={onLeave}
          pendingLeaveCount={pendingLeaves.length}
          absentCount={notActiveCount}
          onViewLeave={() => setShowLeaveModal(true)}
          onViewPending={() => navigate('/leave-requests')}
          onViewAbsent={() => setShowNotActiveModal(true)}
        />

        {/* Attendance Overview — detailed table */}
        <div className="panel dash-panel att-panel" id="att-overview-panel">
          <div className="panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ClipboardList size={17} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Recent Punch-In</span>
              {latePunchins.length > 0 && (
                <span className="pill pill-orange">
                  <AlertTriangle size={10} />
                  {latePunchins.length} late
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {todayPunchins.length} present today
              </span>
              <button
                onClick={() => setShowAllAttendance(true)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >
                View all →
              </button>
            </div>
          </div>

          {avgLoginTime && (
            <div className="panel-subhead">
              <Clock size={12} color="var(--text-muted)" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Avg login: <strong style={{ color: 'var(--text)' }}>{avgLoginTime}</strong>
              </span>
            </div>
          )}

          {/* Column headers */}
          <div className="att-table-head">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Login</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Worked</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
          </div>

          <div className="scroll-list att-scroll">
            {sortedAttendance.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <ClipboardList size={20} color="var(--text-light)" />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>No punch-ins recorded today.</div>
              </div>
            ) : sortedAttendance.map(record => {
              const { isLate: late, lateByMinutes } = getLateInfo(record.punchIn);
              const active = !record.punchOut;
              const worked = calcWorkedTime(record, now);
              const avatarBg    = late ? '#fff7ed' : active ? '#eff6ff' : '#f1f5f9';
              const avatarColor = late ? '#c2410c' : active ? '#1d4ed8' : '#475569';
              return (
                <div key={record._id} className="att-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <Avatar name={record.staff?.fullName} bg={avatarBg} color={avatarColor} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {record.staff?.fullName || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {record.staff?.designation || 'Team Member'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: late ? '#c2410c' : 'var(--text)' }}>
                    {fmtTime(record.punchIn)}
                    {late && <div style={{ fontSize: 10, color: '#c2410c', fontWeight: 500 }}>Late by {fmtLateDuration(lateByMinutes)}</div>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {worked}
                    {active && (
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                    )}
                  </div>
                  <span
                    className={`pill ${active ? 'pill-blue' : late ? 'pill-orange' : 'pill-green'}`}
                    title={late ? `Late by ${fmtLateDuration(lateByMinutes)}` : undefined}
                  >
                    {active ? 'Active' : late ? 'Late' : 'On Time'}
                  </span>
                </div>
              );
            })}
          </div>

          {sortedAttendance.length > 0 && (
            <div style={{ padding: '8px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Present: <strong style={{ color: 'var(--text)' }}>{totalPresentToday}</strong></span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active: <strong style={{ color: '#1d4ed8' }}>{safeActive}</strong></span>
              {latePunchins.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Late: <strong style={{ color: '#c2410c' }}>{latePunchins.length}</strong></span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Monthly Attendance Overview ────────────────── */}
      <div style={{ marginBottom: 22 }}>
        <div className="panel" style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <TrendingUp size={16} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Monthly Attendance Overview</span>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                color: '#15803d',
                background: '#f0fdf4',
                padding: '1px 6px',
                borderRadius: 4,
                border: '1px solid #bbf7d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2
              }}>
                +8.4%
              </span>
            </div>
            <div>
              <select style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}>
                <option value="june_2026">June 2026</option>
              </select>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div style={{ width: '100%', height: 240, position: 'relative' }}>
            <svg viewBox="0 0 800 220" width="100%" height="100%" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
                <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="var(--primary)" floodOpacity="0.2" />
                </filter>
              </defs>

              {/* Horizontal Grid Lines & Y Axis Labels */}
              {[0, 2, 4, 6, 8, 10].map((val) => {
                const y = 20 + 160 * (1 - val / 10);
                return (
                  <g key={val}>
                    {/* Y label */}
                    <text x="12" y={y + 4} fill="var(--text-muted)" fontSize="10.5" fontWeight="600" textAnchor="end">{val}</text>
                    {/* Grid line */}
                    {val > 0 && (
                      <line x1="25" y1={y} x2="785" y2={y} stroke="var(--border)" strokeWidth="0.5" opacity="0.6" strokeDasharray="3,3" />
                    )}
                    {val === 0 && (
                      <line x1="25" y1={y} x2="785" y2={y} stroke="var(--border)" strokeWidth="1" opacity="0.8" />
                    )}
                  </g>
                );
              })}

              {/* X Axis Labels */}
              {[
                { label: '1 Jun', x: 25 },
                { label: '5 Jun', x: 151 },
                { label: '10 Jun', x: 278 },
                { label: '15 Jun', x: 405 },
                { label: '20 Jun', x: 531 },
                { label: '25 Jun', x: 658 },
                { label: '30 Jun', x: 785 }
              ].map((tick, i) => (
                <text key={i} x={tick.x} y="205" fill="var(--text-muted)" fontSize="10.5" fontWeight="600" textAnchor="middle">
                  {tick.label}
                </text>
              ))}

              {/* Gradient Area Fill (Curved Cubic Spline) */}
              <path
                d="M 25,84 C 88,84 88,52 151,52 C 214,52 214,84 278,84 C 341.5,84 341.5,120 405,120 C 468.5,120 468.5,68 531,68 C 594.5,68 594.5,100 658,100 C 721.5,100 721.5,36 785,36 L 785,180 L 25,180 Z"
                fill="url(#chart-grad)"
              />

              {/* Trend Line (Curved Cubic Spline) */}
              <path
                d="M 25,84 C 88,84 88,52 151,52 C 214,52 214,84 278,84 C 341.5,84 341.5,120 405,120 C 468.5,120 468.5,68 531,68 C 594.5,68 594.5,100 658,100 C 721.5,100 721.5,36 785,36"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3"
                filter="url(#glow)"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Point Circles */}
              {[
                { x: 25, y: 84 },
                { x: 151, y: 52 },
                { x: 278, y: 84 },
                { x: 405, y: 120 },
                { x: 531, y: 68 },
                { x: 658, y: 100 },
                { x: 785, y: 36 }
              ].map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="var(--primary)"
                  stroke="var(--surface)"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>
        </div>
      </div>

      {showAllAttendance && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={16} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>All Punch-Ins</span>
                <span className="pill pill-slate">{sortedAttendance.length} total</span>
              </div>
              <button
                onClick={() => setShowAllAttendance(false)}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: '6px 10px', borderRadius: 8 }}
              >
                Close
              </button>
            </div>
            <div className="modal-body">
              <div className="att-table-head">
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Login</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Worked</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
              </div>
              <div className="scroll-list modal-scroll">
                {sortedAttendance.length === 0 ? (
                  <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                    No punch-ins recorded today.
                  </div>
                ) : sortedAttendance.map(record => {
                  const { isLate: late, lateByMinutes } = getLateInfo(record.punchIn);
                  const active = !record.punchOut;
                  const worked = calcWorkedTime(record, now);
                  const avatarBg    = late ? '#fff7ed' : active ? '#eff6ff' : '#f1f5f9';
                  const avatarColor = late ? '#c2410c' : active ? '#1d4ed8' : '#475569';
                  return (
                    <div key={`modal-${record._id}`} className="att-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                        <Avatar name={record.staff?.fullName} bg={avatarBg} color={avatarColor} size={32} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {record.staff?.fullName || 'Unknown'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {record.staff?.designation || 'Team Member'}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: late ? '#c2410c' : 'var(--text)' }}>
                        {fmtTime(record.punchIn)}
                        {late && <div style={{ fontSize: 10, color: '#c2410c', fontWeight: 500 }}>Late by {lateByMinutes} min</div>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {worked}
                        {active && (
                          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                        )}
                      </div>
                      <span
                        className={`pill ${active ? 'pill-blue' : late ? 'pill-orange' : 'pill-green'}`}
                        title={late ? `Late by ${fmtLateDuration(lateByMinutes)}` : undefined}
                      >
                        {active ? 'Active' : late ? 'Late' : 'On Time'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showNotActiveModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
          <div
            onClick={() => setShowNotActiveModal(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}
          />
          <div className="panel" style={{ width: '100%', maxWidth: 760, maxHeight: '82vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
            <div className="panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserX size={17} color="#b91c1c" />
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Not Active & Late Team</span>
              </div>
              <button
                onClick={() => setShowNotActiveModal(false)}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not Active: <strong style={{ color: '#b91c1c' }}>{notActiveCount}</strong></span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Late Punch-In: <strong style={{ color: '#c2410c' }}>{latePunchins.length}</strong></span>
            </div>

            <div style={{ maxHeight: '58vh', overflowY: 'auto', padding: '8px 0' }}>
              <div style={{ padding: '0 20px 8px', fontSize: 12, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Not Punched In Today
              </div>
              {notActiveStaff.length === 0 ? (
                <div style={{ padding: '0 20px 14px', fontSize: 13, color: 'var(--text-muted)' }}>All team members have punched in today.</div>
              ) : notActiveStaff.map(person => (
                <div key={person._id} className="punch-row">
                  <Avatar name={person.fullName} bg="#fef2f2" color="#b91c1c" size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {person.fullName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {person.designation || 'Team Member'} {person.employeeId ? `· ${person.employeeId}` : ''}
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ padding: '12px 20px 8px', fontSize: 12, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid var(--border)' }}>
                Late Punch-In Only
              </div>
              {latePunchins.length === 0 ? (
                <div style={{ padding: '0 20px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No late punch-ins today.</div>
              ) : latePunchins.map(record => {
                const { lateByMinutes } = getLateInfo(record.punchIn);
                return (
                  <div key={record._id} className="punch-row">
                    <Avatar name={record.staff?.fullName} bg="#fff7ed" color="#c2410c" size={30} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {record.staff?.fullName || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {fmtTime(record.punchIn)} · Late by {fmtLateDuration(lateByMinutes)}
                      </div>
                    </div>
                    <span className="pill pill-orange">Late</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
          <div
            onClick={() => setShowLeaveModal(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}
          />
          <div className="panel" style={{ width: '100%', maxWidth: 820, maxHeight: '84vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
            <div className="panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={17} color="#d97706" />
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Leave Requests Overview</span>
              </div>
              <button
                onClick={() => setShowLeaveModal(false)}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Approved (Today): <strong style={{ color: '#15803d' }}>{approvedOnLeaveToday.length}</strong></span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pending Approval: <strong style={{ color: '#c2410c' }}>{pendingLeaves.length}</strong></span>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '8px 0' }}>
              <div style={{ padding: '0 20px 8px', fontSize: 12, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pending Approval
              </div>
              {pendingLeaves.length === 0 ? (
                <div style={{ padding: '0 20px 14px', fontSize: 13, color: 'var(--text-muted)' }}>No pending leave requests.</div>
              ) : pendingLeaves.map((leave) => (
                <div key={leave._id} className="punch-row">
                  <Avatar name={leave.staff?.fullName} bg="#fff7ed" color="#c2410c" size={30} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {leave.staff?.fullName || 'Unknown'} {leave.staff?.employeeId ? `· ${leave.staff.employeeId}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {leave.type || 'Leave'} · {new Date(leave.startDate).toLocaleDateString('en-GB')} to {new Date(leave.endDate).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <span className="pill pill-orange">Pending</span>
                </div>
              ))}

              <div style={{ padding: '12px 20px 8px', fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid var(--border)' }}>
                Approved Leave Requests
              </div>
              {approvedOnLeaveToday.length === 0 ? (
                <div style={{ padding: '0 20px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No approved leaves for today.</div>
              ) : approvedOnLeaveToday.map((leave) => (
                <div key={leave._id} className="punch-row">
                  <Avatar name={leave.staff?.fullName} bg="#f0fdf4" color="#15803d" size={30} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {leave.staff?.fullName || 'Unknown'} {leave.staff?.employeeId ? `· ${leave.staff.employeeId}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {leave.type || 'Leave'} · {new Date(leave.startDate).toLocaleDateString('en-GB')} to {new Date(leave.endDate).toLocaleDateString('en-GB')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 2 }}>
                      Reason: {leave.reason || 'No reason provided'}
                    </div>
                  </div>
                  <span className="pill pill-green">Approved</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showActiveModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
          <div
            onClick={() => setShowActiveModal(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}
          />
          <div className="panel" style={{ width: '100%', maxWidth: 760, maxHeight: '82vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
            <div className="panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCheck size={17} color="#1d4ed8" />
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Active Team Today</span>
              </div>
              <button
                onClick={() => setShowActiveModal(false)}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active Count: <strong style={{ color: '#1d4ed8' }}>{activeAttendance.length}</strong></span>
            </div>

            <div style={{ maxHeight: '58vh', overflowY: 'auto', padding: '8px 0' }}>
              {activeAttendance.length === 0 ? (
                <div style={{ padding: '20px', fontSize: 13, color: 'var(--text-muted)' }}>No active team members right now.</div>
              ) : activeAttendance.map((record) => (
                <div key={record._id} className="punch-row">
                  <Avatar name={record.staff?.fullName} bg="#eff6ff" color="#1d4ed8" size={30} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {record.staff?.fullName || 'Unknown'} {record.staff?.employeeId ? `· ${record.staff.employeeId}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Punch-In: {fmtTime(record.punchIn)}
                    </div>
                  </div>
                  <span className="pill pill-blue">
                    {calcWorkedTime(record, now)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </PageShell>
  );
}

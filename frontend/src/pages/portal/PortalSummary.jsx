import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, BarChart3, Clock, AlertCircle, TrendingUp, Award, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../api'
import PageShell, { PageHeader } from '../../components/PageShell'
import { motion } from 'framer-motion'

const styles = `
  .ps-stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:14px; }
  .ps-stat {
    background:var(--surface); border:1px solid var(--border); border-radius:13px;
    padding:18px 16px; display:flex; flex-direction:column; gap:10px;
    transition:box-shadow .18s;
  }
  .ps-stat:hover { box-shadow:0 4px 18px rgba(0,0,0,.08); }
  .ps-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ps-progress-track { height:6px; border-radius:999px; background:var(--border); overflow:hidden; }
  .ps-progress-fill  { height:100%; border-radius:999px; transition:width .6s cubic-bezier(.4,0,.2,1); }
  .ps-day-dot { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; }
`

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const TARGET_HOURS = 40 // 5 days × 8h
const TARGET_DAYS  = 5

export default function PortalSummary() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [summary, setSummary]         = useState(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const id = 'ps-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id; el.innerHTML = styles
      document.head.appendChild(el)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/attendance/weekly?date=${currentWeek.toISOString()}`)
        setSummary(res.data.summary)
      } catch {
        toast.error('Failed to fetch weekly summary')
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [currentWeek])

  const prevWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate()-7); setCurrentWeek(d) }
  const nextWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate()+7); setCurrentWeek(d) }

  const getWeekRange = () => {
    const day = currentWeek.getDay() || 7
    const mon = new Date(currentWeek); mon.setDate(currentWeek.getDate() - day + 1)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return {
      label: `${mon.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – ${sun.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`,
      mon, sun
    }
  }

  const isCurrentWeek = () => {
    const today = new Date()
    const day = today.getDay() || 7
    const mon = new Date(today); mon.setDate(today.getDate() - day + 1)
    const wd = currentWeek.getDay() || 7
    const wmon = new Date(currentWeek); wmon.setDate(currentWeek.getDate() - wd + 1)
    return mon.toDateString() === wmon.toDateString()
  }

  const { label: weekLabel } = getWeekRange()

  const totalHours  = summary?.totalHours  || 0
  const presentDays = summary?.presentDays || 0
  const avgHours    = summary?.avgHours    || 0
  const completedTasks = summary?.completedTasks || 0
  const taskCompletionRate = summary?.taskCompletionRate || 0
  const flagged     = summary?.flaggedCount|| 0

  const hoursProgress = Math.min(100, (totalHours / TARGET_HOURS) * 100)
  const daysProgress  = Math.min(100, (presentDays / TARGET_DAYS) * 100)

  // Efficiency: how close to 8h/day avg
  const efficiency = avgHours > 0 ? Math.min(100, Math.round((avgHours / 8) * 100)) : 0
  const effLabel   = efficiency >= 100 ? 'Excellent' : efficiency >= 80 ? 'Good' : efficiency >= 60 ? 'Average' : 'Below Target'
  const effColor   = efficiency >= 100 ? '#636B2F' : efficiency >= 80 ? '#1d4ed8' : efficiency >= 60 ? '#854d0e' : '#991b1b'
  const effBg      = efficiency >= 100 ? '#e5ebdd' : efficiency >= 80 ? '#eff6ff' : efficiency >= 60 ? '#fefce8' : '#fef2f2'

  return (
    <PageShell narrow>
      <PageHeader
        title="Weekly Performance"
        subtitle="Your productivity snapshot"
        actions={
        <div style={{ display:'flex', alignItems:'center', gap:4, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'3px 8px' }}>
          <button onClick={prevWeek} style={{ border:'none', background:'none', cursor:'pointer', padding:'4px 6px', color:'var(--text)', borderRadius:6 }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', minWidth:170, textAlign:'center' }}>{weekLabel}</span>
          <button onClick={nextWeek} disabled={isCurrentWeek()}
            style={{ border:'none', background:'none', cursor: isCurrentWeek() ? 'default' : 'pointer', padding:'4px 6px', color: isCurrentWeek() ? 'var(--text-light)' : 'var(--text)', opacity: isCurrentWeek() ? .4 : 1, borderRadius:6 }}>
            <ChevronRight size={16} />
          </button>
        </div>
        }
      />

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:64 }}>
          <Loader2 size={32} className="animate-spin" style={{ color:'var(--primary)' }} />
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Hero banner */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
            style={{ background:'var(--primary)', borderRadius:16, padding:'28px 28px 24px', color:'white' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Total Hours This Week</div>
                <div style={{ fontSize:52, fontWeight:900, lineHeight:1, letterSpacing:'-0.03em' }}>
                  {totalHours.toFixed(1)}<span style={{ fontSize:22, opacity:.7 }}>h</span>
                </div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', marginTop:6 }}>
                  Target: {TARGET_HOURS}h/week ({TARGET_DAYS} days × 8h)
                </div>
              </div>
              <div style={{ width:56, height:56, borderRadius:14, background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <BarChart3 size={28} color="white" />
              </div>
            </div>

            {/* Hours progress bar */}
            <div style={{ marginTop:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12, color:'rgba(255,255,255,.6)' }}>
                <span>Progress to weekly goal</span>
                <span style={{ fontWeight:700, color:'white' }}>{Math.round(hoursProgress)}%</span>
              </div>
              <div style={{ height:8, borderRadius:999, background:'rgba(255,255,255,.2)', overflow:'hidden' }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${hoursProgress}%` }} transition={{ duration:.8, ease:'easeOut' }}
                  style={{ height:'100%', borderRadius:999, background: hoursProgress >= 100 ? '#7d8538' : 'rgba(255,255,255,.85)' }} />
              </div>
            </div>

            {/* Sub stats */}
            <div style={{ display:'flex', gap:32, marginTop:20, flexWrap:'wrap' }}>
              {[
                { label:'Days Worked', value:`${presentDays} / 7` },
                { label:'Avg Shift',   value:`${avgHours.toFixed(1)}h` },
                { label:'Tasks Completed', value:`${completedTasks}` },
                { label:'Completion Rate', value:`${taskCompletionRate}%` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:'white', marginTop:2 }}>{value}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Stat cards row */}
          <div className="ps-stat-grid">

            {/* Days worked */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.05 }} className="ps-stat">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div className="ps-icon" style={{ background:'#e5ebdd' }}><TrendingUp size={18} color="#636B2F" /></div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Days Worked</div>
                  <div style={{ fontSize:24, fontWeight:900, color:'var(--text)', lineHeight:1.1 }}>{presentDays}<span style={{ fontSize:14, color:'var(--text-muted)', fontWeight:500 }}> /7</span></div>
                </div>
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', marginBottom:5 }}>
                  <span>Mon – Fri target</span><span style={{ fontWeight:700, color:'var(--text)' }}>{Math.round(daysProgress)}%</span>
                </div>
                <div className="ps-progress-track">
                  <motion.div className="ps-progress-fill" initial={{ width:0 }} animate={{ width:`${daysProgress}%` }} transition={{ duration:.7, delay:.1 }}
                    style={{ background: daysProgress >= 100 ? '#636B2F' : '#636B2F' }} />
                </div>
              </div>
              {/* Day dots */}
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {DAYS.map((d, i) => {
                  const filled = i < presentDays
                  const isWeekend = i >= 5
                  return (
                    <div key={d} className="ps-day-dot"
                      style={{ background: isWeekend ? 'var(--bg)' : filled ? '#e5ebdd' : 'var(--border)', color: isWeekend ? 'var(--text-light)' : filled ? '#636B2F' : 'var(--text-muted)', border: filled ? '1px solid rgba(99, 107, 47, 0.25)' : '1px solid transparent', opacity: isWeekend ? .5 : 1 }}>
                      {d.charAt(0)}
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Avg shift */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }} className="ps-stat">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div className="ps-icon" style={{ background:'#eff6ff' }}><Clock size={18} color="#1d4ed8" /></div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Avg Shift</div>
                  <div style={{ fontSize:24, fontWeight:900, color:'var(--text)', lineHeight:1.1 }}>{avgHours.toFixed(1)}<span style={{ fontSize:14, color:'var(--text-muted)', fontWeight:500 }}>h</span></div>
                </div>
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', marginBottom:5 }}>
                  <span>vs 8h target</span><span style={{ fontWeight:700, color: avgHours >= 8 ? '#636B2F' : 'var(--text)' }}>{avgHours >= 8 ? 'On track' : `${(8 - avgHours).toFixed(1)}h short`}</span>
                </div>
                <div className="ps-progress-track">
                  <motion.div className="ps-progress-fill" initial={{ width:0 }} animate={{ width:`${Math.min(100,(avgHours/8)*100)}%` }} transition={{ duration:.7, delay:.15 }}
                    style={{ background: avgHours >= 8 ? '#636B2F' : '#1d4ed8' }} />
                </div>
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 10px', background:'var(--bg)', borderRadius:8 }}>
                Total: <strong style={{ color:'var(--text)' }}>{totalHours.toFixed(1)}h</strong> logged this week
              </div>
            </motion.div>

            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.15 }} className="ps-stat">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div className="ps-icon" style={{ background:'#e5ebdd' }}><CheckCircle2 size={18} color="#636B2F" /></div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Task Completion</div>
                  <div style={{ fontSize:24, fontWeight:900, color:'var(--text)', lineHeight:1.1 }}>{taskCompletionRate}%</div>
                </div>
              </div>
              <div style={{ marginTop:12 }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>Completed tasks this week</div>
                <div style={{ width:'100%', height:8, borderRadius:999, background:'var(--border)' }}>
                  <motion.div className="ps-progress-fill" initial={{ width:0 }} animate={{ width:`${Math.min(100, taskCompletionRate)}%` }} transition={{ duration:.7, delay:.12 }}
                    style={{ background: taskCompletionRate >= 80 ? '#636B2F' : '#1d4ed8' }} />
                </div>
              </div>
            </motion.div>

            {/* Efficiency */}
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2 }} className="ps-stat">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div className="ps-icon" style={{ background: effBg }}><Award size={18} color={effColor} /></div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Efficiency</div>
                  <div style={{ fontSize:24, fontWeight:900, color: effColor, lineHeight:1.1 }}>{efficiency}<span style={{ fontSize:14, fontWeight:500 }}>%</span></div>
                </div>
              </div>
              <div style={{ padding:'8px 12px', borderRadius:8, background: effBg, fontSize:12, fontWeight:600, color: effColor }}>{effLabel}</div>
              <div>
                <div className="ps-progress-track">
                  <motion.div className="ps-progress-fill" initial={{ width:0 }} animate={{ width:`${efficiency}%` }} transition={{ duration:.7, delay:.22 }}
                    style={{ background: effColor }} />
                </div>
              </div>
            </motion.div>

            {/* Flags */}
            {flagged > 0 && (
              <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.25 }} className="ps-stat"
                style={{ borderColor:'#fecaca', background:'#fef2f2' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div className="ps-icon" style={{ background:'#fee2e2' }}><AlertCircle size={18} color="#dc2626" /></div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#991b1b', textTransform:'uppercase', letterSpacing:'.05em' }}>Flagged</div>
                    <div style={{ fontSize:24, fontWeight:900, color:'#dc2626', lineHeight:1.1 }}>{flagged}</div>
                  </div>
                </div>
                <div style={{ fontSize:12, color:'#991b1b' }}>
                  {flagged === 1 ? '1 record needs review.' : `${flagged} records need review.`}
                </div>
              </motion.div>
            )}
          </div>

          {/* No data fallback */}
          {!summary || (totalHours === 0 && presentDays === 0) ? (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.3 }}
              style={{ padding:40, textAlign:'center', background:'var(--surface)', borderRadius:12, border:'1px dashed var(--border)' }}>
              <BarChart3 size={36} color="var(--text-light)" style={{ marginBottom:10 }} />
              <div style={{ fontWeight:700, color:'var(--text)', marginBottom:4 }}>No data for this week</div>
              <div style={{ color:'var(--text-muted)', fontSize:13 }}>Start punching in to see your weekly summary.</div>
            </motion.div>
          ) : null}
        </div>
      )}
    </PageShell>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { Search, Activity, MoreVertical, ChevronUp, ChevronDown } from 'lucide-react'
import api from '../api'
import { motion } from 'framer-motion'

function initials(name = '') {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function TeamPerformance() {
  const navigate = useNavigate()
  const [staffList, setStaffList] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [sortField, setSortField] = useState('fullName')
  const [sortOrder, setSortOrder] = useState('asc')

  useEffect(() => {
    const fetchStaffList = async () => {
      try {
        const res = await api.get('/attendance/admin/staff-list')
        setStaffList(res.data.data || [])
      } catch (err) {
        console.error('Failed to fetch staff list:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStaffList()
  }, [])

  useEffect(() => {
    if (activeMenuId === null) return
    const handleClose = () => setActiveMenuId(null)
    window.addEventListener('click', handleClose)
    return () => window.removeEventListener('click', handleClose)
  }, [activeMenuId])

  const displayStaff = useMemo(() => {
    let result = [...staffList]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(staff =>
        staff.fullName?.toLowerCase().includes(query) ||
        staff.employeeId?.toLowerCase().includes(query) ||
        staff.designation?.toLowerCase().includes(query) ||
        staff.department?.toLowerCase().includes(query)
      )
    }

    result.sort((a, b) => {
      let valA = a[sortField] ?? ''
      let valB = b[sortField] ?? ''

      if (sortField === 'performanceScore') {
        valA = Number(valA) || 0
        valB = Number(valB) || 0
      } else {
        valA = String(valA).toLowerCase()
        valB = String(valB).toLowerCase()
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [staffList, searchQuery, sortField, sortOrder])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  return (
    <PageShell style={{ maxWidth: 'none' }}>
      <style>{`
        /* ── Team Performance ─────────────────────────────── */
        .tp-search-wrap { position: relative; max-width: 280px; }
        .tp-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: var(--text-light); pointer-events: none;
        }
        .tp-search-input {
          width: 100%; height: 32px;
          padding-left: 36px; padding-right: 12px;
          border: 1.5px solid var(--border); border-radius: 8px;
          background: var(--surface); color: var(--text);
          font-size: 12px; font-weight: 600; outline: none;
          transition: border-color .2s, box-shadow .2s; box-sizing: border-box;
          font-family: var(--font-display), sans-serif;
        }
        .tp-search-input:focus {
          border-color: var(--primary);
        }

        /* Table container */
        .tp-table {
          width: 100%; border: 1px solid var(--border);
          border-radius: 12px; overflow: visible;
          background: var(--surface); margin-top: 14px;
          font-family: var(--font-display), sans-serif;
        }

        /* Grid: avatar | name | id | role | dept | score | action */
        .tp-grid {
          display: grid;
          grid-template-columns: 40px minmax(140px,2fr) minmax(90px,0.8fr) minmax(120px,1.2fr) minmax(100px,0.9fr) minmax(90px,0.8fr) 90px;
          align-items: center;
          padding: 0 20px;
          gap: 0 16px;
        }
        .tp-thead-row {
          padding-top: 8px; padding-bottom: 8px;
          background: var(--bg);
          border-bottom: 1.5px solid var(--border);
        }
        .tp-th {
          font-size: 10px; font-weight: 800;
          color: var(--text-muted); text-transform: uppercase; letter-spacing: .07em;
        }
        .tp-th:last-child { text-align: right; }

        .tp-data-row {
          padding-top: 8px; padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
          transition: background .12s;
        }
        .tp-data-row:last-child { border-bottom: none; }
        .tp-data-row:hover { background: rgba(0,0,0,.018); }
        :root[data-theme='dark'] .tp-data-row:hover { background: rgba(255,255,255,.03); }

        /* Avatar */
        .tp-avatar {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; color: #fff; flex-shrink: 0;
        }

        /* Cells */
        .tp-name {
          font-size: 12px; font-weight: 600; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .tp-cell {
          font-size: 10.5px; font-weight: 500; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* Action */
        .tp-action-col { display: flex; justify-content: flex-end; align-items: center; }
        .tp-view-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; font-size: 12px; font-weight: 700;
          border-radius: 7px; white-space: nowrap; cursor: pointer;
          background: color-mix(in srgb, var(--primary) 10%, transparent);
          color: var(--primary);
          border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
          transition: all .15s;
        }
        .tp-view-btn:hover {
          background: var(--primary); color: #fff; border-color: var(--primary);
          transform: translateX(1px);
        }

        /* Mobile */
        @media (max-width: 860px) {
          .tp-thead-row { display: none; }
          .tp-grid {
            grid-template-columns: 40px 1fr auto;
            grid-template-rows: auto auto;
            gap: 4px 10px; padding: 12px 16px;
          }
          .tp-avatar { grid-row: 1 / 3; }
          .tp-name { grid-column: 2; grid-row: 1; }
          .tp-action-col { grid-column: 3; grid-row: 1 / 3; }
          .tp-mobile-meta {
            grid-column: 2; grid-row: 2;
            display: flex; flex-wrap: wrap; gap: 5px;
          }
          .tp-col-id, .tp-col-role, .tp-col-dept, .tp-col-score { display: none; }
          .tp-tag {
            font-size: 10px; font-weight: 600; color: var(--text-muted);
            background: var(--bg); border: 1px solid var(--border);
            border-radius: 4px; padding: 1px 6px;
          }
        }
        @media (min-width: 861px) { .tp-mobile-meta { display: none; } }
      `}</style>

      {/* Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <div className="tp-search-wrap" style={{ marginTop: 0 }}>
          <Search size={14} className="tp-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search team..."
            className="tp-search-input"
          />
        </div>
      </div>

      {/* ── Table ── */}
      {loading && displayStaff.length === 0 ? (
        <div className="tp-table" style={{ overflow: 'visible' }}>
          <div className="tp-grid tp-thead-row">
            <div />
            <div className="tp-th">Employee</div>
            <div className="tp-th tp-col-id">Employee ID</div>
            <div className="tp-th tp-col-role">Job Role</div>
            <div className="tp-th tp-col-dept">Department</div>
            <div className="tp-th tp-col-score">Performance</div>
            <div className="tp-th" style={{ textAlign: 'left' }}>Action</div>
          </div>
          {Array(5).fill(0).map((_, i) => (
            <div className="tp-grid tp-data-row" key={`skel-${i}`}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: 120, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: 60, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: 90, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: 80, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: 40, height: 14, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.5s infinite', marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      ) : displayStaff.length === 0 ? (
        <div style={{
          marginTop: 24, padding: 48, textAlign: 'center',
          background: 'var(--bg)', borderRadius: 12,
          color: 'var(--text-muted)', border: '1px dashed var(--border)'
        }}>
          {searchQuery ? 'No employees found matching your search.' : 'No team members found.'}
        </div>
      ) : (
        <div className="tp-table" style={{ overflow: 'visible' }}>

          {/* Column Headers */}
          <div className="tp-grid tp-thead-row">
            <div />
            <div 
              className="tp-th" 
              onClick={() => handleSort('fullName')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Employee {sortField === 'fullName' && (sortOrder === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
            </div>
            <div 
              className="tp-th tp-col-id" 
              onClick={() => handleSort('employeeId')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Employee ID {sortField === 'employeeId' && (sortOrder === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
            </div>
            <div 
              className="tp-th tp-col-role" 
              onClick={() => handleSort('designation')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Job Role {sortField === 'designation' && (sortOrder === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
            </div>
            <div 
              className="tp-th tp-col-dept" 
              onClick={() => handleSort('department')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Department {sortField === 'department' && (sortOrder === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
            </div>
            <div 
              className="tp-th tp-col-score" 
              onClick={() => handleSort('performanceScore')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Performance {sortField === 'performanceScore' && (sortOrder === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
            </div>
            <div className="tp-th" style={{ textAlign: 'left' }}>Action</div>
          </div>

          {/* Rows */}
          {displayStaff.map((staff, index) => (
            <motion.div 
              className="tp-grid tp-data-row" 
              key={staff._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >

              {staff.documents?.profileImage?.url ? (
                <img
                  src={staff.documents.profileImage.url}
                  alt={staff.fullName}
                  className="tp-avatar"
                  style={{ objectFit: 'cover', borderRadius: '50%', width: 40, height: 40 }}
                />
              ) : (
                <div
                  className="tp-avatar"
                  style={{ background: staff.type === 'Intern' ? '#1e40af' : 'var(--primary)' }}
                >
                  {initials(staff.fullName)}
                </div>
              )}

              <div 
                className="tp-name hover-primary"
                onClick={() => navigate(`/performance/${staff._id}`)}
                style={{ cursor: 'pointer', transition: 'color 0.15s' }}
                title="View Performance Detail"
              >
                {staff.fullName}
              </div>

              <div className="tp-cell tp-col-id" style={{ textAlign: 'left' }}>{staff.employeeId || '—'}</div>
              <div className="tp-cell tp-col-role" style={{ textAlign: 'left' }}>{staff.designation || '—'}</div>
              <div className="tp-cell tp-col-dept" style={{ textAlign: 'left' }}>{staff.department || '—'}</div>
              <div className="tp-cell tp-col-score" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 11, textAlign: 'left' }}>
                {staff.performanceScore > 0 ? `${staff.performanceScore}%` : '—'}
              </div>

              {/* Mobile collapsed meta */}
              <div className="tp-mobile-meta">
                {staff.employeeId  && <span className="tp-tag">{staff.employeeId}</span>}
                {staff.designation && <span className="tp-tag">{staff.designation}</span>}
                {staff.department  && <span className="tp-tag">{staff.department}</span>}
                {staff.performanceScore > 0 && <span className="tp-tag" style={{ color: 'var(--primary)', fontWeight: 700 }}>Perf: {staff.performanceScore}%</span>}
              </div>

              <div className="tp-action-col" style={{ position: 'relative', justifyContent: 'flex-start' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMenuId(activeMenuId === staff._id ? null : staff._id)
                  }}
                  className="btn-icon btn-hover"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    color: 'var(--text-light)',
                    background: 'transparent',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Actions"
                >
                  <MoreVertical size={14} />
                </button>
                      {activeMenuId === staff._id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '80%',
                          width: 160,
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          boxShadow: 'var(--shadow-lg)',
                          zIndex: 120,
                          overflow: 'hidden',
                          padding: '4px 0'
                        }}>
                          <button
                            onClick={() => navigate(`/performance/${staff._id}`)}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'background 0.15s'
                            }}
                          >
                            📈 View Details
                          </button>
                        </div>
                      )}
              </div>

            </motion.div>
          ))}
        </div>
      )}
    </PageShell>
  )
}

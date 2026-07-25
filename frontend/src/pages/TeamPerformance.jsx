import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell, { PageLoading } from '../components/PageShell'
import { Search, Activity, MoreVertical } from 'lucide-react'
import api from '../api'

function initials(name = '') {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function TeamPerformance() {
  const navigate = useNavigate()
  const [staffList, setStaffList] = useState([])
  const [filteredStaff, setFilteredStaff] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeMenuId, setActiveMenuId] = useState(null)

  useEffect(() => {
    const fetchStaffList = async () => {
      try {
        const res = await api.get('/attendance/admin/staff-list')
        setStaffList(res.data.data || [])
        setFilteredStaff(res.data.data || [])
      } catch (err) {
        console.error('Failed to fetch staff list:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStaffList()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStaff(staffList)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredStaff(
        staffList.filter(staff =>
          staff.fullName?.toLowerCase().includes(query) ||
          staff.employeeId?.toLowerCase().includes(query) ||
          staff.designation?.toLowerCase().includes(query) ||
          staff.department?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, staffList])

  useEffect(() => {
    if (activeMenuId === null) return
    const handleClose = () => setActiveMenuId(null)
    window.addEventListener('click', handleClose)
    return () => window.removeEventListener('click', handleClose)
  }, [activeMenuId])

  if (loading) return <PageShell><PageLoading label="Loading team…" /></PageShell>

  return (
    <PageShell wide>
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

        /* Grid: avatar | name | id | role | dept | action */
        .tp-grid {
          display: grid;
          grid-template-columns: 40px minmax(140px,2fr) minmax(110px,1fr) minmax(140px,1.5fr) minmax(110px,1fr) 90px;
          align-items: center;
          padding: 0 20px;
          gap: 0 16px;
        }
        .tp-thead-row {
          padding-top: 10px; padding-bottom: 10px;
          background: var(--bg);
          border-bottom: 1.5px solid var(--border);
        }
        .tp-th {
          font-size: 10px; font-weight: 800;
          color: var(--text-muted); text-transform: uppercase; letter-spacing: .07em;
        }
        .tp-th:last-child { text-align: right; }

        .tp-data-row {
          padding-top: 12px; padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
          transition: background .12s;
        }
        .tp-data-row:last-child { border-bottom: none; }
        .tp-data-row:hover { background: rgba(0,0,0,.018); }
        :root[data-theme='dark'] .tp-data-row:hover { background: rgba(255,255,255,.03); }

        /* Avatar */
        .tp-avatar {
          width: 36px; height: 36px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0;
        }

        /* Cells */
        .tp-name {
          font-size: 14px; font-weight: 700; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .tp-cell {
          font-size: 13px; font-weight: 500; color: var(--text);
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
          .tp-col-id, .tp-col-role, .tp-col-dept { display: none; }
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
      {filteredStaff.length === 0 ? (
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
            <div className="tp-th">Employee</div>
            <div className="tp-th tp-col-id">Employee ID</div>
            <div className="tp-th tp-col-role">Job Role</div>
            <div className="tp-th tp-col-dept">Department</div>
            <div className="tp-th" style={{ textAlign: 'right' }}>Action</div>
          </div>

          {/* Rows */}
          {filteredStaff.map(staff => (
            <div className="tp-grid tp-data-row" key={staff._id}>

              <div
                className="tp-avatar"
                style={{ background: staff.type === 'Intern' ? '#1e40af' : 'var(--primary)' }}
              >
                {initials(staff.fullName)}
              </div>

              <div className="tp-name">{staff.fullName}</div>

              <div className="tp-cell tp-col-id">{staff.employeeId || '—'}</div>
              <div className="tp-cell tp-col-role">{staff.designation || '—'}</div>
              <div className="tp-cell tp-col-dept">{staff.department || '—'}</div>

              {/* Mobile collapsed meta */}
              <div className="tp-mobile-meta">
                {staff.employeeId  && <span className="tp-tag">{staff.employeeId}</span>}
                {staff.designation && <span className="tp-tag">{staff.designation}</span>}
                {staff.department  && <span className="tp-tag">{staff.department}</span>}
              </div>

              <div className="tp-action-col" style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMenuId(activeMenuId === staff._id ? null : staff._id)
                  }}
                  className="btn-icon btn-hover"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
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

            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}

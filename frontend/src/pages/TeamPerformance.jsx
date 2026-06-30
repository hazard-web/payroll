import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell, { PageHeader, PageLoading } from '../components/PageShell'
import { Search } from 'lucide-react'
import api from '../api'


function initials(name = '') {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/* Tiny labelled detail pill used for ID / Role / Department */
function MetaCell({ label, value }) {
  return (
    <div className="tp-meta-cell">
      <span className="tp-meta-cell__label">{label}</span>
      <span className="tp-meta-cell__value">{value || 'N/A'}</span>
    </div>
  )
}

export default function TeamPerformance() {
  const navigate = useNavigate()
  const [staffList, setStaffList] = useState([])
  const [filteredStaff, setFilteredStaff] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

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

  if (loading) return <PageShell><PageLoading label="Loading team…" /></PageShell>

  return (
    <PageShell wide>
      <style>{`
        /* ── Team Performance table styles ───────────────────────── */
        .tp-search-wrap { position: relative; max-width: 480px; margin-bottom: 20px; }
        .tp-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }

        .tp-table { width: 100%; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--surface); }

        /* Header row */
        .tp-thead {
          display: grid;
          grid-template-columns: 48px 1fr 140px 180px 160px 148px;
          gap: 0;
          padding: 10px 20px;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          align-items: center;
        }
        .tp-th {
          font-size: 10px; font-weight: 700;
          color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em;
        }
        .tp-th:last-child { text-align: right; }

        /* Data row */
        .tp-row {
          display: grid;
          grid-template-columns: 48px 1fr 140px 180px 160px 148px;
          gap: 0;
          padding: 12px 20px;
          align-items: center;
          border-bottom: 1px solid var(--border);
          transition: background .12s;
        }
        .tp-row:last-child { border-bottom: none; }
        .tp-row:hover { background: rgba(0,0,0,.018); }

        /* Avatar */
        .tp-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: #fff;
          flex-shrink: 0; letter-spacing: -.01em;
        }

        /* Name column */
        .tp-name {
          font-size: 14px; font-weight: 700; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          padding-right: 12px;
        }

        /* Meta cell (ID / Role / Dept) */
        .tp-meta-cell { display: flex; flex-direction: column; gap: 2px; padding-right: 12px; }
        .tp-meta-cell__label {
          font-size: 9px; font-weight: 700; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: .05em; line-height: 1;
        }
        .tp-meta-cell__value {
          font-size: 12px; font-weight: 600; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* Action column */
        .tp-action { display: flex; justify-content: flex-end; align-items: center; }

        /* ── Responsive ─────────────────────────────────── */
        @media (max-width: 900px) {
          .tp-thead { display: none; }
          .tp-row {
            grid-template-columns: 44px 1fr auto;
            grid-template-rows: auto auto;
            gap: 4px 10px;
            padding: 14px 16px;
          }
          .tp-avatar { grid-row: 1 / 3; }
          .tp-name   { grid-column: 2; grid-row: 1; font-size: 13px; }
          .tp-action { grid-column: 3; grid-row: 1 / 3; }
          .tp-mobile-meta {
            grid-column: 2; grid-row: 2;
            display: flex; flex-wrap: wrap; gap: 8px;
          }
          /* Hide individual meta cells on mobile – we use tp-mobile-meta instead */
          .tp-col-id, .tp-col-role, .tp-col-dept { display: none; }
        }
        @media (min-width: 901px) {
          .tp-mobile-meta { display: none; }
        }
      `}</style>

      <PageHeader
        title="Team Performance"
        subtitle="View task performance and history for your team members."
      />

      {/* Search */}
      <div className="tp-search-wrap">
        <Search size={16} className="tp-search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, ID, role or department…"
          className="input-field"
          style={{ paddingLeft: 44, width: '100%' }}
        />
      </div>

      {filteredStaff.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center', background: 'var(--bg)',
          borderRadius: 12, color: 'var(--text-muted)', border: '1px dashed var(--border)'
        }}>
          {searchQuery ? 'No employees found matching your search.' : 'No team members found.'}
        </div>
      ) : (
        <div className="tp-table">
          {/* Desktop header */}
          <div className="tp-thead">
            <div />
            <div className="tp-th">Employee</div>
            <div className="tp-th">Employee ID</div>
            <div className="tp-th">Job Role</div>
            <div className="tp-th">Department</div>
            <div className="tp-th" style={{ textAlign: 'right' }}>Action</div>
          </div>

          {/* Rows */}
          {filteredStaff.map(staff => {
            const inits = initials(staff.fullName)
            return (
              <div className="tp-row" key={staff._id}>

                {/* Avatar */}
                <div className="tp-avatar" style={{ background: staff.type === 'Intern' ? '#1e40af' : 'var(--primary)' }}>{inits}</div>

                {/* Name */}
                <div className="tp-name">{staff.fullName}</div>

                {/* Employee ID — hidden on mobile */}
                <div className="tp-meta-cell tp-col-id">
                  <span className="tp-meta-cell__value">{staff.employeeId || 'N/A'}</span>
                </div>

                {/* Job Role — hidden on mobile */}
                <div className="tp-meta-cell tp-col-role">
                  <span className="tp-meta-cell__value">{staff.designation || 'N/A'}</span>
                </div>

                {/* Department — hidden on mobile */}
                <div className="tp-meta-cell tp-col-dept">
                  <span className="tp-meta-cell__value">{staff.department || 'N/A'}</span>
                </div>

                {/* Mobile collapsed meta row */}
                <div className="tp-mobile-meta">
                  <MetaCell label="ID" value={staff.employeeId} />
                  <MetaCell label="Role" value={staff.designation} />
                  <MetaCell label="Dept" value={staff.department} />
                </div>

                {/* Action */}
                <div className="tp-action">
                  <button
                    onClick={() => navigate(`/performance/${staff._id}`)}
                    className="btn-primary btn-sm"
                    style={{ padding: '7px 14px', fontSize: 12, whiteSpace: 'nowrap' }}
                  >
                    View Performance
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}

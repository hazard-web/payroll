import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell, { PageHeader, PageLoading } from '../components/PageShell'
import { Search } from 'lucide-react'
import api from '../api'

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
      const filtered = staffList.filter(staff =>
        staff.fullName?.toLowerCase().includes(query)
      )
      setFilteredStaff(filtered)
    }
  }, [searchQuery, staffList])

  if (loading) return <PageShell><PageLoading label="Loading team…" /></PageShell>

  return (
    <PageShell fullWidth>
      <PageHeader
        title="Team Performance"
        subtitle="View task performance and history for your team members."
      />

      {/* Search bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee by name..."
            className="input-field"
            style={{ paddingLeft: 46, width: '100%' }}
          />
        </div>
      </div>

      {filteredStaff.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            background: 'var(--bg)',
            borderRadius: 12,
            color: 'var(--text-muted)',
          }}
        >
          {searchQuery
            ? 'No employees found matching your search.'
            : 'No team members found.'}
        </div>
      ) : (
        <div className="tp-employee-list">
          {filteredStaff.map(staff => (
            <div key={staff._id} className="tp-employee-row">
              {/* Left — name + meta */}
              <div className="tp-employee-info">
                <div className="tp-employee-name">{staff.fullName}</div>

                <div className="tp-employee-meta">
                  <span className="tp-meta-item">
                    <span className="tp-meta-label">Employee ID</span>
                    <span className="tp-meta-value">
                      {staff.employeeId || 'N/A'}
                    </span>
                  </span>

                  <span className="tp-meta-sep" aria-hidden="true">·</span>

                  <span className="tp-meta-item">
                    <span className="tp-meta-label">Job Role</span>
                    <span className="tp-meta-value">
                      {staff.designation || 'N/A'}
                    </span>
                  </span>

                  <span className="tp-meta-sep" aria-hidden="true">·</span>

                  <span className="tp-meta-item">
                    <span className="tp-meta-label">Department</span>
                    <span className="tp-meta-value">
                      {staff.department || 'N/A'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Right — action button */}
              <div className="tp-employee-action">
                <button
                  onClick={() => navigate(`/performance/${staff._id}`)}
                  className="btn-primary btn-sm"
                  style={{ padding: '8px 16px', fontSize: 13, whiteSpace: 'nowrap' }}
                >
                  View Performance
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}

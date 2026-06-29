import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell, { PageHeader, PageLoading } from '../components/PageShell'
import { Avatar, EmptyState } from '../components/UI'
import { Eye, Loader2, Search } from 'lucide-react'
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
    <PageShell>
      <PageHeader
        title="Team Performance"
        subtitle="View task performance and history for your team members."
      />

      <div style={{ maxWidth: 600, marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
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
        <div style={{
          padding: 48,
          textAlign: 'center',
          background: 'var(--bg)',
          borderRadius: 12,
          color: 'var(--text-muted)'
        }}>
          {searchQuery ? 'No employees found matching your search.' : 'No team members found.'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
        }}>
          {filteredStaff.map(staff => (
            <div
              key={staff._id}
              style={{
                padding: 16,
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <Avatar
                  name={staff.fullName}
                  style={{ width: 42, height: 42, borderRadius: 12, fontSize: 15 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {staff.fullName}
                  </div>
                  {staff.designation && (
                    <div style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {staff.designation}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/performance/${staff._id}`)}
                className="btn-primary btn-sm"
                style={{ padding: '8px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
              >
                <Eye size={14} /> View
              </button>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}

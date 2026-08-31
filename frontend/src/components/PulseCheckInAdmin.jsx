import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { App, Button, Card, Empty, Table, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import api from '../api'

function hoursLabel(ms) {
  const safe = Math.max(0, Number(ms) || 0)
  const h = Math.floor(safe / 3_600_000)
  const m = Math.floor((safe % 3_600_000) / 60_000)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

function locationLabel(loc) {
  if (!loc) return '—'
  const parts = [loc.sector, loc.city, loc.state].filter(Boolean)
  if (parts.length) return parts.join(', ')
  if (Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
    return `${Number(loc.lat).toFixed(4)}, ${Number(loc.lng).toFixed(4)}`
  }
  return '—'
}

function eventTag(type) {
  switch (type) {
    case 'CHECK_IN':
    case 'RESUME':
      return <Tag color="success">{type === 'RESUME' ? 'Resume' : 'Check-in'}</Tag>
    case 'CHECK_OUT':
      return <Tag color="warning">Check-out</Tag>
    case 'MIDNIGHT_CLOSE':
      return <Tag color="processing">Timesheet close</Tag>
    case 'TARGET_REACHED':
      return <Tag color="blue">9h target</Tag>
    default:
      return <Tag>{type || 'Event'}</Tag>
  }
}

/** Pulse Organization: org-wide check-in activity — Ant Design. */
export default function PulseCheckInAdmin() {
  const { message } = App.useApp()
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/pulse-checkin/admin/days', { params: { limit: 40 } })
      setDays(res.data?.data || [])
    } catch (err) {
      setDays([])
      const status = err?.response?.status
      const msg =
        status === 404
          ? 'API not found — restart the backend (port 5001).'
          : status === 401
            ? 'Session expired — sign in again.'
            : status === 403
              ? 'Admin access required'
              : err?.response?.data?.message || 'Could not load check-in activity'
      message.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 120,
      render: (v) => v || '—',
    },
    {
      title: 'Person',
      dataIndex: 'email',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (v) => {
        const color = v === 'active' ? 'success' : v === 'closed' ? 'processing' : 'default'
        return <Tag color={color}>{v || 'idle'}</Tag>
      },
    },
    {
      title: 'Worked',
      dataIndex: 'totalActiveMs',
      width: 110,
      render: (ms, row) =>
        row.timesheetHours != null && row.timesheetLogged ? `${row.timesheetHours}h` : hoursLabel(ms),
    },
    {
      title: 'Timesheet',
      dataIndex: 'timesheetLogged',
      width: 110,
      render: (v) => (v ? <Tag color="green">Logged</Tag> : <Tag>Open</Tag>),
    },
    {
      title: 'Events',
      key: 'events',
      width: 80,
      render: (_, row) => row.events?.length || 0,
    },
  ]

  const expandedRowRender = (row) => {
    const events = [...(row.events || [])].reverse()
    if (!events.length) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No events yet" />
    }
    return (
      <Table
        size="small"
        pagination={false}
        rowKey={(e) => e._id || `${e.type}-${e.at}`}
        dataSource={events}
        columns={[
          {
            title: 'When',
            dataIndex: 'at',
            width: 170,
            render: (v) => (v ? format(new Date(v), 'd MMM · h:mm a') : '—'),
          },
          {
            title: 'Activity',
            dataIndex: 'type',
            width: 140,
            render: (v) => eventTag(v),
          },
          {
            title: 'Timer at event',
            dataIndex: 'activeMsAtEvent',
            width: 120,
            render: (ms) => hoursLabel(ms),
          },
          {
            title: 'IP',
            dataIndex: 'ip',
            width: 130,
            render: (v) => v || '—',
          },
          {
            title: 'Location',
            key: 'loc',
            render: (_, e) => locationLabel(e.location),
          },
        ]}
      />
    )
  }

  return (
    <Card
      size="small"
      className="pulse-org-card"
      title="Check-in activity"
      extra={
        <Button type="text" icon={<ReloadOutlined />} onClick={load} loading={loading} aria-label="Refresh" />
      }
    >
      <Table
        size="small"
        loading={loading}
        rowKey={(row) => row._id || `${row.email}-${row.date}`}
        dataSource={days}
        columns={columns}
        pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
        expandable={{ expandedRowRender }}
        scroll={{ x: 720 }}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No check-in activity yet" />,
        }}
      />
    </Card>
  )
}

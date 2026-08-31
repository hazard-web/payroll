import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  App,
  Button,
  Checkbox,
  Drawer,
  Dropdown,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popover,
  Select,
  Space,
  Table,
  Tag,
} from 'antd'
import {
  DownOutlined,
  ExpandOutlined,
  FileDoneOutlined,
  FilterOutlined,
  ImportOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import api from '../api'
import PulseCandidateForm, {
  DEPARTMENTS,
  LOCATIONS,
  emptyCandidate,
  payloadFromValues,
  valuesFromCandidate,
} from './PulseCandidateForm'
import './pulse-onboarding.css'

const ALL_COLUMNS = [
  { key: 'firstName', title: 'First name' },
  { key: 'lastName', title: 'Last name' },
  { key: 'email', title: 'Email ID' },
  { key: 'officialEmail', title: 'Official Email' },
  { key: 'status', title: 'Onboarding Status' },
  { key: 'department', title: 'Department' },
  { key: 'sourceOfHire', title: 'Source of Hire' },
  { key: 'pan', title: 'PAN card number' },
  { key: 'aadhaar', title: 'Aadhaar card number' },
  { key: 'uan', title: 'UAN number' },
  { key: 'phone', title: 'Phone' },
  { key: 'workLocation', title: 'Location' },
  { key: 'title', title: 'Title' },
  { key: 'experienceYears', title: 'Experience' },
  { key: 'skillSet', title: 'Skill Set' },
  { key: 'highestQualification', title: 'Highest Qualification' },
  { key: 'currentSalary', title: 'Current Salary' },
  { key: 'additionalInfo', title: 'Additional information' },
  { key: 'tentativeJoiningDate', title: 'Tentative Joining Date' },
  { key: 'candidateId', title: 'Candidate ID' },
]

const LOCKED_KEYS = ['firstName', 'lastName', 'email']
const OPTIONAL_COLUMNS = ALL_COLUMNS.filter((col) => !LOCKED_KEYS.includes(col.key))
const ALL_ON = Object.fromEntries(ALL_COLUMNS.map((col) => [col.key, true]))

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Reportees + My Data' },
  { value: 'reportees', label: "Reportees' Data" },
  { value: 'direct', label: "Direct Reportees' Data" },
  { value: 'mine', label: 'My Data' },
]

const STATUS_COLOR = {
  Draft: 'default',
  'Not started': 'gold',
  'In progress': 'blue',
  'Offer sent': 'cyan',
  Joined: 'green',
  Withdrawn: 'red',
}

function dash(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return value
    }
  }
  return value
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, ''))
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim())
    const row = {}
    headers.forEach((h, i) => {
      row[h] = cells[i] || ''
    })
    return {
      firstName: row.firstname || row.first || '',
      lastName: row.lastname || row.last || '',
      email: row.email || row.emailid || '',
      officialEmail: row.officialemail || '',
      phone: row.phone || row.mobile || '',
      department: row.department || '',
      sourceOfHire: row.sourceofhire || row.source || '',
      workLocation: row.location || row.worklocation || '',
    }
  }).filter((row) => row.email || (row.firstName && row.lastName))
}

function EmptyArt() {
  return (
    <div className="ob-empty-art" aria-hidden="true">
      <div className="ob-empty-tray">
        <span className="ob-empty-lid" />
        <span className="ob-empty-mark" />
      </div>
    </div>
  )
}

export default function PulseOnboarding() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [wide, setWide] = useState(false)
  const [scope, setScope] = useState('all')
  const [query, setQuery] = useState('')
  const [draftFilters, setDraftFilters] = useState({ employee: '', department: 'all', location: 'all' })
  const [applied, setApplied] = useState({ employee: '', department: 'all', location: 'all' })
  const [visible, setVisible] = useState(ALL_ON)
  const [draftVisible, setDraftVisible] = useState(ALL_ON)
  const [viewQuery, setViewQuery] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/candidates', {
        params: {
          q: applied.employee || query || undefined,
          department: applied.department,
          location: applied.location,
          scope: scope === 'mine' ? 'mine' : 'all',
        },
      })
      setRows(res.data?.data?.candidates || [])
      setSelectedRowKeys([])
    } catch (err) {
      setRows([])
      message.error(err?.response?.data?.message || 'Could not load candidates')
    } finally {
      setLoading(false)
    }
  }, [applied, query, scope, message])

  useEffect(() => {
    load()
  }, [load])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue(emptyCandidate)
    setOpen(true)
  }

  const openEdit = async (record) => {
    setEditing(record)
    setOpen(true)
    try {
      const res = await api.get(`/candidates/${record._id}`)
      form.setFieldsValue(valuesFromCandidate(res.data?.data || record))
    } catch {
      form.setFieldsValue(valuesFromCandidate(record))
    }
  }

  const save = async ({ draft, andNew }) => {
    try {
      if (!draft) await form.validateFields(['email', 'phone', 'firstName', 'lastName'])
      const values = form.getFieldsValue(true)
      const payload = payloadFromValues(values, { draft })
      setSaving(true)
      if (editing?._id) {
        await api.patch(`/candidates/${editing._id}`, payload)
        message.success(draft ? 'Draft saved' : 'Candidate updated')
      } else {
        await api.post('/candidates', payload)
        message.success(draft ? 'Draft saved' : 'Candidate added')
      }
      if (andNew) {
        setEditing(null)
        form.resetFields()
        form.setFieldsValue(emptyCandidate)
      } else {
        setOpen(false)
        setEditing(null)
      }
      await load()
    } catch (err) {
      if (err?.errorFields) return
      message.error(err?.response?.data?.message || err.message || 'Could not save candidate')
    } finally {
      setSaving(false)
    }
  }

  const importCsv = async (file) => {
    try {
      const text = await file.text()
      const parsed = parseCsv(text)
      if (!parsed.length) {
        message.error('No rows found. Use a CSV with first name, last name, email, and phone.')
        return
      }
      setSaving(true)
      let ok = 0
      for (const row of parsed) {
        if (!row.email || !row.firstName || !row.lastName || !row.phone) continue
        await api.post('/candidates', { ...row, countryCode: '+91' })
        ok += 1
      }
      message.success(ok ? `${ok} candidate${ok === 1 ? '' : 's'} imported` : 'No complete rows to import')
      await load()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Could not import file')
    } finally {
      setSaving(false)
    }
  }

  const statusFilters = useMemo(
    () => [...new Set(rows.map((r) => r.status).filter(Boolean))].map((s) => ({ text: s, value: s })),
    [rows],
  )

  const fieldList = OPTIONAL_COLUMNS.filter((col) => col.title.toLowerCase().includes(viewQuery.trim().toLowerCase()))

  const closeViewEdit = () => {
    setViewOpen(false)
    setViewQuery('')
    setDraftVisible({ ...visible, firstName: true, lastName: true, email: true })
  }

  const saveViewEdit = () => {
    setVisible({ ...draftVisible, firstName: true, lastName: true, email: true })
    setViewOpen(false)
    setViewQuery('')
  }

  const toggleColumn = (key, checked) => {
    if (LOCKED_KEYS.includes(key)) return
    setDraftVisible((prev) => ({ ...prev, [key]: checked, firstName: true, lastName: true, email: true }))
  }

  const columnPicker = (
    <Popover
      trigger="click"
      open={viewOpen}
      onOpenChange={(next) => {
        if (next) {
          setDraftVisible({ ...visible, firstName: true, lastName: true, email: true })
          setViewQuery('')
        }
        setViewOpen(next)
      }}
      placement="bottomLeft"
      arrow={false}
      overlayClassName="ob-view-pop"
      styles={{ body: { padding: 0 } }}
      content={
        <div className="ob-view-panel">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search"
            value={viewQuery}
            onChange={(e) => setViewQuery(e.target.value)}
          />
          <div className="ob-view-list">
            {fieldList.length === 0 ? (
              <p className="ob-view-empty">No matching columns</p>
            ) : (
              fieldList.map((col) => (
                <label key={col.key} className="ob-view-item">
                  <Checkbox
                    checked={Boolean(draftVisible[col.key])}
                    onChange={(e) => toggleColumn(col.key, e.target.checked)}
                  />
                  <span>{col.title}</span>
                </label>
              ))
            )}
          </div>
          <div className="ob-view-foot">
            <Button type="primary" onClick={saveViewEdit}>Save</Button>
            <Button onClick={closeViewEdit}>Cancel</Button>
          </div>
        </div>
      }
    >
      <button type="button" className="ob-col-picker" aria-label="Choose columns" onClick={(e) => e.stopPropagation()}>
        <FileDoneOutlined />
      </button>
    </Popover>
  )

  const rowIds = rows.map((row) => row._id)
  const allSelected = rowIds.length > 0 && selectedRowKeys.length === rowIds.length
  const someSelected = selectedRowKeys.length > 0 && !allSelected

  const toggleAllRows = (checked) => {
    setSelectedRowKeys(checked ? rowIds : [])
  }

  const toggleRow = (id, checked) => {
    setSelectedRowKeys((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((key) => key !== id)))
  }

  const columns = [
    {
      key: '_picker',
      width: 44,
      align: 'center',
      className: 'ob-lock-col',
      fixed: 'left',
      title: columnPicker,
      render: () => null,
    },
    {
      key: '_select',
      width: 42,
      align: 'center',
      className: 'ob-lock-col',
      fixed: 'left',
      title: (
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          disabled={!rows.length}
          onChange={(e) => toggleAllRows(e.target.checked)}
          aria-label="Select all candidates"
        />
      ),
      render: (_, record) => (
        <Checkbox
          checked={selectedRowKeys.includes(record._id)}
          onChange={(e) => toggleRow(record._id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${record.firstName || 'candidate'}`}
        />
      ),
    },
    ...ALL_COLUMNS.filter((col) => LOCKED_KEYS.includes(col.key) || visible[col.key]).map((col) => ({
      title: col.title,
      dataIndex: col.key,
      key: col.key,
      ellipsis: true,
      className: LOCKED_KEYS.includes(col.key) ? 'ob-lock-col' : undefined,
      fixed: LOCKED_KEYS.includes(col.key) ? 'left' : undefined,
      width: col.key === 'email' ? 180 : col.key === 'firstName' || col.key === 'lastName' ? 140 : 160,
      sorter: (a, b) => String(a[col.key] || '').localeCompare(String(b[col.key] || '')),
      showSorterTooltip: false,
      ...(col.key === 'status'
        ? {
            filters: statusFilters,
            onFilter: (value, record) => record.status === value,
            render: (v) => <Tag color={STATUS_COLOR[v] || 'default'}>{v || '—'}</Tag>,
          }
        : { render: (v) => dash(v) }),
    })),
  ]

  return (
    <div className={`ob-page${wide ? ' is-wide' : ''}`}>
      <div className="ob-toolbar">
        <Flex align="center" gap={8} wrap="wrap">
          <Select defaultValue="candidate" size="small" options={[{ value: 'candidate', label: 'Candidate View' }]} className="ob-view-select" />
          <Button type="link" size="small">Edit</Button>
        </Flex>
        <Flex align="center" gap={8} wrap="wrap">
          <Button type="link" size="small" onClick={() => setScope('all')}>View All Data</Button>
          <Select
            size="small"
            value={scope === 'mine' ? 'mine' : 'all'}
            onChange={setScope}
            options={SCOPE_OPTIONS}
            className="ob-scope"
          />
          <Space.Compact>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              Add Candidate
            </Button>
            <Dropdown
              menu={{
                items: [
                  { key: 'import', icon: <ImportOutlined />, label: 'Import', onClick: () => fileRef.current?.click() },
                  { key: 'bulk', icon: <UploadOutlined />, label: 'Bulk File Upload', onClick: () => fileRef.current?.click() },
                ],
              }}
            >
              <Button type="primary" icon={<DownOutlined />} aria-label="More candidate actions" />
            </Dropdown>
          </Space.Compact>
          <Button type="text" icon={<ExpandOutlined />} aria-label="Full screen" onClick={() => setWide((v) => !v)} />
          <Button type="text" icon={<FilterOutlined />} aria-label="Filter" onClick={() => setFilterOpen(true)} />
          <Dropdown
            menu={{
              items: [
                { key: 'reload', icon: <ReloadOutlined />, label: 'Refresh', onClick: load },
              ],
            }}
          >
            <Button type="text" icon={<MoreOutlined />} aria-label="More" />
          </Dropdown>
        </Flex>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) importCsv(file)
        }}
      />

      <div className="ob-table-wrap">
        <Table
          rowKey="_id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={rows.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({ onClick: () => openEdit(record) })}
          locale={{
            emptyText: (
              <Empty
                image={<EmptyArt />}
                description={
                  <div className="ob-empty-copy">
                    <strong>No candidates have been added yet</strong>
                    <p>
                      Add candidates and trigger the pre-onboarding process, known as candidate onboarding, to gather
                      personal, professional, and educational information from them, and complete their onboarding
                      paperwork online to transition them into employees.
                    </p>
                  </div>
                }
              />
            ),
          }}
        />
      </div>

      <Drawer
        title="Filter"
        placement="right"
        width={340}
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        footer={
          <Flex gap={8}>
            <Button
              type="primary"
              onClick={() => {
                setApplied(draftFilters)
                setQuery(draftFilters.employee)
                setFilterOpen(false)
              }}
            >
              Apply
            </Button>
            <Button
              onClick={() => {
                const reset = { employee: '', department: 'all', location: 'all' }
                setDraftFilters(reset)
                setApplied(reset)
                setQuery('')
              }}
            >
              Reset
            </Button>
          </Flex>
        }
      >
        <div className="ob-filter-block">
          <p className="ob-filter-label">System Filters</p>
          <label className="ob-filter-field">
            Employee
            <Input
              value={draftFilters.employee}
              onChange={(e) => setDraftFilters((f) => ({ ...f, employee: e.target.value }))}
            />
          </label>
          <label className="ob-filter-field">
            Department
            <Select
              value={draftFilters.department}
              onChange={(department) => setDraftFilters((f) => ({ ...f, department }))}
              options={[{ value: 'all', label: 'All Department' }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]}
            />
          </label>
          <label className="ob-filter-field">
            Location
            <Select
              value={draftFilters.location}
              onChange={(location) => setDraftFilters((f) => ({ ...f, location }))}
              options={[{ value: 'all', label: 'All Locations' }, ...LOCATIONS.map((d) => ({ value: d, label: d }))]}
            />
          </label>
        </div>
      </Drawer>

      <Modal
        title={editing ? 'Edit Candidate' : 'Add Candidate'}
        open={open}
        onCancel={() => { setOpen(false); setEditing(null) }}
        width={920}
        destroyOnHidden
        className="ob-modal"
        footer={
          <Space wrap>
            <Button type="primary" loading={saving} onClick={() => save({ draft: false })}>
              Submit
            </Button>
            <Button type="primary" loading={saving} onClick={() => save({ draft: false, andNew: true })}>
              Submit and New
            </Button>
            <Button loading={saving} onClick={() => save({ draft: true })}>
              Save Draft
            </Button>
            <Button onClick={() => { setOpen(false); setEditing(null) }}>Cancel</Button>
          </Space>
        }
      >
        <PulseCandidateForm form={form} />
      </Modal>
    </div>
  )
}

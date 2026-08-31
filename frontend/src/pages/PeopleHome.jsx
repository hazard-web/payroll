import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  AppstoreOutlined,
  AuditOutlined,
  BellOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  FileTextOutlined,
  HomeOutlined,
  LogoutOutlined,
  PlusOutlined,
  PushpinOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  SearchOutlined,
  SettingOutlined,
  SoundOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Flex,
  Input,
  Layout as AntLayout,
  List,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import PulseMark from '../components/PulseMark'
import PulseLoading from '../components/PulseLoading'
import PulseGreetingBanner from '../components/PulseGreetingBanner'
import PulseWorkSchedule, { usePulseWorkWeek } from '../components/PulseWorkSchedule'
import PulseMySpaceDashboard from '../components/PulseMySpaceDashboard'
import { MORE_SERVICES } from '../components/PulseMoreLauncher'
import PulseSmartChat from '../components/PulseSmartChat'
import { PulseCount, PulseMotion } from '../components/PulseMotion'
import PulseOrganization, { ORG_TABS } from '../components/PulseOrganization'
import PulseAppearanceToggle from '../components/PulseAppearanceToggle'
import { isPulseAdmin as userIsPulseAdmin } from '../utils/pulseRoles'
import { useAuth } from '../context/AuthContext'
import { loadPulseNotes, previewPulseNote, PULSE_NOTES_EVENT } from '../utils/pulseNotes'
import { getPulseGettingStartedPath, getPulseSampleChoice, hasPulseAccount, hasPulseSampleChoice } from '../utils/pulseEntry'
import {
  formatElapsed,
  getElapsedSeconds,
  PULSE_CHECKIN_EVENT,
  readCheckInAt,
  rolloverCheckInDayIfNeeded,
  startCheckIn,
  stopCheckIn,
} from '../utils/pulseCheckIn'
import { closeCheckInPip } from '../utils/pulseCheckInPip'
import { prefetchPulseLocation } from '../utils/pulseLocation'
import './pulse-myspace.css'
import './pulse-antd.css'

const { Header, Sider, Content, Footer } = AntLayout

const RAIL_TOP = [
  { key: 'home', label: 'Home', Icon: HomeOutlined },
  { key: 'onboarding', label: 'Onboarding', Icon: RocketOutlined },
  { key: 'leave', label: 'Leave Tracker', Icon: CalendarOutlined },
  { key: 'attendance', label: 'Attendance', Icon: ClockCircleOutlined },
  { key: 'time', label: 'Timesheets', Icon: AuditOutlined },
  { key: 'performance', label: 'Performance', Icon: ThunderboltOutlined },
  { key: 'more', label: 'More', Icon: AppstoreOutlined },
]

const RAIL_FOOT = [
  { key: 'operations', label: 'Operations', Icon: SettingOutlined },
  { key: 'reports', label: 'Reports', Icon: FileTextOutlined },
]

const SUB_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'delegation', label: 'Delegation' },
]

const SAMPLE_APPROVALS = [
  { key: '1', type: 'Leave', subject: 'Casual leave · 21 Aug', from: 'Asha Mehta', status: 'Pending', due: 'Today' },
  { key: '2', type: 'Timesheet', subject: 'Week 33 hours', from: 'You', status: 'Draft', due: 'Today' },
  { key: '3', type: 'Expense', subject: 'Client travel ₹4,200', from: 'Rahul Iyer', status: 'Pending', due: '20 Aug' },
]

const SAMPLE_TIMESHEET_ROWS = [
  { key: '1', project: 'People OS', task: 'Internal product', hours: '32' },
  { key: '2', project: 'HR operations', task: 'Admin / reviews', hours: '8' },
]

const SAMPLE_LEAVE_BALANCES = [
  { name: 'Casual', used: 6, total: 12, color: '#1A5F4A' },
  { name: 'Sick', used: 2, total: 8, color: '#d97706' },
  { name: 'Earned', used: 5, total: 15, color: '#2563eb' },
]

const SAMPLE_ACTIVITY_ITEMS = [
  { color: 'gold', children: 'Weekly timesheet still in draft · due Friday' },
  { color: 'blue', children: 'Performance cycle: mid-year review opens Mon' },
  { color: 'green', children: 'Leave approved for Priya · 25–26 Aug' },
]

const SAMPLE_NOTES = [
  { id: 'demo-1', text: 'Sync with design on overview polish.' },
  { id: 'demo-2', text: 'Send attendance note to Rahul by EOD.' },
  { id: 'demo-3', text: 'Friday: timesheet + expense review.' },
]

function prettyName(raw) {
  const value = String(raw || '').trim()
  if (!value) return 'there'
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function displayName(user) {
  return prettyName(
    user?.name?.trim() ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.firstName ||
      String(user?.email || 'there').split('@')[0],
  )
}

/** Pulse My Space — employee home after Getting Started. */
export default function PeopleHome() {
  const navigate = useNavigate()
  const { notification, message } = App.useApp()
  const { user, loading, logout } = useAuth()
  const [space, setSpace] = useState('myspace')
  const [sub, setSub] = useState('overview')
  const [module, setModule] = useState('home')
  const [activity, setActivity] = useState('Activities')
  const [moreOpen, setMoreOpen] = useState(false)
  const [moreQuery, setMoreQuery] = useState('')
  const [checkedInAt, setCheckedInAt] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [dayNotes, setDayNotes] = useState([])
  const [checkBusy, setCheckBusy] = useState(false)
  const isPulseAdmin = userIsPulseAdmin(user)

  const name = displayName(user)
  const initial = (name || 'S').charAt(0).toUpperCase()
  const sample = getPulseSampleChoice() === '1'
  const hour = new Date().getHours()
  const todayHours = Math.round((elapsed / 3600) * 100) / 100
  const workWeek = usePulseWorkWeek({
    useSample: sample,
    checkedInToday: Boolean(checkedInAt),
    todayHours,
  })
  const weekDays = workWeek.days
  const attendanceRows = weekDays.map((day) => ({
    key: day.key,
    day: day.label,
    date: format(day.date, 'd MMM'),
    status: day.status || (day.today ? (checkedInAt ? 'Checked in' : 'Open') : day.present ? 'Present' : '—'),
    hours: day.hours ? `${day.hours}` : '—',
  }))
  const liveTimesheetRows = weekDays
    .filter((day) => (day.present || (day.today && checkedInAt)) && !day.weekend)
    .map((day) => ({
      key: day.key,
      project: 'People OS',
      task: format(day.date, 'EEE d MMM'),
      hours: String(day.hours || 0),
    }))
  const approvals = sample ? SAMPLE_APPROVALS : workWeek.approvals
  const timesheetRows = sample ? SAMPLE_TIMESHEET_ROWS : liveTimesheetRows
  const leaveBalances = sample ? SAMPLE_LEAVE_BALANCES : workWeek.leaveBalances
  const weekHours = Math.round(weekDays.reduce((sum, day) => sum + (Number(day.hours) || 0), 0) * 100) / 100
  const weekTarget = Math.max(1, weekDays.filter((day) => !day.weekend && day.status !== 'Holiday').length * 9)
  const leaveLeft = leaveBalances.reduce((sum, row) => sum + Math.max(0, row.total - row.used), 0)
  const pendingCount = approvals.filter((row) => ['Pending', 'Accepted', 'In Progress'].includes(row.status)).length
  const monthPresent = sample ? 18 : (workWeek.month ? Number(workWeek.month.present) || 0 : weekDays.filter((day) => day.present && !day.weekend).length)
  const monthAbsent = sample ? 1 : (workWeek.month ? Number(workWeek.month.absent) || 0 : weekDays.filter((day) => day.status === 'Absent').length)
  const monthLate = sample ? 1 : (workWeek.month ? Number(workWeek.month.late) || 0 : 0)
  const mtdDays = monthPresent + monthAbsent
  const mtdPct = mtdDays > 0 ? Math.round((monthPresent / mtdDays) * 100) : null
  const timesheetTag = sample || weekHours > 0 ? 'Draft' : 'Open'
  const pendingTag = sample || pendingCount > 0 ? 'Action' : 'Clear'
  const attendanceTag = sample ? 'On track' : monthPresent === 0 ? 'This week' : mtdPct >= 80 ? 'On track' : 'Review'
  const activityItems = sample
    ? [
        { color: checkedInAt ? 'green' : 'gray', children: checkedInAt ? 'Checked in today' : 'Yet to check-in' },
        ...SAMPLE_ACTIVITY_ITEMS,
      ]
    : [
        { color: checkedInAt ? 'green' : 'gray', children: checkedInAt ? 'Checked in today' : 'Yet to check-in' },
        ...weekDays
          .filter((day) => day.status === 'Absent')
          .map((day) => ({ color: 'red', children: `Absent · ${day.label} ${day.num}` })),
        ...weekDays
          .filter((day) => day.status === 'On Leave')
          .map((day) => ({ color: 'blue', children: `On leave · ${day.label} ${day.num}` })),
        ...(weekHours > 0
          ? [{ color: 'gold', children: `This week ${weekHours}h logged` }]
          : []),
      ]
  const pinnedNotes = dayNotes.filter((note) => note.text?.trim())
  const notesPreview = pinnedNotes.length > 0 ? pinnedNotes : sample ? SAMPLE_NOTES : []

  useEffect(() => {
    if (loading || !user) return
    if (!hasPulseAccount(user) || !hasPulseSampleChoice()) {
      navigate(getPulseGettingStartedPath(user), { replace: true })
    }
  }, [user, loading, navigate])

  useEffect(() => {
    if (!isPulseAdmin && space === 'organization') setSpace('myspace')
  }, [isPulseAdmin, space])

  useEffect(() => {
    if (!user?.email) return undefined
    let live = true
    prefetchPulseLocation()
    void rolloverCheckInDayIfNeeded(user.email).finally(() => {
      if (!live) return
      setCheckedInAt(readCheckInAt(user.email))
      setElapsed(getElapsedSeconds(user.email))
    })
    const onChange = (event) => {
      if (event?.detail?.email && event.detail.email !== user.email) return
      const nextAt = event?.detail?.checkedInAt ?? readCheckInAt(user.email)
      const nextElapsed = getElapsedSeconds(user.email)
      setCheckedInAt((prev) => (prev === nextAt ? prev : nextAt))
      setElapsed((prev) => (prev === nextElapsed ? prev : nextElapsed))
      if (event?.detail?.interrupted) {
        message.info({
          content: 'Timer paused while your system was asleep or off',
          className: 'pulse-message',
          duration: 2.5,
        })
      }
    }
    window.addEventListener(PULSE_CHECKIN_EVENT, onChange)
    return () => {
      live = false
      window.removeEventListener(PULSE_CHECKIN_EVENT, onChange)
    }
  }, [user?.email, message])

  useEffect(() => {
    if (!user?.email) return undefined
    const sync = () => setDayNotes(loadPulseNotes(user.email).filter((note) => !note.trashed))
    sync()
    window.addEventListener(PULSE_NOTES_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(PULSE_NOTES_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [user?.email])

  useEffect(() => {
    if (!user?.email) return undefined
    const tick = () => {
      const next = getElapsedSeconds(user.email)
      setElapsed((prev) => (prev === next ? prev : next))
    }
    tick()
    if (!checkedInAt) return undefined
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [checkedInAt, user?.email])

  const onCheckIn = () => {
    if (!user?.email || checkBusy) return
    setCheckBusy(true)
    const isActive = Boolean(readCheckInAt(user.email))
    try {
      if (isActive || checkedInAt) {
        const session = stopCheckIn(user.email)
        closeCheckInPip()
        setCheckedInAt(null)
        const secs = Math.floor((session?.activeMs || getElapsedSeconds(user.email) || 0) / 1000)
        setElapsed(secs)
        message.success({
          content: `Checked out · ${formatElapsed(secs)}`,
          className: 'pulse-message',
          duration: 2,
        })
      } else {
        closeCheckInPip()
        const session = startCheckIn(user.email, Date.now())
        setCheckedInAt(session?.checkedInAt || Date.now())
        setElapsed(getElapsedSeconds(user.email))
        message.success({
          content: `Checked in · ${format(new Date(), 'h:mm a')}`,
          className: 'pulse-message',
          duration: 2,
        })
      }
    } finally {
      // Release quickly so the next CTA is not blocked
      window.setTimeout(() => setCheckBusy(false), 120)
    }
  }

  const soon = (label) =>
    message.info({
      content: `${label} is coming soon`,
      className: 'pulse-message',
      duration: 2.5,
    })

  const openNotesBoard = () => {
    window.open(`${window.location.origin}/pulse/notes`, '_blank', 'noopener,noreferrer')
  }

  const moreItems = useMemo(() => {
    const q = moreQuery.trim().toLowerCase()
    if (!q) return MORE_SERVICES
    return MORE_SERVICES.filter((item) => item.name.toLowerCase().includes(q))
  }, [moreQuery])

  if (loading || !user || !hasPulseAccount(user) || !hasPulseSampleChoice()) {
    return <PulseLoading />
  }

  const showOverview = space === 'myspace' && module === 'home' && sub === 'overview'
  const showDashboard = space === 'myspace' && module === 'home' && sub === 'dashboard'
  const showOnboarding = space === 'organization' && sub === 'onboarding'
  const moduleTitle =
    MORE_SERVICES.find((item) => item.id === module)?.name ||
    [...RAIL_TOP, ...RAIL_FOOT].find((item) => item.key === module)?.label ||
    'Home'

  const goHome = () => {
    setMoreOpen(false)
    setSpace('myspace')
    setModule('home')
    setSub('overview')
  }

  const approvalCols = [
    { title: 'Type', dataIndex: 'type', width: 110, render: (v) => <Tag>{v}</Tag> },
    { title: 'Subject', dataIndex: 'subject' },
    { title: 'From', dataIndex: 'from', width: 120 },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (v) => <Tag color={v === 'Pending' ? 'gold' : v === 'Draft' ? 'blue' : 'green'}>{v}</Tag>,
    },
    { title: 'Due', dataIndex: 'due', width: 90 },
  ]

  return (
    <AntLayout className={`pulse-shell${showOnboarding ? ' is-onboarding' : ''}`} hasSider>
      <Sider className="pulse-sider-left" width={100} theme="dark" collapsedWidth={100} trigger={null}>
        <nav className="pulse-rail" aria-label="Pulse modules">
          <button type="button" className="pulse-rail-logo" onClick={goHome} aria-label="Pulse home">
            <PulseMark size={30} />
          </button>
          {RAIL_TOP.map((item) => {
            const Icon = item.Icon
            const onboardingOn = item.key === 'onboarding' && space === 'organization' && sub === 'onboarding'
            const on = item.key === 'more'
              ? moreOpen
              : onboardingOn
                ? !moreOpen
                : module === item.key && space === 'myspace' && !moreOpen
            return (
              <button
                key={item.key}
                type="button"
                className={`pulse-rail-item${on ? ' is-on' : ''}`}
                onClick={() => {
                  if (item.key === 'more') {
                    setSpace('myspace')
                    setMoreOpen((open) => !open)
                    return
                  }
                  setMoreOpen(false)
                  if (item.key === 'onboarding' && isPulseAdmin) {
                    setSpace('organization')
                    setModule('home')
                    setSub('onboarding')
                    return
                  }
                  setSpace('myspace')
                  if (item.key === 'time') {
                    setModule('home')
                    setSub('overview')
                    setActivity('Timesheets')
                    return
                  }
                  setModule(item.key)
                  setSub('overview')
                }}
              >
                <span className="pulse-rail-ico" aria-hidden="true">
                  <Icon />
                </span>
                <span className="pulse-rail-label">{item.label}</span>
              </button>
            )
          })}
          <div className="pulse-rail-gap" />
          {RAIL_FOOT.map((item) => {
            const Icon = item.Icon
            const on = module === item.key && !moreOpen
            return (
              <button
                key={item.key}
                type="button"
                className={`pulse-rail-item${on ? ' is-on' : ''}`}
                onClick={() => {
                  setMoreOpen(false)
                  setSpace('myspace')
                  setModule(item.key)
                  setSub('overview')
                }}
              >
                <span className="pulse-rail-ico" aria-hidden="true">
                  <Icon />
                </span>
                <span className="pulse-rail-label">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </Sider>

      <AntLayout className="pulse-chrome">
      <Header className="pulse-top">
        {showOnboarding ? (
          <button type="button" className="pulse-space is-on">
            Candidate
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`pulse-space${space === 'myspace' ? ' is-on' : ''}`}
              onClick={() => {
                setMoreOpen(false)
                setSpace('myspace')
                setModule('home')
                setSub('overview')
              }}
            >
              My Space
            </button>
            {isPulseAdmin && (
              <button
                type="button"
                className={`pulse-space${space === 'organization' ? ' is-on' : ''}`}
                onClick={() => {
                  setMoreOpen(false)
                  setSpace('organization')
                  setModule('home')
                  setSub('overview')
                }}
              >
                Organization
              </button>
            )}
          </>
        )}
        <div className="pulse-top-tools">
          <Button className="pulse-plus" type="primary" icon={<PlusOutlined />} aria-label="Quick add" onClick={() => soon('Quick add')} />
          <Button type="text" icon={<SearchOutlined />} aria-label="Search" onClick={() => soon('Search')} />
          <Badge count={sample ? 3 : pendingCount} size="small">
            <Button type="text" icon={<BellOutlined />} aria-label="Notifications" onClick={() => setActivity('Approvals')} />
          </Badge>
          <Button type="text" icon={<QuestionCircleOutlined />} aria-label="Help" onClick={() => soon('Help')} />
          <PulseAppearanceToggle />
          <Button type="text" icon={<SettingOutlined />} aria-label="Settings" onClick={() => soon('Settings')} />
          <Dropdown
            menu={{
              items: [
                { key: 'out', icon: <LogoutOutlined />, danger: true, label: 'Sign out', onClick: () => { logout(); navigate('/login') } },
              ],
            }}
          >
            <Avatar className="pulse-avatar" size={30}>{initial}</Avatar>
          </Dropdown>
        </div>
      </Header>

      <AntLayout className="pulse-mid">
        <AntLayout className="pulse-maincol">
          {!showOnboarding ? (
          <div className="pulse-sub" role="tablist" aria-label={space === 'organization' ? 'Organization sections' : 'My Space sections'}>
            <div className="pulse-sub-tabs">
              {space === 'organization'
                ? ORG_TABS.filter((item) => item.key !== 'onboarding').map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      className={`pulse-sub-tab${sub === item.key ? ' is-on' : ''}`}
                      onClick={() => setSub(item.key)}
                    >
                      {item.label}
                    </button>
                  ))
                : space === 'myspace' && module === 'home'
                ? SUB_TABS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="tab"
                      className={`pulse-sub-tab${sub === item.value ? ' is-on' : ''}`}
                      onClick={() => setSub(item.value)}
                    >
                      {item.label}
                    </button>
                  ))
                : (
                    <button type="button" className="pulse-sub-tab is-on">
                      {moduleTitle}
                    </button>
                  )}
            </div>
            {showDashboard ? <div id="pulse-dash-sub-tools" className="pulse-sub-tools" /> : null}
          </div>
          ) : null}

          <Content className={`pulse-body${showOverview ? ' pulse-body-surface' : ''}${space === 'organization' ? ' pulse-body-org' : ''}`}>
            {space === 'organization' && isPulseAdmin ? (
              <div className={`pulse-scroll${showOnboarding ? ' pulse-scroll-fill' : ''}`}>
                <PulseOrganization user={user} tab={sub} onSoon={soon} onTab={setSub} />
              </div>
            ) : showDashboard ? (
              <div className="pulse-scroll pulse-scroll-dash">
                <PulseMySpaceDashboard onSoon={soon} />
              </div>
            ) : !showOverview ? (
              <div className="pulse-scroll">
                <div className="pulse-widgets">
                  <Card size="small"><Empty description="This module is on the roadmap. Use Overview for check-in, approvals, and this week." /></Card>
                </div>
              </div>
            ) : (
                <div className="pulse-scroll pulse-scroll-surface">
                <div className="pulse-overview">
                <div className="pulse-stage">
                  <Card
                    size="small"
                    tabList={['Activities', 'Feeds', 'Profile', 'Approvals', 'Leave', 'Attendance', 'Timesheets'].map((tab) => ({ key: tab, tab }))}
                    activeTabKey={activity}
                    onTabChange={setActivity}
                  >
                    {activity === 'Activities' && (
                      <PulseMotion key="act-activities">
                        <div className="pulse-feed">
                          <PulseGreetingBanner name={name} hour={hour} />
                          <PulseWorkSchedule week={workWeek} />
                          {sample || weekHours > 0 ? (
                            <Alert type="warning" showIcon message="This week's timesheet is still a draft." action={<Button size="small" onClick={() => setActivity('Timesheets')}>Open timesheet</Button>} />
                          ) : null}
                        </div>
                      </PulseMotion>
                    )}
                    {activity === 'Approvals' && (
                      <PulseMotion key="act-approvals">
                        {approvals.length === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No approvals yet" />
                        ) : (
                          <Table
                            size="small"
                            pagination={false}
                            columns={approvalCols}
                            dataSource={approvals}
                            className="pulse-approvals-table"
                          />
                        )}
                      </PulseMotion>
                    )}
                    {activity === 'Leave' && (
                      <PulseMotion key="act-leave">
                        {leaveBalances.length === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No leave balances yet" />
                        ) : (
                          <Space direction="vertical" style={{ width: '100%' }}>
                            {leaveBalances.map((row) => (
                              <div key={row.name}>
                                <Flex justify="space-between">
                                  <Typography.Text>{row.name}</Typography.Text>
                                  <Typography.Text type="secondary">
                                    <PulseCount value={row.total - row.used} /> left of {row.total}
                                  </Typography.Text>
                                </Flex>
                                <Progress percent={Math.round((row.used / row.total) * 100)} strokeColor={row.color} size="small" />
                              </div>
                            ))}
                            <Button onClick={() => setModule('leave')}>Apply leave</Button>
                          </Space>
                        )}
                      </PulseMotion>
                    )}
                    {activity === 'Attendance' && (
                      <PulseMotion key="act-attendance">
                        <Table
                          size="small"
                          pagination={false}
                          className="pulse-approvals-table"
                          dataSource={attendanceRows}
                          columns={[
                            { title: 'Day', dataIndex: 'day', width: 80 },
                            { title: 'Date', dataIndex: 'date', width: 90 },
                            {
                              title: 'Status',
                              dataIndex: 'status',
                              render: (v) => {
                                    const color =
                                  v === 'Absent'
                                    ? 'red'
                                    : v === 'Weekend'
                                      ? 'orange'
                                      : v === 'Present' || v === 'Checked in'
                                        ? 'green'
                                        : v === 'On Leave'
                                          ? 'blue'
                                          : v === 'Holiday'
                                            ? 'cyan'
                                            : 'default'
                                return <Tag color={color}>{v}</Tag>
                              },
                            },
                            { title: 'Hours', dataIndex: 'hours', width: 80 },
                          ]}
                        />
                      </PulseMotion>
                    )}
                    {activity === 'Timesheets' && (
                      <PulseMotion key="act-timesheets">
                        {timesheetRows.length === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No timesheet entries yet" />
                        ) : (
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                          <Flex justify="space-between" align="center">
                            <div>
                              <Typography.Text strong>Week of {format(new Date(), 'd MMM yyyy')}</Typography.Text>
                              <div><Tag color="blue">Draft</Tag><Typography.Text type="secondary"> Due Friday</Typography.Text></div>
                            </div>
                            <Button
                              type="primary"
                              onClick={() =>
                                notification.success({
                                  message: 'Timesheet submitted',
                                  description: 'Sent for review · due Friday.',
                                  className: 'pulse-notify',
                                  duration: 3,
                                })
                              }
                            >
                              Submit timesheet
                            </Button>
                          </Flex>
                          <Table
                            size="small"
                            pagination={false}
                            dataSource={timesheetRows}
                            columns={[
                              { title: 'Project', dataIndex: 'project' },
                              { title: 'Work', dataIndex: 'task' },
                              { title: 'Hours', dataIndex: 'hours', width: 80 },
                            ]}
                          />
                        </Space>
                        )}
                      </PulseMotion>
                    )}
                    {activity === 'Feeds' && (
                      <PulseMotion key="act-feeds">
                        {sample ? (
                          <List
                            dataSource={[
                              { title: 'Independence Day — office closed', meta: '15 Aug' },
                              { title: 'Update your emergency contacts', meta: '8 Aug' },
                            ]}
                            renderItem={(item) => (
                              <List.Item>
                                <List.Item.Meta title={item.title} description={item.meta} />
                              </List.Item>
                            )}
                          />
                        ) : workWeek.announcements.length === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No posts yet" />
                        ) : (
                          <List
                            dataSource={workWeek.announcements}
                            renderItem={(item) => (
                              <List.Item>
                                <List.Item.Meta
                                  title={item.title}
                                  description={
                                    <Space size={8}>
                                      <Tag color={item.priority === 'Urgent' ? 'red' : item.priority === 'Important' ? 'gold' : 'default'}>
                                        {item.priority}
                                      </Tag>
                                      <Typography.Text type="secondary">
                                        {item.createdAt ? format(new Date(item.createdAt), 'd MMM') : ''}
                                      </Typography.Text>
                                    </Space>
                                  }
                                />
                              </List.Item>
                            )}
                          />
                        )}
                      </PulseMotion>
                    )}
                    {activity === 'Profile' && (
                      <PulseMotion key="act-profile">
                        <Descriptions size="small" column={1} bordered>
                          <Descriptions.Item label="Name">{name}</Descriptions.Item>
                          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
                          <Descriptions.Item label="Company">{user.companyName || workWeek.profile?.company || '—'}</Descriptions.Item>
                          <Descriptions.Item label="Department">{workWeek.profile?.department || '—'}</Descriptions.Item>
                          <Descriptions.Item label="Role">{workWeek.profile?.designation || (isPulseAdmin ? 'Admin' : 'Member')}</Descriptions.Item>
                          <Descriptions.Item label="Shift">{workWeek.profile?.shift?.name || workWeek.shift?.name || 'General'}</Descriptions.Item>
                        </Descriptions>
                      </PulseMotion>
                    )}
                  </Card>
                </div>

                <PulseMotion delay={0.16} className="pulse-dock-slot pulse-dock-checkin">
                  <Card className="pulse-checkin-card" size="small">
                    <div className="pulse-checkin-head">
                      <Avatar size={44} className="pulse-avatar">{initial}</Avatar>
                      <div className="pulse-checkin-meta">
                        <Typography.Text strong ellipsis>
                          {name}
                        </Typography.Text>
                        <Tag color={checkedInAt ? 'success' : elapsed > 0 ? 'default' : 'error'}>
                          {checkedInAt ? 'Checked in' : elapsed > 0 ? 'Checked out · day open' : 'Yet to check-in'}
                        </Tag>
                      </div>
                    </div>
                    <div className="pulse-checkin-main">
                      <div className={`pulse-checkin-time${checkedInAt ? ' is-live' : elapsed > 0 ? ' is-paused' : ' is-idle'}`} aria-live="polite">
                        {formatElapsed(elapsed)}
                      </div>
                      <Button
                        type="primary"
                        size="large"
                        block
                        loading={false}
                        disabled={checkBusy}
                        className={`pulse-checkin-cta${checkedInAt ? ' is-checked-in' : ''}`}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          onCheckIn()
                        }}
                      >
                        {checkedInAt ? 'Check-out' : 'Check-in'}
                      </Button>
                    </div>
                    <p className="pulse-checkin-date">
                      {format(new Date(), 'EEEE, d MMM')}
                    </p>
                  </Card>
                </PulseMotion>

                <div className="pulse-kpis">
                  <Row className="pulse-eq pulse-kpi-row" gutter={[12, 12]}>
                    <Col xs={12} lg={6}>
                      <PulseMotion delay={0.02} className="pulse-kpi-wrap">
                        <Card
                          size="small"
                          className="pulse-kpi pulse-kpi-live pulse-kpi-timesheet"
                          hoverable
                          onClick={() => setActivity('Timesheets')}
                        >
                          <div className="pulse-kpi-head">
                            <span className="pulse-kpi-title">
                              <span className="pulse-kpi-ico" aria-hidden="true"><FileTextOutlined /></span>
                              <Typography.Text className="pulse-kpi-label">Timesheet</Typography.Text>
                            </span>
                            <Tag className={`pulse-kpi-tag ${sample || weekHours > 0 ? 'pulse-kpi-tag-draft' : 'pulse-kpi-tag-quiet'}`} bordered={false}>{timesheetTag}</Tag>
                          </div>
                          <Statistic value={sample ? 32 : weekHours} suffix="h" />
                          <div className="pulse-kpi-meter">
                            <Progress percent={sample ? 80 : Math.min(100, Math.round((weekHours / weekTarget) * 100))} showInfo={false} strokeColor="#1a5f4a" trailColor={sample ? '#e8f2ee' : undefined} size="small" />
                          </div>
                          <Typography.Text className="pulse-kpi-foot">
                            {sample || weekHours > 0
                              ? `Due Friday · ${timesheetRows.length} ${timesheetRows.length === 1 ? 'entry' : 'entries'}`
                              : 'Hours appear after you check in'}
                          </Typography.Text>
                        </Card>
                      </PulseMotion>
                    </Col>
                    <Col xs={12} lg={6}>
                      <PulseMotion delay={0.06} className="pulse-kpi-wrap">
                        <Card
                          size="small"
                          className="pulse-kpi pulse-kpi-live pulse-kpi-leave"
                          hoverable
                          onClick={() => setModule('leave')}
                        >
                          <div className="pulse-kpi-head">
                            <span className="pulse-kpi-title">
                              <span className="pulse-kpi-ico" aria-hidden="true"><CalendarOutlined /></span>
                              <Typography.Text className="pulse-kpi-label">Leave balance</Typography.Text>
                            </span>
                            <Tag className="pulse-kpi-tag pulse-kpi-tag-neutral" bordered={false}>{leaveBalances.length || 0} types</Tag>
                          </div>
                          <Statistic value={sample ? 14 : leaveLeft} suffix=" days" />
                          <Typography.Text className="pulse-kpi-foot">
                            {leaveBalances.length
                              ? leaveBalances.map((row) => `${row.name} ${Math.max(0, row.total - row.used)}`).join(' · ')
                              : 'No leave types yet'}
                          </Typography.Text>
                        </Card>
                      </PulseMotion>
                    </Col>
                    <Col xs={12} lg={6}>
                      <PulseMotion delay={0.1} className="pulse-kpi-wrap">
                        <Card
                          size="small"
                          className="pulse-kpi pulse-kpi-live pulse-kpi-pending"
                          hoverable
                          onClick={() => setActivity('Approvals')}
                        >
                          <div className="pulse-kpi-head">
                            <span className="pulse-kpi-title">
                              <span className="pulse-kpi-ico" aria-hidden="true"><AuditOutlined /></span>
                              <Typography.Text className="pulse-kpi-label">Pending on you</Typography.Text>
                            </span>
                            <Tag className={`pulse-kpi-tag ${sample || pendingCount > 0 ? 'pulse-kpi-tag-action' : 'pulse-kpi-tag-quiet'}`} bordered={false}>{pendingTag}</Tag>
                          </div>
                          <Statistic value={sample ? 3 : pendingCount} />
                          <Typography.Text className="pulse-kpi-foot">
                            {sample || pendingCount > 0 ? 'Leave · Tasks · Review' : 'Inbox is clear'}
                          </Typography.Text>
                        </Card>
                      </PulseMotion>
                    </Col>
                    <Col xs={12} lg={6}>
                      <PulseMotion delay={0.14} className="pulse-kpi-wrap">
                        <Card
                          size="small"
                          className="pulse-kpi pulse-kpi-live pulse-kpi-attendance"
                          hoverable
                          onClick={() => setModule('attendance')}
                        >
                          <div className="pulse-kpi-head">
                            <span className="pulse-kpi-title">
                              <span className="pulse-kpi-ico" aria-hidden="true"><ClockCircleOutlined /></span>
                              <Typography.Text className="pulse-kpi-label">Attendance MTD</Typography.Text>
                            </span>
                            <Tag className={`pulse-kpi-tag ${attendanceTag === 'On track' ? 'pulse-kpi-tag-ok' : attendanceTag === 'Review' ? 'pulse-kpi-tag-action' : 'pulse-kpi-tag-quiet'}`} bordered={false}>{attendanceTag}</Tag>
                          </div>
                          <Statistic
                            value={sample ? 96 : (mtdPct == null ? '—' : mtdPct)}
                            suffix={sample || mtdPct != null ? '%' : ''}
                          />
                          <div className="pulse-kpi-meter">
                            <Progress percent={sample ? 96 : (mtdPct || 0)} showInfo={false} strokeColor="#0f766e" size="small" />
                          </div>
                          <Typography.Text className="pulse-kpi-foot">
                            {monthPresent} present · {monthLate} late · {monthAbsent} absent
                          </Typography.Text>
                        </Card>
                      </PulseMotion>
                    </Col>
                  </Row>
                </div>

                <PulseMotion delay={0.2} className="pulse-dock-slot pulse-dock-notes">
                  <Card
                    className="pulse-notes-card"
                    title="Notes"
                    extra={<Button type="link" onClick={(event) => { event.stopPropagation(); openNotesBoard() }}>Open notebook</Button>}
                    onClick={openNotesBoard}
                  >
                    {notesPreview.length === 0 ? (
                      <div className="pulse-notes-empty">
                        <Typography.Text>Capture a thought for today.</Typography.Text>
                        <Button type="link" onClick={(event) => { event.stopPropagation(); openNotesBoard() }}>
                          Open notebook
                        </Button>
                      </div>
                    ) : (
                    <ul className="pulse-today pulse-notes-preview">
                      {notesPreview.slice(0, 3).map((note) => (
                        <li key={note.id}>
                          <Typography.Paragraph ellipsis={{ rows: 1 }} style={{ margin: 0 }}>
                            {previewPulseNote(note.text)}
                          </Typography.Paragraph>
                        </li>
                      ))}
                    </ul>
                    )}
                  </Card>
                </PulseMotion>

                <div className="pulse-panels">
                  <Row className="pulse-eq pulse-panels-row" gutter={0}>
                    <Col xs={24} lg={14}>
                      <Card size="small" className="pulse-panel-card" title="Approvals queue" extra={<Button type="link" size="small" onClick={() => setActivity('Approvals')}>View all</Button>}>
                        {approvals.length === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No approvals yet" />
                        ) : (
                          <Table
                            size="small"
                            pagination={false}
                            className="pulse-approvals-table"
                            columns={approvalCols.filter((c) => c.dataIndex !== 'from')}
                            dataSource={approvals}
                          />
                        )}
                      </Card>
                    </Col>
                    <Col xs={24} lg={10}>
                      <Card size="small" className="pulse-panel-card" title="Activity">
                        {activityItems.length === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet" />
                        ) : (
                          <Timeline items={activityItems} />
                        )}
                      </Card>
                    </Col>
                  </Row>
                </div>

                <PulseMotion delay={0.24} className="pulse-dock-slot pulse-dock-quick">
                  <Card className="pulse-quick-card" title="Quick actions">
                    <div className="pulse-quick">
                      <Button icon={<CalendarOutlined />} onClick={() => setModule('leave')}>Leave</Button>
                      <Button icon={<ClockCircleOutlined />} onClick={() => setModule('attendance')}>Attendance</Button>
                      <Button icon={<FileTextOutlined />} onClick={() => setActivity('Timesheets')}>Timesheet</Button>
                      <Button icon={<TeamOutlined />} onClick={() => (isPulseAdmin ? setSpace('organization') : soon('Directory'))}>Directory</Button>
                    </div>
                  </Card>
                </PulseMotion>
                </div>
                </div>
            )}
          </Content>
        </AntLayout>

        <Sider className="pulse-sider-right" width={44} theme="light" collapsedWidth={44} trigger={null}>
          <aside className="pulse-aside" aria-label="Shortcuts">
            <button type="button" aria-label="Directory" onClick={() => (isPulseAdmin ? setSpace('organization') : soon('Directory'))}><UserAddOutlined /></button>
            <button
              type="button"
              aria-label="Onboarding"
              onClick={() => {
                if (isPulseAdmin) {
                  setMoreOpen(false)
                  setSpace('organization')
                  setModule('home')
                  setSub('onboarding')
                  return
                }
                setModule('onboarding')
                setSpace('myspace')
              }}
            >
              <RocketOutlined />
            </button>
            <div className="pulse-aside-gap" />
            <button type="button" aria-label="Accessibility" onClick={() => soon('Accessibility')}><UserOutlined /></button>
            <PulseAppearanceToggle variant="rail" />
          </aside>
        </Sider>
      </AntLayout>

      <Footer className="pulse-ribbon">
        <button type="button" className="pulse-ribbon-btn" onClick={() => soon('My Pins')}><PushpinOutlined /> My Pins</button>
        <button type="button" className="pulse-ribbon-btn" onClick={() => soon('Chats')}><CommentOutlined /> Chats</button>
        <button type="button" className="pulse-ribbon-btn" onClick={() => soon('Contacts')}><TeamOutlined /> Contacts</button>
        <span className="pulse-ribbon-spacer" />
        <button type="button" className="pulse-ribbon-btn" aria-label="Announcements" onClick={() => { setSpace('myspace'); setModule('home'); setSub('overview'); setActivity('Feeds') }}><SoundOutlined /></button>
        <button type="button" className="pulse-ribbon-btn" aria-label="Feedback" onClick={() => soon('Feedback')}><CustomerServiceOutlined /></button>
        <PulseAppearanceToggle variant="ribbon" />
      </Footer>

      <Drawer
        title="More services"
        placement="left"
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        extra={<Button type="link" onClick={() => soon('Preferences')}>Preferences</Button>}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search services"
          value={moreQuery}
          onChange={(e) => setMoreQuery(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <List
          dataSource={moreItems}
          locale={{ emptyText: 'No matching services' }}
          renderItem={(item) => {
            const Icon = item.Icon
            return (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setMoreOpen(false)
                  setSpace('myspace')
                  setModule(item.id)
                  setSub('overview')
                }}
              >
                <List.Item.Meta avatar={<Avatar style={{ background: '#1A5F4A' }} icon={<Icon />} />} title={item.name} />
              </List.Item>
            )
          }}
        />
      </Drawer>
      <PulseSmartChat />
      </AntLayout>
    </AntLayout>
  )
}

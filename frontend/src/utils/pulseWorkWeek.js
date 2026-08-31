import { addDays, format, isToday, startOfDay, startOfWeek } from 'date-fns'
import { pulseDayKey } from './pulseCheckIn'

export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5]
export const GENERAL_SHIFT = {
  name: 'General',
  hours: '',
}

export function weekStart(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 0 })
}

export function weekRange(date = new Date()) {
  const start = weekStart(date)
  return {
    start,
    end: addDays(start, 6),
    from: pulseDayKey(start),
    to: pulseDayKey(addDays(start, 6)),
    label: `${format(start, 'dd-MMM-yyyy')} - ${format(addDays(start, 6), 'dd-MMM-yyyy')}`,
  }
}

function hoursFromMs(ms) {
  return Math.round((Math.max(0, Number(ms) || 0) / 3_600_000) * 100) / 100
}

function isPresent(record, todayCheckedIn, today) {
  if (today && todayCheckedIn) return true
  if (!record) return false
  if (Number(record.totalActiveMs) > 0) return true
  if (Number(record.totalActiveHours) > 0) return true
  if (['active', 'stopped', 'closed'].includes(record.status)) return true
  return Array.isArray(record.sessions) && record.sessions.length > 0
}

/**
 * Build 7 calendar days. Labels only for Weekend / Absent / On Leave / Holiday.
 * Today is highlighted and unlabeled unless leave or holiday.
 */
export function buildWeekDays({
  records = [],
  workDays = DEFAULT_WORK_DAYS,
  checkedInToday = false,
  leaveDates = [],
  holidays = [],
  todayHours = 0,
  useSample = false,
  now = new Date(),
} = {}) {
  const byDate = new Map((records || []).map((row) => [row.date, row]))
  const leaveSet = new Set(leaveDates)
  const holidaySet = new Set(holidays)
  const todayStart = startOfDay(now)
  const start = weekStart(now)

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    const key = pulseDayKey(date)
    const record = byDate.get(key)
    const weekend = !workDays.includes(date.getDay())
    const today = isToday(date)
    const past = startOfDay(date) < todayStart
    const onLeave = leaveSet.has(key)
    const holiday = !weekend && holidaySet.has(key)
    const present = isPresent(record, checkedInToday, today)

    let status = null
    if (weekend) status = 'Weekend'
    else if (holiday) status = 'Holiday'
    else if (onLeave) status = 'On Leave'
    else if (past && !present) status = 'Absent'

    if (useSample && date.getDay() === 1 && past && !today && !weekend) {
      status = 'Absent'
    }

    const loggedHours =
      record?.totalActiveHours != null
        ? Number(record.totalActiveHours) || 0
        : hoursFromMs(record?.totalActiveMs)

    return {
      key,
      date,
      label: format(date, 'EEE'),
      num: format(date, 'd'),
      weekend,
      today,
      past,
      present,
      onLeave,
      holiday,
      status,
      hours: today && todayHours > 0 ? Math.max(loggedHours, todayHours) : loggedHours,
      record,
    }
  })
}

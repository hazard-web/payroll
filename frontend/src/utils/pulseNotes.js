import { format, isToday, parseISO } from 'date-fns'

export const NOTE_COLORS = ['mint', 'butter', 'sky', 'blush', 'cream', 'lilac']

export const PULSE_NOTES_EVENT = 'pulse-notes'

export function pulseNotesDayKey(when = new Date()) {
  return format(when, 'yyyy-MM-dd')
}

export function pulseNotesStorageKey(email, day = pulseNotesDayKey()) {
  return `pulseTodayNotes:${String(email || '').toLowerCase()}:${day}`
}

export function loadPulseNotes(email, day = pulseNotesDayKey()) {
  if (!email) return []
  try {
    const raw = localStorage.getItem(pulseNotesStorageKey(email, day))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((n) => n && n.id) : []
  } catch {
    return []
  }
}

export function savePulseNotes(email, notes, day = pulseNotesDayKey()) {
  if (!email) return notes
  const next = Array.isArray(notes) ? notes : []
  try {
    localStorage.setItem(pulseNotesStorageKey(email, day), JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(PULSE_NOTES_EVENT, { detail: { day, notes: next } }))
  } catch {
    /* ignore quota */
  }
  return next
}

export function listPulseNoteDays(email) {
  const today = pulseNotesDayKey()
  const days = new Set([today])
  if (!email) return [today]
  const prefix = `pulseTodayNotes:${String(email).toLowerCase()}:`
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key?.startsWith(prefix)) continue
      const day = key.slice(prefix.length)
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) days.add(day)
    }
  } catch {
    /* ignore */
  }
  return [...days].sort((a, b) => b.localeCompare(a))
}

export function formatPulseNoteDay(day) {
  try {
    const date = parseISO(day)
    if (isToday(date)) return 'Today'
    return format(date, 'd MMM')
  } catch {
    return day
  }
}

function notebooksKey(email) {
  return `pulseNotebooks:${String(email || '').toLowerCase()}`
}

export function loadPulseNotebooks(email) {
  const fallback = [{ id: 'my-notebook', name: 'My Notebook' }]
  if (!email) return fallback
  try {
    const parsed = JSON.parse(localStorage.getItem(notebooksKey(email)) || 'null')
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback
    const list = parsed.filter((item) => item?.id && item?.name)
    return list.some((item) => item.id === 'my-notebook') ? list : [...fallback, ...list]
  } catch {
    return fallback
  }
}

export function savePulseNotebooks(email, notebooks) {
  if (!email) return notebooks
  const next = Array.isArray(notebooks) && notebooks.length ? notebooks : [{ id: 'my-notebook', name: 'My Notebook' }]
  try {
    localStorage.setItem(notebooksKey(email), JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

function boardsKey(email) {
  return `pulseBoards:${String(email || '').toLowerCase()}`
}

export function loadPulseBoards(email) {
  const fallback = [{ id: 'my-board', name: 'My Notebook', title: 'My Noteboard' }]
  if (!email) return fallback
  try {
    const parsed = JSON.parse(localStorage.getItem(boardsKey(email)) || 'null')
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback
    const list = parsed.filter((item) => item?.id && item?.name)
    return list.some((item) => item.id === 'my-board') ? list : [...fallback, ...list]
  } catch {
    return fallback
  }
}

export function savePulseBoards(email, boards) {
  if (!email) return boards
  const next = Array.isArray(boards) && boards.length ? boards : loadPulseBoards(email)
  try {
    localStorage.setItem(boardsKey(email), JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function createPulseNote(existing = [], text = '', typeOrExtras = 'text') {
  const extras = typeof typeOrExtras === 'string' ? { type: typeOrExtras } : typeOrExtras || {}
  const type = extras.type || 'text'
  const last = existing[existing.length - 1]?.color
  let color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]
  if (NOTE_COLORS.length > 1) {
    let guard = 0
    while (color === last && guard < 6) {
      color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]
      guard += 1
    }
  }
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: String(text || '').trim(),
    color,
    type,
    notebookId: extras.notebookId || 'my-notebook',
    cover: extras.cover || '#e1eef5',
    trashed: false,
    todos: type === 'todo' ? [{ id: 't1', text: '', done: false }] : undefined,
    updatedAt: Date.now(),
  }
}

export function loadAllPulseNotes(email, { trash = false } = {}) {
  return listPulseNoteDays(email)
    .flatMap((day) => loadPulseNotes(email, day).map((note) => ({ ...note, day })))
    .filter((note) => Boolean(note.trashed) === trash)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function splitNote(text) {
  const raw = String(text || '')
  const breakAt = raw.indexOf('\n')
  if (breakAt < 0) return { title: raw.trim() || '', body: '' }
  return { title: raw.slice(0, breakAt).trim(), body: raw.slice(breakAt + 1) }
}

export function joinNote(title, body) {
  const head = String(title || '').trim()
  const rest = String(body || '')
  if (!head) return rest
  if (!rest) return head
  return `${head}\n${rest}`
}

export function addPulseNote(email, text) {
  const notes = loadPulseNotes(email)
  const body = String(text || '').trim()
  if (!body) return notes
  return savePulseNotes(email, [...notes, createPulseNote(notes, body)])
}

/** One-line preview so large notes cannot stretch My Space. */
export function previewPulseNote(text, max = 88) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  if (compact.length <= max) return compact
  return `${compact.slice(0, max).trim()}…`
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Buildings,
  ClipboardText,
  FolderSimple,
  GearSix,
  MagnifyingGlass,
  Money,
  ShareNetwork,
  Star,
  Target,
} from '@phosphor-icons/react'

export const MORE_SERVICES = [
  { id: 'files', name: 'Files', Icon: FolderSimple },
  { id: 'engagement', name: 'Employee Engagement', Icon: ShareNetwork },
  { id: 'letters', name: 'HR Letters', Icon: Star },
  { id: 'travel', name: 'Travel', Icon: Star },
  { id: 'tasks', name: 'Tasks', Icon: ClipboardText },
  { id: 'compensation', name: 'Compensation', Icon: Money },
  { id: 'general', name: 'General', Icon: Buildings },
  { id: 'okr', name: 'OKR', Icon: Target },
]

/** Slide-out More Services launcher from the Pulse sidebar. */
export default function PulseMoreLauncher({ open, onClose, onSelect, onPreferences }) {
  const reduce = useReducedMotion()
  const [query, setQuery] = useState('')
  const searchRef = useRef(null)

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return MORE_SERVICES
    return MORE_SERVICES.filter((item) => item.name.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return undefined
    }
    const id = window.setTimeout(() => searchRef.current?.focus(), 180)
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="ms-more-scrim"
            aria-label="Close more services"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.aside
            className="ms-more"
            role="dialog"
            aria-label="More Services"
            initial={reduce ? { opacity: 0 } : { x: '-110%', opacity: 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: '-110%', opacity: 1 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <label className="ms-more-search">
              <MagnifyingGlass size={16} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Services"
                autoComplete="off"
              />
            </label>

            <header className="ms-more-head">
              <h2>More Services</h2>
              <button type="button" onClick={onPreferences}>
                Preferences
                <GearSix size={15} weight="fill" />
              </button>
            </header>

            <ul className="ms-more-list">
              {items.length === 0 ? (
                <li className="ms-more-empty">No matching services</li>
              ) : (
                items.map((item) => {
                  const Icon = item.Icon
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => onSelect(item)}>
                        <span aria-hidden="true">
                          <Icon size={18} />
                        </span>
                        {item.name}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}

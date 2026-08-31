import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChatCircleDots,
  ChatsCircle,
  Copy,
  MagnifyingGlass,
  User,
  X,
} from '@phosphor-icons/react'
import PulseSupportCta from './PulseSupportCta'
import './pulse-smart-chat.css'

function parseChatCommand(raw) {
  const text = String(raw || '').trim()
  if (!text) return null
  const mentions = [...text.matchAll(/@([^\s#@]+)/g)].map((m) => m[1])
  const titleMatch = text.match(/#([^\s@]+)/)
  const message = text
    .replace(/@[^\s#@]+/g, '')
    .replace(/#[^\s@]+/g, '')
    .trim()
  return {
    mentions,
    title: titleMatch ? titleMatch[1] : '',
    message,
    raw: text,
  }
}

/** Bottom Smart Chat bar + Ctrl+Space launcher for Pulse. */
export default function PulseSmartChat() {
  const [open, setOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportSession, setSupportSession] = useState(0)
  const [tab, setTab] = useState('chats')
  const [query, setQuery] = useState('')
  const [composer, setComposer] = useState('')
  const [tipsOpen, setTipsOpen] = useState(false)
  const [chats, setChats] = useState([])
  const [invites, setInvites] = useState([])
  const searchRef = useRef(null)
  const barInputRef = useRef(null)
  const rootRef = useRef(null)

  const openPanel = (nextTab = 'chats') => {
    setSupportOpen(false)
    setTab(nextTab)
    setOpen(true)
    setTipsOpen(false)
    window.setTimeout(() => searchRef.current?.focus(), 0)
  }

  const closePanel = () => {
    setOpen(false)
    setTipsOpen(false)
    setQuery('')
  }

  const openSupport = () => {
    setOpen(false)
    setTipsOpen(false)
    setSupportSession((n) => n + 1)
    setSupportOpen(true)
  }

  const closeSupport = () => setSupportOpen(false)

  useEffect(() => {
    const onKey = (e) => {
      const isCtrlSpace = e.code === 'Space' && (e.ctrlKey || e.metaKey)
      if (isCtrlSpace) {
        e.preventDefault()
        setOpen((wasOpen) => {
          const next = !wasOpen
          if (next) {
            setSupportOpen(false)
            setTab('chats')
            setTipsOpen(false)
            window.setTimeout(() => searchRef.current?.focus(), 0)
          }
          return next
        })
        return
      }
      if (e.key === 'Escape' && (open || supportOpen)) {
        e.preventDefault()
        closePanel()
        closeSupport()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, supportOpen])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setTipsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return invites
    return invites.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    )
  }, [query, invites])

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chats
    return chats.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q),
    )
  }, [chats, query])

  const inviteFromSearch = () => {
    const email = query.trim()
    if (!email.includes('@')) return
    if (invites.some((i) => i.email.toLowerCase() === email.toLowerCase())) return
    const name = email.split('@')[0]
    setInvites((list) => [
      ...list,
      { id: `inv-${Date.now()}`, name, email },
    ])
    setTab('contacts')
    setQuery('')
  }

  const startChatWith = (contact) => {
    const existing = chats.find((c) => c.contactId === contact.id)
    if (existing) {
      setTab('chats')
      setQuery('')
      return
    }
    setChats((list) => [
      {
        id: `chat-${Date.now()}`,
        contactId: contact.id,
        title: contact.name,
        preview: 'Chat started',
        at: Date.now(),
      },
      ...list,
    ])
    setTab('chats')
    setQuery('')
  }

  const sendComposer = (raw) => {
    const source = String(raw ?? composer).trim()
    if (!source) return
    const parsed = parseChatCommand(source)
    if (!parsed) return

    const title =
      parsed.title ||
      (parsed.mentions.length > 1
        ? parsed.mentions.join(', ')
        : parsed.mentions[0] || 'New chat')

    setChats((list) => [
      {
        id: `chat-${Date.now()}`,
        contactId: null,
        title: title.startsWith('#') ? title.slice(1) : title,
        preview: parsed.message || source,
        at: Date.now(),
      },
      ...list,
    ])
    setComposer('')
    setQuery('')
    setTab('chats')
    setOpen(true)
  }

  const openNotebook = () => {
    window.open('/coming-soon?app=Notebook', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="psc-root" ref={rootRef}>
      {open ? (
        <div className="psc-panel" role="dialog" aria-label="Smart Chat">
          <button type="button" className="psc-close" aria-label="Close" onClick={closePanel}>
            <X size={14} weight="bold" />
          </button>

          <div className="psc-search-row">
            <MagnifyingGlass size={18} weight="bold" className="psc-search-ico" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (query.includes('@') || query.includes('#')) {
                    sendComposer(query)
                  } else if (query.includes('@')) {
                    inviteFromSearch()
                  } else if (query.includes('.')) {
                    inviteFromSearch()
                  }
                }
              }}
              placeholder="Search Contacts & Chats"
              aria-label="Search Contacts & Chats"
            />
            <div className="psc-tips-wrap">
              <button
                type="button"
                className={`psc-bulb${tipsOpen ? ' is-on' : ''}`}
                aria-label="Tips"
                aria-expanded={tipsOpen}
                onClick={() => setTipsOpen((v) => !v)}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M9 21h6v-1.5H9V21zm3-19a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"
                  />
                </svg>
              </button>
              {tipsOpen ? (
                <div className="psc-tips" role="note">
                  <p className="psc-tips-title">Tips</p>
                  <div className="psc-tip-row">
                    <span>Start a 1:1 Chat</span>
                    <div className="psc-tip-eg">
                      <i className="is-at">@name</i>
                      <em>Eg:@Priya Hello</em>
                    </div>
                  </div>
                  <div className="psc-tip-row">
                    <span>Start a group chat</span>
                    <div className="psc-tip-eg">
                      <i className="is-at">@name1</i>
                      <i className="is-at">@name2</i>
                      <i className="is-hash">#chat-title</i>
                      <i className="is-msg">message</i>
                      <em>Eg:@Priya @Aarav #Marketing Hello</em>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="psc-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'chats'}
              className={tab === 'chats' ? 'is-on' : undefined}
              onClick={() => setTab('chats')}
            >
              Chats
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'contacts'}
              className={tab === 'contacts' ? 'is-on' : undefined}
              onClick={() => setTab('contacts')}
            >
              Contacts
            </button>
          </div>

          <div className="psc-columns">
            <section className={`psc-col${tab === 'chats' ? ' is-active' : ''}`} aria-label="Chats">
              <h3>Chats</h3>
              {filteredChats.length === 0 ? (
                <p className="psc-empty">No more chats</p>
              ) : (
                <ul className="psc-list">
                  {filteredChats.map((chat) => (
                    <li key={chat.id}>
                      <button type="button" className="psc-list-item">
                        <span className="psc-avatar" aria-hidden="true">
                          {chat.title.slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          <strong>{chat.title}</strong>
                          <small>{chat.preview}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              className={`psc-col${tab === 'contacts' ? ' is-active' : ''}`}
              aria-label="Contacts"
            >
              <h3>Contacts</h3>
              {filteredContacts.length === 0 ? (
                <p className="psc-empty is-contacts">
                  All your contacts will be listed here. Enter email addresses of users in the
                  search box to invite them here.
                </p>
              ) : query.trim() && filteredContacts.length === 0 ? (
                <p className="psc-empty is-contacts">No contacts match your search.</p>
              ) : (
                <ul className="psc-list">
                  {filteredContacts.map((contact) => (
                    <li key={contact.id}>
                      <button
                        type="button"
                        className="psc-list-item"
                        onClick={() => startChatWith(contact)}
                      >
                        <span className="psc-avatar is-user" aria-hidden="true">
                          <User size={16} weight="bold" />
                        </span>
                        <span>
                          <strong>{contact.name}</strong>
                          <small>{contact.email}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {query.includes('@') && filteredContacts.length === 0 ? (
                <button type="button" className="psc-invite" onClick={inviteFromSearch}>
                  Invite {query.trim()}
                </button>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}

      {supportOpen ? (
        <PulseSupportCta key={supportSession} open={supportOpen} startView="home" />
      ) : null}

      <div className="psc-bar">
        <div className="psc-nav-rail" role="tablist" aria-label="Smart Chat sections">
          <button
            type="button"
            className={`psc-nav psc-nav-label${tab === 'chats' ? ' is-on' : ''}`}
            aria-selected={tab === 'chats'}
            role="tab"
            onClick={() => openPanel('chats')}
          >
            <ChatsCircle size={16} weight="fill" />
            <span>Chats</span>
          </button>
          <i className="psc-divider" aria-hidden="true" />
          <button
            type="button"
            className={`psc-nav psc-nav-label${tab === 'contacts' ? ' is-on' : ''}`}
            aria-selected={tab === 'contacts'}
            role="tab"
            onClick={() => openPanel('contacts')}
          >
            <User size={16} weight="fill" />
            <span>Contacts</span>
          </button>
          <i className="psc-divider" aria-hidden="true" />
        </div>

        <div className="psc-bar-input-wrap">
          <input
            ref={barInputRef}
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onFocus={() => openPanel(tab)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                sendComposer()
              }
            }}
            placeholder="Here is your Smart Chat (Ctrl+Space)"
            aria-label="Smart Chat"
          />
        </div>

        <div className="psc-nav-rail psc-nav-rail-end">
          <i className="psc-divider" aria-hidden="true" />
          <button
            type="button"
            className="psc-nav is-on"
            aria-label={supportOpen ? 'Close support' : 'Support chat'}
            title={supportOpen ? 'Close support' : 'Chat with support'}
            aria-pressed={supportOpen}
            onClick={() => {
              if (supportOpen) closeSupport()
              else openSupport()
            }}
          >
            {supportOpen ? (
              <X size={16} weight="bold" />
            ) : (
              <ChatCircleDots size={16} weight="fill" />
            )}
          </button>
          <i className="psc-divider" aria-hidden="true" />
          <button
            type="button"
            className="psc-nav"
            aria-label="Notebook"
            title="Notebook"
            onClick={openNotebook}
          >
            <Copy size={16} weight="regular" />
          </button>
        </div>
      </div>
    </div>
  )
}

import { useMemo, useState, useRef, useEffect } from 'react'
import { Search, AlertCircle } from 'lucide-react'

// ───────────────────────────────────────────────────────────────
// InputField - labeled input with optional leading icon
// ───────────────────────────────────────────────────────────────
export function InputField({
  label,
  value,
  onChange,
  type = 'text',
  icon: Icon,
  required,
  placeholder,
  error,
  hint,
  min,
  max,
  disabled,
  className = '',
  name,
  autoComplete,
  onKeyDown,
}) {
  const handleKeyDown = (e) => {
    if (type === 'number' && (e.key === '-' || e.key === 'e' || e.key === '+')) {
      e.preventDefault()
    }
    onKeyDown?.(e)
  }

  return (
    <div className={`form-field ${className}`} style={{ marginBottom: 28 }}>
      {label && (
        <label className="label">
          {label}
          {required && <span style={{ color: 'var(--primary)', marginLeft: 4 }}>*</span>}
        </label>
      )}
      <div className={Icon ? 'input-wrap' : ''}>
        {Icon && <Icon size={16} className="input-icon" />}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          disabled={disabled}
          autoComplete={autoComplete}
          className="input-field"
          style={{ width: '100%', paddingLeft: Icon ? 42 : 14 }}
        />
      </div>
      {error && <div className="text-xs" style={{ color: '#991b1b', marginTop: 4, fontSize: 12 }}>{error}</div>}
      {hint && <div className="text-muted" style={{ marginTop: 4, fontSize: 12 }}>{hint}</div>}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// SelectField - styled <select> matching InputField
// ───────────────────────────────────────────────────────────────
export function SelectField({
  label,
  value,
  onChange,
  options = [],
  required,
  placeholder,
  disabled,
  className = '',
}) {
  return (
    <div className={className} style={{ marginBottom: 28 }}>
      {label && (
        <label className="label">
          {label}
          {required && <span style={{ color: 'var(--primary)', marginLeft: 4 }}>*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input-field"
        style={{ width: '100%', padding: '10px 14px' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// SegmentedControl - pill toggle for Employee/Intern
// ───────────────────────────────────────────────────────────────
export function SegmentedControl({
  options = [],
  value,
  onChange,
  className = '',
  style = {},
}) {
  return (
    <div className={`segmented ${className}`} style={style}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`segmented__btn ${value === opt.value ? 'active' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Toggle - iOS-style switch for Statutory Automation
// ───────────────────────────────────────────────────────────────
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  className = '',
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`toggle ${checked ? 'on' : ''} ${className}`}
        aria-pressed={checked}
      >
        <span className="toggle__thumb" />
      </button>
      {label && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</span>}
    </label>
  )
}

// ───────────────────────────────────────────────────────────────
// Modal - backdrop + dialog using .modal-overlay / .modal-panel
// ───────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md', // sm | md | lg
  className = '',
}) {
  if (!open) return null

  const sizeClass = size === 'sm' ? 'modal-panel--sm' : size === 'lg' ? 'modal-panel--lg' : ''

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-panel ${sizeClass} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-panel__header">
            <h3 className="panel-title">{title}</h3>
          </div>
        )}
        <div className="modal-panel__body">{children}</div>
        {footer && <div className="modal-panel__footer">{footer}</div>}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// EmptyState - centered placeholder
// ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      {Icon && <Icon size={40} style={{ marginBottom: 12, color: 'var(--text-light)' }} />}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h3>
      {description && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Avatar - circular user initial
// ───────────────────────────────────────────────────────────────
export function Avatar({
  name = '',
  src,
  size = '', // lg | sm or number
  className = '',
  style = {},
}) {
  const initials = useMemo(() => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }, [name])

  const isNumericSize = typeof size === 'number' || (typeof size === 'string' && size.trim() !== '' && !isNaN(size))
  const numericSize = isNumericSize ? Number(size) : null

  const sizeClass = size === 'lg' ? 'avatar--lg' : size === 'sm' ? 'avatar--sm' : ''
  const mergedStyle = numericSize
    ? {
        width: numericSize,
        height: numericSize,
        minWidth: numericSize,
        minHeight: numericSize,
        fontSize: Math.max(10, numericSize * 0.4),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style
      }
    : { flexShrink: 0, ...style }

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`avatar ${sizeClass} ${className}`}
        style={{ objectFit: 'cover', ...mergedStyle }}
      />
    )
  }

  return (
    <div className={`avatar ${sizeClass} ${className}`} style={mergedStyle}>
      {initials}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// StepLabel - step indicator for Payroll Engine
// ───────────────────────────────────────────────────────────────
export function StepLabel({ num, label, active, completed, className = '' }) {
  const isInactive = !active && !completed
  return (
    <div className={`stepper__item ${className}`}>
      <div
        className={`stepper__dot ${active ? 'stepper__dot--active' : ''}`}
        style={{
          opacity: active || completed ? 1 : 0.75,
        }}
      >
        {completed ? '✓' : num}
      </div>
      <span
        className={`stepper__label ${active ? 'stepper__label--active' : ''}`}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: active ? 'var(--primary)' : 'var(--text-muted)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// StatCard - compact stat for dashboards
// ───────────────────────────────────────────────────────────────
export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'var(--primary)',
  onClick,
  className = '',
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`stat-card ${onClick ? 'stat-card--clickable' : ''} ${className}`}
      style={{
        textDecoration: 'none',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textAlign: 'left',
        width: '100%',
        background: color.startsWith('#') ? `${color}0c` : 'rgba(148, 163, 184, 0.04)',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div className="stat-icon" style={{ background: `${color}18`, color, width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {Icon && <Icon size={18} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.02 }}>
          {value}
        </div>
        {trend && (
          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4, color }}>
            {trend}
          </div>
        )}
      </div>
    </Wrapper>
  )
}

// ─────────��─��───────────────────────────────────────────────────
// Card - simple info row for payslip detail pages
// ───────────────────────────────────────────────────────────────
export function Card({
  title,
  children,
  className = '',
  noPadding = false,
}) {
  return (
    <div className={`section-card ${className}`}>
      {title && (
        <div className="section-card__header">
          <h3 className="section-card__title">{title}</h3>
        </div>
      )}
      <div className={`section-card__body ${noPadding ? '' : ''}`} style={noPadding ? { padding: 0 } : {}}>
        {children}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// InfoRow - key-value pair for detail cards
// ───────────────────────────────────────────────────────────────
export function InfoRow({
  label,
  value,
  className = '',
}) {
  return (
    <div className={`preview-row ${className}`}>
      <span className="preview-row__label">{label}</span>
      <span className="preview-row__value">{value || '-'}</span>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Badge - status indicator
// ───────────────────────────────────────────────────────────────
export function Badge({
  variant = 'green', // green | blue | red | amber | slate
  children,
  className = '',
}) {
  const variantClass = `pill--${variant}`
  return (
    <span className={`pill ${variantClass} ${className}`}>
      {children}
    </span>
  )
}

// ───────────────────────────────────────────────────────────────
// ActionBtn - icon button for table rows
// ───────────────────────────────────────────────────────────────
export function ActionBtn({
  icon: Icon,
  label,
  onClick,
  variant = 'ghost', // ghost | danger
  disabled,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn-icon ${variant === 'danger' ? 'btn-danger' : 'btn-ghost'}`}
      title={label}
      style={{ width: 32, height: 32 }}
    >
      {Icon && <Icon size={16} />}
    </button>
  )
}

// ───────────────────────────────────────────────────────────────
// SearchInput - search bar with icon
// ───────────────────────────────────────────────────────────────
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) {
  return (
    <div className={`search-bar ${className}`}>
      <Search size={16} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
        style={{ flex: 1 }}
      />
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// StaffSearchDropdown - searchable combobox for staff selection
// Props:
//   staffList   - array of staff objects from /staff API
//   onSelect    - called with the selected staff object
//   placeholder - input placeholder text
//   label       - field label
// ───────────────────────────────────────────────────────────────
export function StaffSearchDropdown({
  staffList = [],
  onSelect,
  placeholder = 'Search by name or Employee ID…',
  label = 'Auto-fill from Team Directory',
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [selected, setSelected] = useState(null)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Filter staff by name or employeeId
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return staffList.slice(0, 50) // show first 50 when no query
    return staffList.filter(s =>
      s.fullName?.toLowerCase().includes(q) ||
      s.employeeId?.toLowerCase().includes(q)
    ).slice(0, 50)
  }, [staffList, query])

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx]
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIdx])

  const handleSelect = (staff) => {
    setSelected(staff)
    setQuery('')
    setOpen(false)
    setActiveIdx(-1)
    onSelect(staff)
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setOpen(false)
    onSelect(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(filtered[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ marginBottom: 28, position: 'relative' }} ref={wrapRef}>
      {label && (
        <label className="label" style={{ marginBottom: 8, display: 'block' }}>
          {label}
        </label>
      )}

      {/* Input row */}
      <div
        className="input-field"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px', cursor: 'text',
          border: open ? '2px solid var(--primary)' : '1px solid var(--border)',
          borderRadius: 8, background: 'var(--surface)', transition: 'border-color .15s'
        }}
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
      >
        <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

        {selected && !open ? (
          /* Chip showing selected employee */
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '9px 0' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selected.fullName}
            </span>
            {selected.employeeId && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {selected.employeeId}
              </span>
            )}
            <span style={{
              marginLeft: 'auto', flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 7px',
              borderRadius: 999, background: selected.type === 'Intern' ? '#eff6ff' : '#e5ebdd',
              color: selected.type === 'Intern' ? '#1d4ed8' : '#58833b',
              border: `1px solid ${selected.type === 'Intern' ? '#bfdbfe' : 'rgba(88,131,59,.25)'}`,
            }}>
              {selected.type}
            </span>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selected ? `Change: ${selected.fullName}` : placeholder}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              flex: 1, fontSize: 13, color: 'var(--text)', padding: '10px 0',
              fontFamily: 'inherit'
            }}
          />
        )}

        {selected && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear() }}
            style={{
              flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '2px 4px',
              borderRadius: 4, display: 'flex', alignItems: 'center'
            }}
            title="Clear selection"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown list */}
      {open && (
        <div
          ref={listRef}
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 9999, maxHeight: 280, overflowY: 'auto',
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              No team members found
            </div>
          ) : (
            filtered.map((s, i) => (
              <div
                key={s._id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', cursor: 'pointer',
                  background: activeIdx === i ? 'rgba(88,131,59,.07)' : 'transparent',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background .1s',
                }}
              >
                {/* Avatar initial */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: s.type === 'Intern' ? '#eff6ff' : 'var(--primary-tint, #e5ebdd)',
                  color: s.type === 'Intern' ? '#1d4ed8' : 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800,
                }}>
                  {(s.fullName || '?')[0].toUpperCase()}
                </div>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.fullName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {[s.employeeId, s.designation, s.department].filter(Boolean).join(' · ') || s.email}
                  </div>
                </div>

                {/* Type and profile completeness badges */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{
                    flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 7px',
                    borderRadius: 999,
                    background: s.type === 'Intern' ? '#eff6ff' : '#e5ebdd',
                    color: s.type === 'Intern' ? '#1d4ed8' : '#58833b',
                    border: `1px solid ${s.type === 'Intern' ? '#bfdbfe' : 'rgba(88,131,59,.25)'}`,
                  }}>
                    {s.type}
                  </span>
                  {!s.profileCompleted && (
                    <span style={{
                      flexShrink: 0, fontSize: 9, fontWeight: 800, padding: '2px 6px',
                      borderRadius: 999, background: '#fef2f2', color: '#dc2626',
                      border: '1px solid #fca5a5', textTransform: 'uppercase', letterSpacing: '0.02em'
                    }}>
                      Incomplete
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Re-export helpers for convenience
export { AlertCircle }

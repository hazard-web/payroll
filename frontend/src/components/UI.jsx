import { useMemo } from 'react'
import { Search, AlertCircle } from 'lucide-react'

// ───────────────────────────────────────────────────────────────
// InputField — labeled input with optional leading icon
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
    <div className={`form-field ${className}`} style={{ marginBottom: 20 }}>
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
// SelectField — styled <select> matching InputField
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
    <div className={className} style={{ marginBottom: 20 }}>
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
// SegmentedControl — pill toggle for Employee/Intern
// ───────────────────────────────────────────────────────────────
export function SegmentedControl({
  options = [],
  value,
  onChange,
  className = '',
}) {
  return (
    <div className={`segmented ${className}`}>
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
// Toggle — iOS-style switch for Statutory Automation
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
// Modal — backdrop + dialog using .modal-overlay / .modal-panel
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
// EmptyState — centered placeholder
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
// Avatar — circular user initial
// ───────────────────────────────────────────────────────────────
export function Avatar({
  name = '',
  src,
  size = '', // lg | sm
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

  const sizeClass = size === 'lg' ? 'avatar--lg' : size === 'sm' ? 'avatar--sm' : ''

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`avatar ${sizeClass} ${className}`}
        style={{ objectFit: 'cover', ...style }}
      />
    )
  }

  return (
    <div className={`avatar ${sizeClass} ${className}`} style={style}>
      {initials}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// StepLabel — step indicator for Payroll Engine
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
// StatCard — compact stat for dashboards
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
      style={{ textDecoration: 'none', border: 0, textAlign: 'left', width: '100%' }}
    >
      <div className="stat-icon" style={{ background: `${color}15`, color }}>
        {Icon && <Icon size={20} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="text-muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.02 }}>
          {value}
        </div>
        {trend && (
          <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color }}>
            {trend}
          </div>
        )}
      </div>
    </Wrapper>
  )
}

// ─────────��─��───────────────────────────────────────────────────
// Card — simple info row for payslip detail pages
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
// InfoRow — key-value pair for detail cards
// ───────────────────────────────────────────────────────────────
export function InfoRow({
  label,
  value,
  className = '',
}) {
  return (
    <div className={`preview-row ${className}`}>
      <span className="preview-row__label">{label}</span>
      <span className="preview-row__value">{value || '—'}</span>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Badge — status indicator
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
// ActionBtn — icon button for table rows
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
// SearchInput — search bar with icon
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

// Re-export helpers for convenience
export { AlertCircle }

import { ArrowLeft } from 'lucide-react'
import { Loader2 } from 'lucide-react'

/**
 * Standard page container — use inside Layout / PortalLayout viewport.
 * Handles max-width only; padding comes from .page-viewport on the layout.
 */
export default function PageShell({ children, wide, narrow, fullWidth, className = '', ...props }) {
  const classes = [
    'page-shell',
    wide && 'page-shell--wide',
    narrow && 'page-shell--narrow',
    fullWidth && 'page-shell--full',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions, back, onBack }) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        {back && (
          <button type="button" className="page-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            {typeof back === 'string' ? back : 'Back'}
          </button>
        )}
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}

export function SectionCard({ title, subtitle, children, className = '', noPadding }) {
  return (
    <section className={`section-card ${className}`.trim()}>
      {(title || subtitle) && (
        <div className="section-card__header">
          {title && <h3 className="section-card__title">{title}</h3>}
          {subtitle && <p className="section-card__subtitle">{subtitle}</p>}
        </div>
      )}
      <div className={noPadding ? '' : 'section-card__body'}>{children}</div>
    </section>
  )
}

export function TableCard({ children, className = '' }) {
  return (
    <div className={`table-card ${className}`.trim()}>
      {children}
    </div>
  )
}

export function TabBar({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`tabs-bar ${className}`.trim()}>
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`tab-btn${active === id ? ' active' : ''}`}
          onClick={() => onChange(id)}
        >
          {Icon && <Icon size={15} />}
          {label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ message, children }) {
  return (
    <div className="empty-state">
      {children}
      <p>{message}</p>
    </div>
  )
}

export function PageLoading({ label = 'Loading…' }) {
  return (
    <div className="page-loading">
      <Loader2 size={36} className="animate-spin" />
      <span>{label}</span>
    </div>
  )
}

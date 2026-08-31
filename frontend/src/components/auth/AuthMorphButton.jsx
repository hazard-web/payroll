/**
 * Next / Sign in morph button.
 * Loading: width morphs 100% → 44px circle (transition), label collapses,
 * ::before spinner spins. On error, class removed → expands back to full button.
 * Same DOM stays mounted so width can animate (do not swap for a spinner-only node).
 */
export default function AuthMorphButton({
  loading = false,
  children = 'Next',
  type = 'submit',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  return (
    <button
      type={type}
      className={`auth-btn${loading ? ' is-loading' : ''}${className ? ` ${className}` : ''}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
    >
      <span className={`auth-btn-label${loading ? ' is-hidden' : ''}`}>{children}</span>
    </button>
  )
}

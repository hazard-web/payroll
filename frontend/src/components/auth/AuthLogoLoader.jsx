import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './auth-loader.css'

const DEFAULT_MS = 900

export function AuthLogoLoader({ show = false, label = 'Loading' }) {
  if (!show) return null
  return (
    <div className="auth-logo-load" role="status" aria-live="polite" aria-label={label}>
      <span className="auth-logo-load-mark" aria-hidden="true">
        <i style={{ background: '#e42527' }} />
        <i style={{ background: '#f5c400' }} />
        <i style={{ background: '#21a05a' }} />
        <i style={{ background: '#408dfb' }} />
      </span>
    </div>
  )
}

/** Shows People OS logo loader, then navigates. */
export function useAuthRedirect(delayMs = DEFAULT_MS) {
  const navigate = useNavigate()
  const [redirecting, setRedirecting] = useState(false)
  const [target, setTarget] = useState(null)

  useEffect(() => {
    if (!redirecting || !target) return undefined
    const t = window.setTimeout(() => {
      navigate(target.to, target.options || { replace: true })
    }, delayMs)
    return () => window.clearTimeout(t)
  }, [redirecting, target, navigate, delayMs])

  const redirectTo = useCallback((to, options = { replace: true }) => {
    if (redirecting) return
    setTarget({ to, options })
    setRedirecting(true)
  }, [redirecting])

  const onRedirectClick = useCallback(
    (to, options = { replace: true }) =>
      (e) => {
        e.preventDefault()
        redirectTo(to, options)
      },
    [redirectTo],
  )

  return { redirecting, redirectTo, onRedirectClick }
}

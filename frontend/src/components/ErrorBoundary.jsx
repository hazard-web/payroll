import { Component } from 'react'

/**
 * ErrorBoundary - catches any uncaught render error in the React tree and
 * shows a friendly fallback instead of a blank page. Without this, a
 * single throw anywhere in the tree silently kills the whole UI, and the
 * user sees "the app isn't working" with no way to debug.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface the real error to the console so devs (and the user's
    // browser DevTools) can see what's actually broken.
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', info?.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  handleReload = () => {
    // Clear caches and reload - useful when the error is a stale chunk
    // (e.g. service worker serving an old index.html for a new route).
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister())
      })
    }
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--bg, #f4f6fa)',
          color: 'var(--text, #1a1a1a)',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: '100%',
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: 12,
            padding: 32,
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.08)',
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: '#b91c1c' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>
            The app hit an unexpected error. This has been logged to the browser console
            with full details.
          </p>
          <pre
            style={{
              fontSize: 12,
              background: '#f4f6fa',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12,
              overflow: 'auto',
              maxHeight: 180,
              margin: '0 0 20px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#991b1b',
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#58833b',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#374151',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Clear cache & reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
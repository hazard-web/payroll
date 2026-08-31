import './pulse-open.css'

/** Simple loading screen for Pulse routes (new tab / auth wait). */
export default function PulseLoading({ label = 'Loading Pulse...' }) {
  return (
    <div className="pulse-loading" role="status" aria-live="polite" aria-label={label}>
      <span className="pulse-loading-ring" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

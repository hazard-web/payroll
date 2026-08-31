/** People OS brand mark - four-square grid (red / amber / green / blue). */
export default function PeopleOsMark({ size = 18, className = '', title = 'People OS' }) {
  const gap = Math.max(1, Math.round(size * 0.08))
  const cell = Math.floor((size - gap) / 2)
  const radius = Math.max(1, Math.round(cell * 0.18))
  const cellStyle = (background) => ({
    display: 'block',
    width: cell,
    height: cell,
    borderRadius: radius,
    background,
  })

  return (
    <span
      className={`people-os-mark${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={title}
      style={{
        display: 'inline-grid',
        gridTemplateColumns: `${cell}px ${cell}px`,
        gap,
        width: size,
        height: size,
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      <i style={cellStyle('#e42527')} />
      <i style={cellStyle('#f5c400')} />
      <i style={cellStyle('#21a05a')} />
      <i style={cellStyle('#2b8aed')} />
    </span>
  )
}

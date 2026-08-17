export default function Card({ title, sub, badge, onClick, children, accentColor }) {
  const handleKeyDown = onClick
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.key === ' ') e.preventDefault()
          onClick(e)
        }
      }
    : undefined

  return (
    <div
      className={`card${onClick ? ' clickable' : ''}`}
      style={accentColor ? { '--card-accent': accentColor } : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          {sub ? <div className="card-sub">{sub}</div> : null}
        </div>
        {badge ? <span className="card-badge">{badge}</span> : null}
      </div>
      {children ? <div className="card-body">{children}</div> : null}
    </div>
  )
}

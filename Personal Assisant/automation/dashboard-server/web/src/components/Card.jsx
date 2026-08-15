export default function Card({ title, sub, badge, onClick, children }) {
  return (
    <div className={`card${onClick ? ' clickable' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
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

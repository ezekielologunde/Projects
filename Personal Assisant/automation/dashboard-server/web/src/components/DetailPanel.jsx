import { useEffect, useState } from 'react'

export default function DetailPanel({ kind, id, title, sub, note, onClose }) {
  const [related, setRelated] = useState(null)

  useEffect(() => {
    setRelated(null)
    fetch(`/api/related?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((r) => setRelated(r.related))
  }, [kind, id])

  return (
    <div className="detail-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="detail-panel">
        <button className="detail-close" onClick={onClose} aria-label="Close">×</button>
        <h2>{title}</h2>
        {sub ? <div className="detail-sub">{sub}</div> : null}
        {note ? <p className="detail-note">{note}</p> : null}
        <div className="detail-related-head">Related</div>
        {related === null ? (
          <div className="detail-loading">loading…</div>
        ) : related.length === 0 ? (
          <div className="detail-empty">nothing else on file relates to this yet.</div>
        ) : (
          <ul className="detail-related-list">
            {related.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <span className="detail-related-kind">{r.kind}</span> <span className="detail-related-label">{r.label}</span> — <span className="detail-related-sub">{r.sub}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

import { useRef, useState } from 'react'
import Card from './Card'

export default function DatedList({ items, title, fetchPath, emptyMessage, accentColor }) {
  const [open, setOpen] = useState(null)
  const [content, setContent] = useState('')
  const requestedDate = useRef(null)

  function openDate(date) {
    requestedDate.current = date
    setOpen(date)
    setContent('loading…')
    fetch(`${fetchPath}?date=${encodeURIComponent(date)}`)
      .then((res) => res.text())
      .then((text) => {
        if (requestedDate.current === date) setContent(text)
      })
  }

  if (!items.length) return <div className="empty">{emptyMessage}</div>

  return (
    <div className="page-list">
      {items.map((item) => (
        <Card key={item.date} title={item.date} onClick={() => openDate(item.date)} accentColor={accentColor} />
      ))}
      {open && (
        <div className="detail-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null) }}>
          <div className="detail-panel">
            <button className="detail-close" onClick={() => setOpen(null)} aria-label="Close">×</button>
            <h2>{open}</h2>
            <pre className="detail-raw">{content}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

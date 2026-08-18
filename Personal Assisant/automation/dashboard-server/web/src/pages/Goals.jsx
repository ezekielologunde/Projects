import { useState } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'
import DetailPanel from '../components/DetailPanel'
import { NAV_ITEMS } from '../components/NavItems'

const MODULE = NAV_ITEMS.find((n) => n.key === 'goals')

export default function Goals() {
  const { data, loading, error } = useDashboardData()
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)

  if (loading) return <div className="loading">loading…</div>
  if (error) return <div className="error-state">Couldn't load dashboard data — try refreshing.</div>
  if (!data) return null

  const statuses = [...new Set(data.goals.map((g) => g.status))]
  const filtered = filter === 'all' ? data.goals : data.goals.filter((g) => g.status === filter)

  return (
    <div className="page">
      <div className="page-header" style={{ '--item-color': MODULE.color }}>
        <span className="page-header-icon">{MODULE.icon}</span>
        <h2>goals</h2>
      </div>
      <div className="filter-pills">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
        {statuses.map((s) => (
          <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>
      <div className="page-list">
        {filtered.map((g, i) => (
          // key includes the array index as a tiebreaker for React only —
          // DetailPanel's id below still resolves by title, which
          // cross-links.js matches by exact string; two goals sharing a
          // title would show the wrong related-items panel, a known
          // limitation of the current no-id data schema.
          <Card key={`${g.title}-${i}`} title={g.title} sub={g.category} badge={g.status} accentColor={MODULE.color} onClick={() => setOpen(g)}>
            {g.target_date ? `target ${g.target_date} — ` : ''}{g.notes || ''}
          </Card>
        ))}
      </div>
      {open && (
        <DetailPanel
          kind="goal" id={open.title} title={open.title} sub={`${open.category} · ${open.status}`}
          note={open.notes} onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

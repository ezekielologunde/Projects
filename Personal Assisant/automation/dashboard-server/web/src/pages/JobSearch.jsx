import { useState } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'
import DetailPanel from '../components/DetailPanel'

export default function JobSearch() {
  const { data, loading, error } = useDashboardData()
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)

  if (loading) return <div className="loading">loading…</div>
  if (error) return <div className="error-state">Couldn't load dashboard data — try refreshing.</div>
  if (!data) return null

  const statuses = [...new Set(data.applications.map((a) => a.status))]
  const filtered = filter === 'all' ? data.applications : data.applications.filter((a) => a.status === filter)

  return (
    <div className="page">
      <h2>job search</h2>
      <div className="filter-pills">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
        {statuses.map((s) => (
          <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s.replace(/_/g, ' ')}</button>
        ))}
      </div>
      <div className="page-list">
        {filtered.map((a) => (
          <Card key={a.folder} title={a.company} sub={a.role} badge={<span className={a.status === 'interview' ? 'pulse' : undefined}>{a.status.replace(/_/g, ' ')}</span>} onClick={() => setOpen(a)}>
            found {a.found_at}{a.notes ? ` — ${a.notes}` : ''}
          </Card>
        ))}
      </div>
      {open && (
        <DetailPanel
          kind="application" id={open.folder} title={open.company} sub={open.role}
          note={open.notes} onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

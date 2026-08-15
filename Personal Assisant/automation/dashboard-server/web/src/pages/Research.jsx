import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'

export default function Research() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  const r = data.research
  if (!r) return <div className="page"><h2>doctoral research</h2><div className="empty">not set up yet.</div></div>

  return (
    <div className="page">
      <h2>doctoral research</h2>
      <Card title={r.program.degree} sub={`${r.program.institution} · ${r.program.location} · expected ${r.program.expected} · ${r.program.status}`} />
      <Card title="research areas">
        {r.research_areas.map((a, i) => <div key={i}>{a}</div>)}
      </Card>
      {r.publications?.source && (
        <Card title="publications" sub={r.publications.source}>
          {r.publications.note || ''}
        </Card>
      )}
      {r._meta?.open_items?.length > 0 && (
        <Card title="still needs your input">
          {r._meta.open_items.map((item, i) => <div key={i}>{item}</div>)}
        </Card>
      )}
    </div>
  )
}

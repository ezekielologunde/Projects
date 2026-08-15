import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'

const OWNERSHIP_LABELS = {
  own_venture: 'own venture',
  client_work: 'client work',
  likely_client_or_ministry: 'likely client/ministry',
  unconfirmed: 'ownership unconfirmed',
}

export default function Projects() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  const pr = data.projectsRegistry
  if (!pr) return <div className="page"><h2>projects registry</h2><div className="empty">not set up yet.</div></div>

  return (
    <div className="page">
      <h2>projects registry</h2>
      {pr.projects.map((p) => (
        <Card key={p.name} title={p.name} sub={p.type} badge={OWNERSHIP_LABELS[p.ownership] || p.ownership}>
          {p.status} — {p.note}
        </Card>
      ))}
      {pr._meta?.open_items?.length > 0 && (
        <Card title="still needs your input">
          {pr._meta.open_items.map((item, i) => <div key={i}>{item}</div>)}
        </Card>
      )}
    </div>
  )
}

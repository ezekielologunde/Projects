import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'
import { NAV_ITEMS } from '../components/NavItems'

const OWNERSHIP_LABELS = {
  own_venture: 'own venture',
  client_work: 'client work',
  likely_client_or_ministry: 'likely client/ministry',
  unconfirmed: 'ownership unconfirmed',
}
const MODULE = NAV_ITEMS.find((n) => n.key === 'projects')

function PageHeader() {
  return (
    <div className="page-header" style={{ '--item-color': MODULE.color }}>
      <span className="page-header-icon">{MODULE.icon}</span>
      <h2>projects registry</h2>
    </div>
  )
}

export default function Projects() {
  const { data, loading, error } = useDashboardData()
  if (loading) return <div className="loading">loading…</div>
  if (error) return <div className="error-state">Couldn't load dashboard data — try refreshing.</div>
  if (!data) return null
  const pr = data.projectsRegistry
  if (!pr) return <div className="page"><PageHeader /><div className="empty">not set up yet.</div></div>

  return (
    <div className="page">
      <PageHeader />
      {pr.projects.map((p, i) => (
        // key includes the array index as a tiebreaker — p.name is
        // free-text with no uniqueness guarantee in projects-registry.json,
        // so two projects sharing a name would otherwise collide as React
        // keys. (This list isn't wired to DetailPanel, so there's no id
        // resolution to worry about here — unlike Goals.jsx's g.title key,
        // which cross-links.js also uses for lookup.)
        <Card key={`${p.name}-${i}`} title={p.name} sub={p.type} badge={OWNERSHIP_LABELS[p.ownership] || p.ownership} accentColor={MODULE.color}>
          {p.status} — {p.note}
        </Card>
      ))}
      {pr._meta?.open_items?.length > 0 && (
        <Card title="still needs your input" accentColor={MODULE.color}>
          {pr._meta.open_items.map((item, i) => <div key={i}>{item}</div>)}
        </Card>
      )}
    </div>
  )
}

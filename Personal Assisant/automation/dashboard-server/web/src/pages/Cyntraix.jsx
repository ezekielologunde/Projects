import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'

export default function Cyntraix() {
  const { data, loading, error } = useDashboardData()
  if (loading) return <div className="loading">loading…</div>
  if (error) return <div className="empty">Couldn't load dashboard data — try refreshing.</div>
  if (!data) return null
  const c = data.cyntraix
  if (!c) return <div className="page"><h2>cyntraix business</h2><div className="empty">not set up yet.</div></div>

  return (
    <div className="page">
      <h2>cyntraix business</h2>
      <Card title={`${c.business.name} — ${c.business.role}`} sub={`founded ${c.business.founded} · ${c.business.structure}`} />
      {c.clients.map((cl) => (
        <Card key={cl.name} title={cl.name} badge={<span className={cl.status === 'active' ? 'pulse' : undefined}>{cl.status}</span>}>
          {cl.cadence_note || ''}{cl.scope ? ` — scope: ${cl.scope}` : ''}
        </Card>
      ))}
      {c._meta?.open_items?.length > 0 && (
        <Card title="still needs your input">
          {c._meta.open_items.map((item, i) => <div key={i}>{item}</div>)}
        </Card>
      )}
    </div>
  )
}

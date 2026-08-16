import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'

export default function Config() {
  const { data, loading, error } = useDashboardData()
  if (loading) return <div className="loading">loading…</div>
  if (error) return <div className="error-state">Couldn't load dashboard data — try refreshing.</div>
  if (!data) return null
  const p = data.preferences
  if (!p) return <div className="page"><h2>preferences</h2><div className="empty">profile/preferences.json not found.</div></div>

  return (
    <div className="page">
      <h2>preferences</h2>
      <Card title="settings">
        <div><strong>max leads/day</strong> {p.max_new_applications_per_day ?? '—'}</div>
        <div><strong>academic</strong> {p.target_roles?.academic?.pursue ? `pursuing — ${p.target_roles.academic.criteria || ''}` : 'not pursuing'}</div>
        <div><strong>industry</strong> {p.target_roles?.cybersecurity_industry?.pursue ? `pursuing — ${p.target_roles.cybersecurity_industry.criteria || ''}` : 'not pursuing'}</div>
        <div><strong>work auth</strong> {data.workAuth || 'not set'}</div>
      </Card>
    </div>
  )
}

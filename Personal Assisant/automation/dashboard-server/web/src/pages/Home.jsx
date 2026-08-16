import { Link } from 'react-router-dom'
import { useDashboardData } from '../hooks/useDashboardData'
import { pickHeroCandidate } from '../lib/briefing'
import { NAV_ITEMS } from '../components/NavItems'
import StatCards from '../components/StatCards'
import ActivityBar from '../components/ActivityBar'
import ActivityChart from '../components/ActivityChart'
import ActivityHeatmap from '../components/ActivityHeatmap'

export default function Home() {
  const { data, loading, error } = useDashboardData()
  if (loading) return <div className="loading">loading…</div>
  if (error) return <div className="empty">Couldn't load dashboard data — try refreshing.</div>
  if (!data) return null

  const hero = pickHeroCandidate(data)
  const modules = NAV_ITEMS.filter((n) => n.key !== 'home' && n.key !== 'config')

  return (
    <div className="home-page">
      <section className="hero">
        <h1>{hero.line1} {hero.line2}</h1>
        <p>{hero.blurb}</p>
      </section>

      <StatCards counts={data.counts} trends={data.trends} />

      <ActivityBar applications={data.applications} />

      <ActivityChart applications={data.applications} />

      <div className="module-grid">
        {modules.map((m) => (
          <Link key={m.key} to={m.path} className="module-card" style={{ '--item-color': m.color }}>
            {m.label}
          </Link>
        ))}
      </div>

      <section className="activity-section">
        <h2 className="page-subhead">Last 28 days</h2>
        <ActivityHeatmap data={data} />
      </section>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useDashboardData } from '../hooks/useDashboardData'
import { pickHeroCandidate } from '../lib/briefing'
import { NAV_ITEMS } from '../components/NavItems'
import Card from '../components/Card'

export default function Home() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>

  const hero = pickHeroCandidate(data)
  const modules = NAV_ITEMS.filter((n) => n.key !== 'home' && n.key !== 'config')

  return (
    <div className="home-page">
      <section className="hero">
        <h1>{hero.line1} {hero.line2}</h1>
        <p>{hero.blurb}</p>
      </section>

      <div className="module-grid">
        {modules.map((m) => (
          <Link key={m.key} to={m.path} className="module-card" style={{ '--item-color': m.color }}>
            {m.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

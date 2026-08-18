import { useDashboardData } from '../hooks/useDashboardData'
import DatedList from '../components/DatedList'
import { NAV_ITEMS } from '../components/NavItems'

const MODULE = NAV_ITEMS.find((n) => n.key === 'news')

export default function News() {
  const { data, loading, error } = useDashboardData()
  if (loading) return <div className="loading">loading…</div>
  if (error) return <div className="error-state">Couldn't load dashboard data — try refreshing.</div>
  if (!data) return null
  return (
    <div className="page">
      <div className="page-header" style={{ '--item-color': MODULE.color }}>
        <span className="page-header-icon">{MODULE.icon}</span>
        <h2>cyber/AI news digests</h2>
      </div>
      <DatedList items={data.news} title="news" fetchPath="/api/news" emptyMessage="No news digests yet." accentColor={MODULE.color} />
    </div>
  )
}

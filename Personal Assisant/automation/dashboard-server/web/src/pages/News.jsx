import { useDashboardData } from '../hooks/useDashboardData'
import DatedList from '../components/DatedList'

export default function News() {
  const { data, loading, error } = useDashboardData()
  if (loading) return <div className="loading">loading…</div>
  if (error) return <div className="empty">Couldn't load dashboard data — try refreshing.</div>
  if (!data) return null
  return (
    <div className="page">
      <h2>cyber/AI news digests</h2>
      <DatedList items={data.news} title="news" fetchPath="/api/news" emptyMessage="No news digests yet." />
    </div>
  )
}

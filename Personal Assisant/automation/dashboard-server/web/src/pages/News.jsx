import { useDashboardData } from '../hooks/useDashboardData'
import DatedList from '../components/DatedList'

export default function News() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  return (
    <div className="page">
      <h2>cyber/AI news digests</h2>
      <DatedList items={data.news} title="news" fetchPath="/api/news" emptyMessage="No news digests yet." />
    </div>
  )
}

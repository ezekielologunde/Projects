import { useDashboardData } from '../hooks/useDashboardData'
import DatedList from '../components/DatedList'

export default function Inbox() {
  const { data, loading, error } = useDashboardData()
  if (loading) return <div className="loading">loading…</div>
  if (error) return <div className="empty">Couldn't load dashboard data — try refreshing.</div>
  if (!data) return null
  return (
    <div className="page">
      <h2>inbox — needs revisiting</h2>
      <DatedList items={data.inbox} title="inbox" fetchPath="/api/inbox" emptyMessage="No inbox reviews yet." />
    </div>
  )
}

import { useDashboardData } from '../hooks/useDashboardData'
import DatedList from '../components/DatedList'

export default function Inbox() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  return (
    <div className="page">
      <h2>inbox — needs revisiting</h2>
      <DatedList items={data.inbox} title="inbox" fetchPath="/api/inbox" emptyMessage="No inbox reviews yet." />
    </div>
  )
}

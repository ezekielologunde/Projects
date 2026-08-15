import { useDashboardData } from '../hooks/useDashboardData'
import DatedList from '../components/DatedList'

export default function Digests() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  return (
    <div className="page">
      <h2>daily digests</h2>
      <DatedList items={data.digests} title="digests" fetchPath="/api/digest" emptyMessage="No digests yet." />
    </div>
  )
}

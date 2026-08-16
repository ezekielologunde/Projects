import { useDashboardData } from '../hooks/useDashboardData'
import DatedList from '../components/DatedList'

export default function Digests() {
  const { data, loading, error } = useDashboardData()
  if (loading) return <div className="loading">loading…</div>
  if (error) return <div className="error-state">Couldn't load dashboard data — try refreshing.</div>
  if (!data) return null
  return (
    <div className="page">
      <h2>daily digests</h2>
      <DatedList items={data.digests} title="digests" fetchPath="/api/digest" emptyMessage="No digests yet." />
    </div>
  )
}

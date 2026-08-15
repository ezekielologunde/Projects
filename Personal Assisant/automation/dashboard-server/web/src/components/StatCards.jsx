import { useCountUp } from '../hooks/useCountUp'

// Best-effort color per status, matching the old dashboard's palette where a
// status name lines up with one of its known keys. The server computes
// `counts` dynamically from whatever statuses actually appear in
// applications/ (see buildDashboardData() in server.js) — it is not the old
// app's hardcoded 7-key STATUS_COLORS list — so any status not in this map
// (a typo'd status.json value, a new status introduced later, etc.) still
// renders a card, just with a neutral color instead of crashing or showing
// "undefined".
const STATUS_COLORS = {
  staged: '#ff8c42',
  ready_to_submit: '#f5b64c',
  applied: '#34d399',
  interview: '#ffb17a',
  rejected: '#f0605c',
  needs_manual_completion: '#f5b64c',
  unknown: '#6f7a8c',
}

function StatCard({ statusKey, count, trend }) {
  const animated = useCountUp(count)
  const color = STATUS_COLORS[statusKey] || 'var(--muted)'
  const label = statusKey.replace(/_/g, ' ')

  return (
    <div className="card stat">
      <div className="num-row">
        <div className="num" style={{ color }}>{animated}</div>
        {trend ? (
          <span className={`trend ${trend > 0 ? 'up' : 'down'}`}>
            {trend > 0 ? `+${trend}` : trend} today
          </span>
        ) : null}
      </div>
      <div className="label">{label}</div>
    </div>
  )
}

export default function StatCards({ counts, trends }) {
  const keys = Object.keys(counts || {})
  if (!keys.length) return null

  return (
    <div className="stat-grid">
      {keys.map((key) => (
        <StatCard key={key} statusKey={key} count={counts[key] || 0} trend={(trends || {})[key] || 0} />
      ))}
    </div>
  )
}

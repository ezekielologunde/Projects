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

// Minimal line glyphs matching NavItems.jsx's 20x20 stroke-icon family, one
// per known status; unrecognized statuses fall back to a plain dot so the
// card never renders blank.
function StatIcon({ children }) {
  return (
    <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}
const STATUS_ICONS = {
  staged: (
    <StatIcon>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6 V10 L12.6 12.2" />
    </StatIcon>
  ),
  ready_to_submit: (
    <StatIcon>
      <rect x="4" y="3.5" width="12" height="13" rx="1.5" />
      <path d="M7 9.2 L9.2 11.4 L13.2 7" />
    </StatIcon>
  ),
  applied: (
    <StatIcon>
      <path d="M3 10 H15.5" />
      <path d="M11.5 6 L15.7 10 L11.5 14" />
    </StatIcon>
  ),
  interview: (
    <StatIcon>
      <path d="M3.5 5.3 H16.5 V13 H8.4 L5.2 15.8 V13 H3.5 Z" />
      <path d="M6.6 8.6 H13.4" />
      <path d="M6.6 10.8 H11" />
    </StatIcon>
  ),
  rejected: (
    <StatIcon>
      <circle cx="10" cy="10" r="7" />
      <path d="M7.5 7.5 L12.5 12.5 M12.5 7.5 L7.5 12.5" />
    </StatIcon>
  ),
  needs_manual_completion: (
    <StatIcon>
      <path d="M10 3.3 L17.3 16.2 H2.7 Z" />
      <path d="M10 8.2 V11.6" />
      <circle cx="10" cy="13.9" r=".2" fill="currentColor" stroke="none" />
    </StatIcon>
  ),
  unknown: (
    <StatIcon>
      <circle cx="10" cy="10" r="7" />
      <path d="M7.8 8 Q7.8 6.2 10 6.2 Q12.2 6.2 12.2 8 Q12.2 9.3 10 10.3 V11.4" />
      <circle cx="10" cy="13.6" r=".2" fill="currentColor" stroke="none" />
    </StatIcon>
  ),
}

function StatCard({ statusKey, count, trend }) {
  const animated = useCountUp(count)
  const color = STATUS_COLORS[statusKey] || 'var(--muted)'
  const icon = STATUS_ICONS[statusKey] || STATUS_ICONS.unknown
  const label = statusKey.replace(/_/g, ' ')

  return (
    <div className="card stat-card">
      <div className="stat-icon-circle" style={{ '--stat-color': color }}>{icon}</div>
      <div className="stat-body">
        <div className="stat-num-row">
          <span className="stat-num">{animated}</span>
          {trend ? (
            <span className={`trend ${trend > 0 ? 'up' : 'down'}`}>
              {trend > 0 ? `+${trend}` : trend} today
            </span>
          ) : null}
        </div>
        <div className="stat-label">{label}</div>
      </div>
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

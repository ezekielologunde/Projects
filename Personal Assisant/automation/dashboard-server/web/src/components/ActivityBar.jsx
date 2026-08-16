import { useCountUp } from '../hooks/useCountUp'

// Same three buckets, match rules, and hex values as the old vanilla-JS
// dashboard's ACTIVITY_BUCKETS/buildActivityBar(). These are activity-status
// semantics (not module colors), so they stay as literal hex values here
// rather than joining the --c-* design-token list.
const ACTIVITY_BUCKETS = [
  { key: 'progress', label: 'In Progress', hex: '#9b8cff', match: (s) => s === 'staged' || s === 'ready_to_submit' },
  { key: 'completed', label: 'Completed', hex: '#5b8cff', match: (s) => s === 'applied' || s === 'interview' || s === 'rejected' },
  { key: 'followup', label: 'Needs Follow-up', hex: '#ffab5c', match: (s) => s === 'needs_manual_completion' || s === 'unknown' },
]

function ActivityChip({ bucket, count }) {
  const animated = useCountUp(count)
  return (
    <div className="activity-chip">
      <span className="activity-chip-dot" style={{ '--chip-color': bucket.hex }} />
      <span className="activity-chip-count">{animated}</span>
      <span className="activity-chip-label">{bucket.label}</span>
    </div>
  )
}

// Segmented bar + stat chips showing what fraction of job applications are
// in-progress vs. completed vs. needing follow-up — ported from the old
// dashboard's buildActivityBar(), same bucket/match rules and hex palette.
export default function ActivityBar({ applications }) {
  const apps = (applications || []).filter((a) => a.status !== 'dropped')
  const total = apps.length
  const counts = ACTIVITY_BUCKETS.map((b) => apps.filter((a) => b.match(a.status)).length)
  const completedCount = counts[1]
  const pct = total ? Math.round((completedCount / total) * 100) : 0
  const animatedPct = useCountUp(pct)

  if (!total) {
    return (
      <section className="card activity-bar">
        <div className="empty">no applications yet.</div>
      </section>
    )
  }

  return (
    <section className="card activity-bar">
      <div className="activity-pct">
        <span className="activity-pct-num">{animatedPct}%</span>
        <span className="activity-pct-label">moved on</span>
      </div>

      <div className="activity-segbar">
        {ACTIVITY_BUCKETS.map((b, i) => {
          const percent = (counts[i] / total) * 100
          if (percent <= 0) return null
          return (
            <div
              key={b.key}
              className="activity-seg"
              style={{ width: `${percent}%`, '--seg-color': b.hex }}
              title={`${b.label}: ${Math.round(percent)}%`}
            />
          )
        })}
      </div>

      <div className="activity-chips">
        {ACTIVITY_BUCKETS.map((b, i) => (
          <ActivityChip key={b.key} bucket={b} count={counts[i]} />
        ))}
      </div>
    </section>
  )
}

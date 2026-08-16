import { dateRange, formatTooltipDate } from '../lib/dateRange'

const HEATMAP_DAYS = 28

// Tallies one activity count per day across the four dated collections the
// dashboard tracks, then buckets each day into a 0-4 intensity level —
// same shape as the old vanilla-JS dashboard's buildHeatmap().
export default function ActivityHeatmap({ data }) {
  const applications = data?.applications || []
  const digests = data?.digests || []
  const news = data?.news || []
  const inbox = data?.inbox || []

  const days = dateRange(HEATMAP_DAYS)
  const byDate = {}
  days.forEach((d) => { byDate[d] = 0 })
  applications.forEach((a) => { if (byDate[a.found_at] !== undefined) byDate[a.found_at]++ })
  digests.forEach((d) => { if (byDate[d.date] !== undefined) byDate[d.date]++ })
  news.forEach((n) => { if (byDate[n.date] !== undefined) byDate[n.date]++ })
  inbox.forEach((i) => { if (byDate[i.date] !== undefined) byDate[i.date]++ })

  const max = Math.max(1, ...Object.values(byDate))

  return (
    <div className="card heatmap">
      {days.map((d) => {
        const count = byDate[d]
        const level = count > 0 ? Math.min(4, Math.ceil((count / max) * 4)) : 0
        const label = `${formatTooltipDate(d)}: ${count} item${count === 1 ? '' : 's'}`
        return (
          <div
            key={d}
            className="cell"
            data-level={level}
            title={label}
            aria-label={label}
          />
        )
      })}
    </div>
  )
}

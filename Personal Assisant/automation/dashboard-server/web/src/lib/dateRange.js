// Local-calendar-date helpers shared by ActivityHeatmap.jsx and
// ActivityChart.jsx (and any future date-bucketed view), extracted so both
// agree on what "today" is and how a YYYY-MM-DD key round-trips through
// Date. Deliberately local-time throughout, not UTC — found_at/date fields
// across the dashboard's data are plain YYYY-MM-DD strings with no
// timezone. The old vanilla-JS dashboard's dateRange() used
// toISOString().slice(0, 10), which is UTC-based and drops a day for users
// west of UTC in the evening — deliberately not reproduced here.

export function toDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Last N calendar dates (local time), oldest to newest, ending today.
export function dateRange(days) {
  const now = new Date()
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    result.push(toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)))
  }
  return result
}

// Parses a YYYY-MM-DD key back into a local-midnight Date. The explicit
// T00:00:00 (rather than passing the bare key to `new Date(...)`) is what
// keeps this local-time — a bare "YYYY-MM-DD" string is parsed as UTC
// midnight by the Date constructor, which can shift the displayed day for
// users west of UTC.
export function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`)
}

export function formatTooltipDate(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

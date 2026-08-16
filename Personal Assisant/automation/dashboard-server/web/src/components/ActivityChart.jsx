import { useRef, useState } from 'react'
import { dateRange, formatTooltipDate, parseDateKey } from '../lib/dateRange'
import { useOutsideClickClose } from '../hooks/useOutsideClickClose'

const PERIODS = [7, 14, 30]
const PERIOD_LABELS = { 7: 'this week', 14: 'last 2 weeks', 30: 'this month' }

// Chart geometry, mirrors the old vanilla-JS dashboard's buildChart() —
// fixed logical units inside a responsive viewBox (width="100%") so the
// chart scales down to mobile widths instead of overflowing a fixed 560px.
const W = 560
const H = 128
const PAD = 6
const GAP = 6

// Weekday abbreviation for short windows, day-of-month number once the
// window is too wide for weekday names to stay legible — same threshold
// (dayCount > 14) as the old dashboard.
function formatAxisLabel(dateKey, longPeriod) {
  const d = parseDateKey(dateKey)
  return longPeriod ? String(d.getDate()) : d.toLocaleDateString('en-US', { weekday: 'short' })
}

// Applications-found-per-day bar chart with a period selector (this week /
// last 2 weeks / this month) — ported from the old vanilla-JS dashboard's
// buildChart(), same bar-sizing/label rules and gradient fill, rebuilt as
// an SVG React component with a local-calendar date range instead of the
// old UTC-based one.
export default function ActivityChart({ applications }) {
  const [periodDays, setPeriodDays] = useState(7)
  const [open, setOpen] = useState(false)
  const selectRef = useRef(null)
  const btnRef = useRef(null)

  // Outside-click/Escape-closes-and-refocuses-trigger, shared with
  // TopHeader.jsx's account menu — see useOutsideClickClose.js.
  useOutsideClickClose(selectRef, btnRef, open, setOpen)

  const apps = applications || []
  const days = dateRange(periodDays)
  const counts = days.map((d) => apps.filter((a) => a.found_at === d).length)
  const max = Math.max(1, ...counts)
  const longPeriod = periodDays > 14

  const barW = W / counts.length - GAP

  return (
    <section className="card activity-chart">
      <div className="card-head">
        <div className="card-title">Applications found</div>
        <div className={`period-select${open ? ' open' : ''}`} ref={selectRef}>
          <button
            type="button"
            className="period-btn"
            ref={btnRef}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls="activity-chart-period-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {PERIOD_LABELS[periodDays]}
            <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true" focusable="false">
              <path d="M1 1 L5 5 L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="period-menu" id="activity-chart-period-menu" role="menu">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="menuitem"
                className={p === periodDays ? 'on' : ''}
                onClick={() => {
                  setPeriodDays(p)
                  setOpen(false)
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <svg className="barchart" viewBox={`0 0 ${W} ${H}`} width="100%">
        <defs>
          <linearGradient id="activityChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-cyntraix)" />
            <stop offset="100%" stopColor="var(--c-home)" />
          </linearGradient>
        </defs>
        {counts.map((c, i) => {
          // Minimum visible sliver even at zero, so an empty day (or an
          // all-zero window) reads as "nothing happened" rather than
          // disappearing entirely.
          const barH = Math.max(c > 0 ? 6 : 3, (c / max) * (H - PAD * 2))
          const x = i * (barW + GAP) + GAP / 2
          const y = H - barH
          const label = `${formatTooltipDate(days[i])}: ${c} found`
          return (
            <rect
              key={days[i]}
              x={x.toFixed(1)}
              y={y.toFixed(1)}
              width={barW.toFixed(1)}
              height={barH.toFixed(1)}
              rx="4"
              fill={c > 0 ? 'url(#activityChartGrad)' : 'var(--line)'}
              title={label}
              aria-label={label}
            />
          )
        })}
      </svg>

      <div className="chart-days">
        {days.map((d, i) => (
          <span key={d} className={i === days.length - 1 ? 'on' : ''}>
            {formatAxisLabel(d, longPeriod)}
          </span>
        ))}
      </div>
    </section>
  )
}

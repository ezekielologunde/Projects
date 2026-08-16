import { useEffect, useRef, useState } from 'react'

const PERIODS = [7, 14, 30]
const PERIOD_LABELS = { 7: 'this week', 14: 'last 2 weeks', 30: 'this month' }

// Chart geometry, mirrors the old vanilla-JS dashboard's buildChart() —
// fixed logical units inside a responsive viewBox (width="100%") so the
// chart scales down to mobile widths instead of overflowing a fixed 560px.
const W = 560
const H = 128
const PAD = 6
const GAP = 6

function toDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Last N calendar dates (local time, not UTC — found_at is a plain
// YYYY-MM-DD string with no timezone), oldest to newest. Mirrors
// ActivityHeatmap.jsx's dateRange() so every date-bucketed view in the app
// agrees on what "today" is; the old app's dateRange() used
// toISOString().slice(0, 10), which is UTC-based and drops a day for users
// west of UTC in the evening — deliberately not reproduced here.
function dateRange(days) {
  const now = new Date()
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    result.push(toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)))
  }
  return result
}

function formatTooltipDate(dateKey) {
  const d = new Date(`${dateKey}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Weekday abbreviation for short windows, day-of-month number once the
// window is too wide for weekday names to stay legible — same threshold
// (dayCount > 14) as the old dashboard.
function formatAxisLabel(dateKey, longPeriod) {
  const d = new Date(`${dateKey}T00:00:00`)
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

  // Standard outside-click-closes pattern: only listen while the menu is
  // open, and only remove the listener when it closes/unmounts. Reattaching
  // per `open` toggle (rather than once on mount) avoids a stale closure
  // over `open` without needing a ref to track it. This can't misfire on
  // the very click that opens the menu, because that click's target (the
  // button) is inside `selectRef`, so `.contains(e.target)` is true and the
  // handler leaves it open.
  //
  // Escape closes the menu and returns focus to the trigger button, same as
  // any native menu — piggybacks on this effect's open-gated
  // attach/detach rather than a second effect.
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (selectRef.current && !selectRef.current.contains(e.target)) setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

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

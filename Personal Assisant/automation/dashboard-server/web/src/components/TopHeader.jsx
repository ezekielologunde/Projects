import { useEffect, useRef, useState } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'

// Bell glyph, drawn in the same style as NavItems.jsx's icon set (20x20
// grid, currentColor stroke, round caps/joins) so it reads as part of the
// same icon family instead of a one-off import.
function IconBell() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 8.3 Q5 4 10 4 Q15 4 15 8.3 V11.6 L16.6 14.2 H3.4 L5 11.6 Z" />
      <path d="M8.2 14.6 Q8.2 16.4 10 16.4 Q11.8 16.4 11.8 14.6" />
    </svg>
  )
}

// Generic person-outline glyph — fallback avatar when no first name is on
// file to derive an initial from. Same 20x20/currentColor convention.
function IconPerson() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="10" cy="7.2" r="3.2" />
      <path d="M3.8 16.3 Q3.8 11.6 10 11.6 Q16.2 11.6 16.2 16.3" />
    </svg>
  )
}

// Hour boundaries are deliberately approximate — this only has to read as
// reasonable, not be precise to the minute.
function greetingForHour(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Single aggregate "needs attention" count for the bell badge — a simpler
// cousin of briefing.js's pickHeroCandidate(), which ranks these same
// signals by priority for the Home hero. Here we just want a total. Every
// field is optional-chained/defaulted since cyntraix, research, and
// paymentsDueSoon can all be null (no profile data) or missing entirely
// (data still loading).
function needsAttentionCount(data) {
  if (!data) return 0
  const applications = data.applications || []
  const staged = applications.filter((a) => a.status === 'staged').length
  const attention = applications.filter((a) => a.status === 'needs_manual_completion' || a.status === 'unknown').length
  const interview = data.counts?.interview || 0
  const cyntraixOpen = data.cyntraix?._meta?.open_items?.length || 0
  const researchOpen = data.research?._meta?.open_items?.length || 0
  const paymentsDue = data.paymentsDueSoon?.length || 0
  return staged + attention + interview + cyntraixOpen + researchOpen + paymentsDue
}

// Persistent top header, mounted above every routed page (see App.jsx) —
// time-of-day greeting, a static "needs attention" bell, and an account
// menu with sign-out (relocated here from the sidebar, which is icon-only
// and had no room for a second control alongside ThemeToggle).
export default function TopHeader() {
  const { data } = useDashboardData()
  const [menuOpen, setMenuOpen] = useState(false)
  const accountRef = useRef(null)

  // Same outside-click-closes pattern as ActivityChart.jsx's period
  // selector: only listen while open, remove on close/unmount, and skip
  // re-triggering on the click that opened the menu (the button is inside
  // accountRef, so .contains(e.target) is true for that click).
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  const firstName = data?.firstName || null
  const greeting = firstName ? `${greetingForHour(new Date().getHours())}, ${firstName}` : greetingForHour(new Date().getHours())
  const count = needsAttentionCount(data)
  const bellLabel = count > 0 ? `${count} item${count === 1 ? '' : 's'} ${count === 1 ? 'needs' : 'need'} attention` : 'Nothing needs attention right now'
  const initial = firstName ? firstName.charAt(0).toUpperCase() : null

  return (
    <header className="top-header">
      <div className="header-greeting-block">
        <div className="header-greeting">{greeting}</div>
        <div className="header-greeting-sub">Ask HoWz if anything's on your mind.</div>
      </div>

      <div className="header-actions">
        <div className="header-bell" role="img" aria-label={bellLabel} title={bellLabel}>
          <IconBell />
          {count > 0 && <span className="header-bell-badge">{count > 99 ? '99+' : count}</span>}
        </div>

        <div className="header-account" ref={accountRef}>
          <button
            type="button"
            className="header-avatar"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {initial || <IconPerson />}
          </button>
          <div className={`account-menu${menuOpen ? ' open' : ''}`}>
            <a href="/api/logout" className="account-menu-item">Sign out</a>
          </div>
        </div>
      </div>
    </header>
  )
}

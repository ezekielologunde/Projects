// Shared nav-item icon wrapper — every icon is a minimal line glyph on a
// consistent 20x20 grid so the set reads as one family. Icons inherit color
// from their nav item via `currentColor` rather than being hardcoded.
function Icon({ children }) {
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
      {children}
    </svg>
  )
}

const IconHome = () => (
  <Icon>
    <path d="M3.5 10.5 L10 4 L16.5 10.5" />
    <path d="M5.5 9.5 V16 H14.5 V9.5" />
  </Icon>
)

const IconGoals = () => (
  <Icon>
    <circle cx="10" cy="10" r="7" />
    <circle cx="10" cy="10" r="4.3" />
    <circle cx="10" cy="10" r="1.6" />
  </Icon>
)

const IconJobSearch = () => (
  <Icon>
    <rect x="3" y="7.5" width="14" height="9" rx="1.5" />
    <path d="M7.5 7.5 V6 Q7.5 4.7 8.8 4.7 H11.2 Q12.5 4.7 12.5 6 V7.5" />
    <path d="M3 12 H17" />
  </Icon>
)

const IconMoney = () => (
  <Icon>
    <path d="M10 3.2 V16.8" />
    <path d="M13 6.6 C13 5.1 11.7 4.2 10 4.2 C8.3 4.2 7 5.1 7 6.6 C7 9.6 13 8.8 13 12.2 C13 13.9 11.7 14.9 10 14.9 C8.3 14.9 7 14 7 12.4" />
  </Icon>
)

const IconInbox = () => (
  <Icon>
    <path d="M5.6 5.3 H14.4 L16.8 12 V14.5 Q16.8 16 15.3 16 H4.7 Q3.2 16 3.2 14.5 V12 Z" />
    <path d="M3.2 12 H7.3 L8.7 14.2 H11.3 L12.7 12 H16.8" />
  </Icon>
)

const IconCyntraix = () => (
  <Icon>
    <path d="M3 6.2 L4 3.3 H16 L17 6.2 Z" />
    <rect x="4" y="6.2" width="12" height="10.5" />
    <rect x="8.5" y="11.5" width="3" height="5.2" />
  </Icon>
)

const IconResearch = () => (
  <Icon>
    <path d="M10 5 L18 8.7 L10 12.4 L2 8.7 Z" />
    <path d="M5.8 10.3 V13.6 Q5.8 15.7 10 15.7 Q14.2 15.7 14.2 13.6 V10.3" />
    <path d="M18 8.7 V13.2" />
  </Icon>
)

const IconProjects = () => (
  <Icon>
    <path d="M10 3.3 L17.5 7.2 L10 11.1 L2.5 7.2 Z" />
    <path d="M2.5 10.6 L10 14.5 L17.5 10.6" />
    <path d="M2.5 14 L10 17.9 L17.5 14" />
  </Icon>
)

const IconNews = () => (
  <Icon>
    <path d="M4 4.3 H12.3 L15.5 7.5 V16.4 Q15.5 17.4 14.5 17.4 H5 Q4 17.4 4 16.4 Z" />
    <path d="M12.3 4.3 V6.9 Q12.3 7.5 12.9 7.5 H15.5" />
    <path d="M6.3 10 H13.2" />
    <path d="M6.3 12.4 H13.2" />
    <path d="M6.3 14.8 H10.5" />
  </Icon>
)

const IconDigests = () => (
  <Icon>
    <rect x="4" y="3.6" width="12" height="13.8" rx="1.3" />
    <path d="M6.6 7 H13.4" />
    <path d="M6.6 9.6 H13.4" />
    <path d="M6.6 12.9 H10" />
    <path d="M11.8 12.6 L13 13.8 L15 11.2" />
  </Icon>
)

const IconConfig = () => (
  <Icon>
    <path d="M16.2 10 L18.4 10 M14.38 5.62 L15.94 4.06 M10 3.8 L10 1.6 M5.62 5.62 L4.06 4.06 M3.8 10 L1.6 10 M5.62 14.38 L4.06 15.94 M10 16.2 L10 18.4 M14.38 14.38 L15.94 15.94" />
    <circle cx="10" cy="10" r="3.6" />
    <circle cx="10" cy="10" r="1.4" />
  </Icon>
)

export const NAV_ITEMS = [
  { key: 'home', label: 'Home', path: '/', color: 'var(--c-home)', icon: <IconHome /> },
  { key: 'goals', label: 'Goals', path: '/goals', color: 'var(--c-goals)', icon: <IconGoals /> },
  { key: 'jobsearch', label: 'Job search', path: '/job-search', color: 'var(--c-jobsearch)', icon: <IconJobSearch /> },
  { key: 'money', label: 'Money', path: '/money', color: 'var(--c-money)', icon: <IconMoney /> },
  { key: 'inbox', label: 'Inbox', path: '/inbox', color: 'var(--c-inbox)', icon: <IconInbox /> },
  { key: 'cyntraix', label: 'Cyntraix', path: '/cyntraix', color: 'var(--c-cyntraix)', icon: <IconCyntraix /> },
  { key: 'research', label: 'Research', path: '/research', color: 'var(--c-research)', icon: <IconResearch /> },
  { key: 'projects', label: 'Projects', path: '/projects', color: 'var(--c-projects)', icon: <IconProjects /> },
  { key: 'news', label: 'News', path: '/news', color: 'var(--c-news)', icon: <IconNews /> },
  { key: 'digests', label: 'Digests', path: '/digests', color: 'var(--c-digests)', icon: <IconDigests /> },
  { key: 'config', label: 'Config', path: '/config', color: 'var(--c-config)', icon: <IconConfig /> },
]

// Bottom tab bar shows only the highest-frequency modules — mobile has no
// room for all 11; the rest stay reachable from Home's module grid.
export const MOBILE_NAV_KEYS = ['home', 'jobsearch', 'money', 'inbox']

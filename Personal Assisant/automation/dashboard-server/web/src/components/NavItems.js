export const NAV_ITEMS = [
  { key: 'home', label: 'Home', path: '/', color: 'var(--c-home)' },
  { key: 'goals', label: 'Goals', path: '/goals', color: 'var(--c-goals)' },
  { key: 'jobsearch', label: 'Job search', path: '/job-search', color: 'var(--c-jobsearch)' },
  { key: 'money', label: 'Money', path: '/money', color: 'var(--c-money)' },
  { key: 'inbox', label: 'Inbox', path: '/inbox', color: 'var(--c-inbox)' },
  { key: 'cyntraix', label: 'Cyntraix', path: '/cyntraix', color: 'var(--c-cyntraix)' },
  { key: 'research', label: 'Research', path: '/research', color: 'var(--c-research)' },
  { key: 'projects', label: 'Projects', path: '/projects', color: 'var(--c-projects)' },
  { key: 'news', label: 'News', path: '/news', color: 'var(--c-news)' },
  { key: 'digests', label: 'Digests', path: '/digests', color: 'var(--c-digests)' },
  { key: 'config', label: 'Config', path: '/config', color: 'var(--c-config)' },
]

// Bottom tab bar shows only the highest-frequency modules — mobile has no
// room for all 11; the rest stay reachable from Home's module grid.
export const MOBILE_NAV_KEYS = ['home', 'jobsearch', 'money', 'inbox']

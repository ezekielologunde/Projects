import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './NavItems'
import ThemeToggle from './ThemeToggle'

// Door-with-arrow "log out" glyph, drawn in the same style as NavItems.jsx's
// icons (20x20 grid, currentColor stroke, round caps/joins) so the icon-only
// sidebar's sign-out control matches every other item instead of standing
// out as a lone text link.
function IconSignOut() {
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
      <path d="M8.5 3.5 H5.5 Q4 3.5 4 5 V15 Q4 16.5 5.5 16.5 H8.5" />
      <path d="M7.5 10 H16" />
      <path d="M12.5 6.5 L16 10 L12.5 13.5" />
    </svg>
  )
}

export default function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="logo">H</div>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' on' : ''}`}
          style={{ '--item-color': item.color }}
          aria-label={item.label}
          title={item.label}
        >
          {item.icon}
        </NavLink>
      ))}
      <div className="nav-footer">
        <ThemeToggle />
        <a href="/api/logout" className="sign-out-link" aria-label="Sign out" title="Sign out">
          <IconSignOut />
        </a>
      </div>
    </nav>
  )
}

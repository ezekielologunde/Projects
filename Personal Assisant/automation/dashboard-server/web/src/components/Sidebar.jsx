import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './NavItems'
import ThemeToggle from './ThemeToggle'

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
        >
          {item.label}
        </NavLink>
      ))}
      <div className="nav-footer">
        <ThemeToggle />
        <a href="/api/logout" className="sign-out-link">Sign out</a>
      </div>
    </nav>
  )
}

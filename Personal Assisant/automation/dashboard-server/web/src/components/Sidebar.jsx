import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './NavItems'

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
      <a href="/api/logout" className="nav-footer sign-out-link">Sign out</a>
    </nav>
  )
}

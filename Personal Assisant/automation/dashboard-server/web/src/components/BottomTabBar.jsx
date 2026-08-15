import { NavLink } from 'react-router-dom'
import { NAV_ITEMS, MOBILE_NAV_KEYS } from './NavItems'

export default function BottomTabBar() {
  const items = NAV_ITEMS.filter((n) => MOBILE_NAV_KEYS.includes(n.key))
  return (
    <nav className="bottom-tab-bar" aria-label="Main navigation">
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `tab-item${isActive ? ' on' : ''}`}
          style={{ '--item-color': item.color }}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

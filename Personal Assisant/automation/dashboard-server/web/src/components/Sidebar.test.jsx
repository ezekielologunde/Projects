import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'
import { NAV_ITEMS } from './NavItems'

describe('Sidebar (icon-only desktop nav)', () => {
  it('exposes every nav item as an accessible link named after its module, with no visible text label', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    for (const item of NAV_ITEMS) {
      const link = screen.getByRole('link', { name: item.label })
      expect(link).toBeInTheDocument()
      // The label is only present as the accessible name (aria-label) and
      // hover tooltip (title) — it must not also render as visible text now
      // that the sidebar is icon-only.
      expect(link).toHaveAttribute('title', item.label)
      expect(link.textContent).toBe('')
    }
  })

  it('renders exactly one link per nav item plus the sign-out link', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getAllByRole('link')).toHaveLength(NAV_ITEMS.length + 1)
    expect(screen.getByRole('link', { name: 'Sign out' })).toBeInTheDocument()
  })
})

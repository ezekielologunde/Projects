import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TopHeader from './TopHeader'

function mockDashboard(overrides = {}) {
  global.fetch = vi.fn().mockResolvedValue({
    json: async () => ({
      applications: [],
      counts: {},
      cyntraix: null,
      research: null,
      paymentsDueSoon: [],
      firstName: null,
      ...overrides,
    }),
  })
}

describe('TopHeader', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('greets with the first name when data.firstName is present', async () => {
    // Only fake Date (not setTimeout/setInterval) — waitFor()'s own
    // internal polling relies on real timers, and faking those too makes
    // it hang waiting for ticks that never arrive.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 15, 9, 0, 0)) // 9am local -> morning
    mockDashboard({ firstName: 'Ezekiel' })

    render(<TopHeader />)

    await waitFor(() => expect(screen.getByText('Good morning, Ezekiel')).toBeInTheDocument())
  })

  it('greets without a name (no "null" or a dangling comma) when data.firstName is null', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 15, 14, 0, 0)) // 2pm local -> afternoon
    mockDashboard({ firstName: null })

    render(<TopHeader />)

    await waitFor(() => expect(screen.getByText('Good afternoon')).toBeInTheDocument())
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/,\s*$/)).not.toBeInTheDocument()
  })

  it('shows an evening greeting after 5pm', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 15, 20, 0, 0)) // 8pm local -> evening
    mockDashboard({ firstName: null })

    render(<TopHeader />)

    await waitFor(() => expect(screen.getByText('Good evening')).toBeInTheDocument())
  })

  it('still shows an afternoon greeting one minute before the evening boundary (16:59)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 15, 16, 59, 0)) // 4:59pm local -> still afternoon
    mockDashboard({ firstName: null })

    render(<TopHeader />)

    await waitFor(() => expect(screen.getByText('Good afternoon')).toBeInTheDocument())
  })

  it('shows an evening greeting right at the 17:00 hour boundary', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 15, 17, 0, 0)) // 5:00pm local -> evening starts exactly here
    mockDashboard({ firstName: null })

    render(<TopHeader />)

    await waitFor(() => expect(screen.getByText('Good evening')).toBeInTheDocument())
  })

  it('shows the correct aggregate "needs attention" count on the bell badge', async () => {
    mockDashboard({
      applications: [
        { status: 'staged' },
        { status: 'staged' },
        { status: 'needs_manual_completion' },
        { status: 'unknown' },
        { status: 'applied' }, // not counted
      ],
      counts: { interview: 2 },
      cyntraix: { _meta: { open_items: [{ id: 1 }, { id: 2 }] } },
      research: { _meta: { open_items: [{ id: 1 }] } },
      paymentsDueSoon: [{ id: 1 }, { id: 2 }],
    })

    const { container } = render(<TopHeader />)

    // staged(2) + attention(2) + interview(2) + cyntraix open(2) + research open(1) + payments due(2) = 11
    await waitFor(() => expect(container.querySelector('.header-bell-badge')).toHaveTextContent('11'))
    expect(container.querySelector('.header-bell')).toHaveAttribute('aria-label', '11 items need attention')
  })

  it('uses singular "item"/"needs" (not "item need") when the count is exactly 1', async () => {
    mockDashboard({
      applications: [{ status: 'staged' }],
      counts: {},
      cyntraix: null,
      research: null,
      paymentsDueSoon: [],
    })

    const { container } = render(<TopHeader />)

    await waitFor(() => expect(container.querySelector('.header-bell-badge')).toHaveTextContent('1'))
    expect(container.querySelector('.header-bell')).toHaveAttribute('aria-label', '1 item needs attention')
    expect(container.querySelector('.header-bell')).toHaveAttribute('title', '1 item needs attention')
  })

  it('renders the bell with no badge when nothing needs attention, without hiding the bell itself', async () => {
    mockDashboard() // everything empty/zero by default

    const { container } = render(<TopHeader />)

    await waitFor(() => expect(container.querySelector('.header-bell')).toHaveAttribute('aria-label', 'Nothing needs attention right now'))
    expect(container.querySelector('.header-bell-badge')).not.toBeInTheDocument()
    expect(container.querySelector('.header-bell svg')).toBeInTheDocument()
  })

  it('guards against null cyntraix/research/paymentsDueSoon instead of crashing', async () => {
    mockDashboard({ cyntraix: null, research: null, paymentsDueSoon: null })

    const { container } = render(<TopHeader />)

    await waitFor(() => expect(container.querySelector('.header-bell')).toBeInTheDocument())
    expect(container.querySelector('.header-bell')).toHaveAttribute('aria-label', 'Nothing needs attention right now')
  })

  it('opens the account menu on avatar click, closes it on an outside click, and links sign-out to /api/logout', async () => {
    mockDashboard({ firstName: 'Ezekiel' })

    const { container } = render(<TopHeader />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument())

    expect(container.querySelector('.account-menu')).not.toHaveClass('open')

    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(container.querySelector('.account-menu')).toHaveClass('open')

    // Sign out is an <a href> given an explicit role="menuitem" for proper
    // menu semantics, which overrides its implicit "link" role — so it's
    // now queried by that role rather than 'link'.
    const signOut = screen.getByRole('menuitem', { name: 'Sign out' })
    expect(signOut).toHaveAttribute('href', '/api/logout')

    fireEvent.click(document.body)
    expect(container.querySelector('.account-menu')).not.toHaveClass('open')
  })

  it('has aria-expanded="false" on the account trigger when closed and "true" when open', async () => {
    mockDashboard({ firstName: 'Ezekiel' })

    render(<TopHeader />)
    const trigger = await screen.findByRole('button', { name: 'Account menu' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes the account menu when Escape is pressed', async () => {
    mockDashboard({ firstName: 'Ezekiel' })

    const { container } = render(<TopHeader />)
    const trigger = await screen.findByRole('button', { name: 'Account menu' })

    fireEvent.click(trigger)
    expect(container.querySelector('.account-menu')).toHaveClass('open')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(container.querySelector('.account-menu')).not.toHaveClass('open')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('returns focus to the avatar trigger button when Escape closes the account menu', async () => {
    mockDashboard({ firstName: 'Ezekiel' })

    render(<TopHeader />)
    const trigger = await screen.findByRole('button', { name: 'Account menu' })

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(trigger)
  })

  it('shows the first-name initial as the avatar when present', async () => {
    mockDashboard({ firstName: 'Ezekiel' })
    render(<TopHeader />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Account menu' })).toHaveTextContent('E'))
  })

  it('falls back to a generic person icon as the avatar when no first name is on file', async () => {
    mockDashboard({ firstName: null })
    const { container } = render(<TopHeader />)
    await waitFor(() => expect(container.querySelector('.header-avatar svg')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Account menu' }).textContent).toBe('')
  })
})

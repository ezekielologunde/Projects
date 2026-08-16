import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

describe('Home', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        applications: [{ status: 'staged', folder: 'a', company: 'Acme', role: 'Analyst', found_at: '2026-08-15' }],
        counts: { staged: 1 },
        trends: { staged: 1 },
        goals: [{ title: 'g', status: 'active', category: 'career' }],
        cyntraix: { clients: [] },
        research: null,
        projectsRegistry: null,
        news: [], digests: [], inbox: [], topNews: null,
        finances: { accounts: [] }, paymentsDueSoon: [],
      }),
    })
  })

  it('renders the hero headline once data loads', async () => {
    render(<MemoryRouter><Home /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/ready to review/)).toBeInTheDocument())
  })

  it('renders the stat cards and activity heatmap alongside the hero and module grid', async () => {
    render(<MemoryRouter><Home /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('staged')).toBeInTheDocument())
    expect(screen.getByText('+1 today')).toBeInTheDocument()
    // Heatmap tooltips end in "item"/"items" — scoped this way (rather than
    // the broader /:/ pattern) so it doesn't also match the ActivityBar
    // segment tooltips ("In Progress: 100%"), which contain a colon too.
    expect(screen.getAllByTitle(/items?$/).length).toBe(28)
  })

  it('renders the activity bar alongside the stat cards and heatmap', async () => {
    render(<MemoryRouter><Home /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('moved on')).toBeInTheDocument())
  })

  it('renders the applications-over-time chart with its period selector', async () => {
    const { container } = render(<MemoryRouter><Home /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Applications found')).toBeInTheDocument())
    // Queried by class rather than getByRole('button', {name: 'this week'}) —
    // that name is ambiguous while the default 7-day period is selected,
    // since the matching option inside the (unopened) period menu carries
    // the same accessible name as the trigger button.
    expect(container.querySelector('.period-btn')).toHaveTextContent('this week')
    // Bar tooltips end in "found", which doesn't collide with the heatmap's
    // "item(s)"-suffixed tooltips asserted above.
    expect(container.querySelectorAll('.barchart rect').length).toBeGreaterThan(0)
  })

  it('shows an error state instead of hanging on "loading…" when the fetch rejects', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network down'))
    render(<MemoryRouter><Home /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/couldn't load dashboard data/i)).toBeInTheDocument())
    expect(screen.queryByText(/loading…/i)).not.toBeInTheDocument()
  })
})

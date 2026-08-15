import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DatedList from './DatedList'

describe('DatedList', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ text: async () => '# Some content\n\nBody text.' })
  })

  it('shows the empty message when there are no items', () => {
    render(<DatedList items={[]} title="inbox" fetchPath="/api/inbox" emptyMessage="No inbox reviews yet." />)
    expect(screen.getByText('No inbox reviews yet.')).toBeInTheDocument()
  })

  it('opens a modal with fetched content when a date is clicked', async () => {
    render(<DatedList items={[{ date: '2026-08-14' }]} title="inbox" fetchPath="/api/inbox" emptyMessage="" />)
    fireEvent.click(screen.getByText('2026-08-14'))
    await waitFor(() => expect(screen.getByText(/Body text/)).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith('/api/inbox?date=2026-08-14')
  })

  it('ignores a stale response when a later date is clicked before the first resolves (race condition)', async () => {
    // Two deferred fetches we can resolve in whatever order we choose, so the
    // test controls the race deterministically instead of relying on timers.
    let resolveA
    let resolveB
    const promiseA = new Promise((resolve) => { resolveA = resolve })
    const promiseB = new Promise((resolve) => { resolveB = resolve })

    global.fetch = vi.fn((url) => {
      if (url.includes('date=2026-08-10')) return promiseA
      if (url.includes('date=2026-08-11')) return promiseB
      throw new Error(`unexpected fetch url: ${url}`)
    })

    render(
      <DatedList
        items={[{ date: '2026-08-10' }, { date: '2026-08-11' }]}
        title="inbox"
        fetchPath="/api/inbox"
        emptyMessage=""
      />
    )

    // User clicks date A, then quickly clicks date B before A's fetch resolves.
    fireEvent.click(screen.getByText('2026-08-10'))
    fireEvent.click(screen.getByText('2026-08-11'))

    // B's (current) response resolves first and should render.
    resolveB({ text: async () => 'Content for B' })
    await waitFor(() => expect(screen.getByText('Content for B')).toBeInTheDocument())

    // A's (stale) response finally resolves late - it must be ignored.
    resolveA({ text: async () => 'Content for A' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(screen.getByRole('heading', { name: '2026-08-11' })).toBeInTheDocument()
    expect(screen.getByText('Content for B')).toBeInTheDocument()
    expect(screen.queryByText('Content for A')).not.toBeInTheDocument()
  })
})

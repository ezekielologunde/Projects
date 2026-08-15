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
})

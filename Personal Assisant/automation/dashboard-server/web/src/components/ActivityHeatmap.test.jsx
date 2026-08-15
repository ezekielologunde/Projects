import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ActivityHeatmap from './ActivityHeatmap'

describe('ActivityHeatmap', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders 28 day cells, and ranks a day with activity above an empty day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0)) // "today" = Aug 15, 2026 (local)

    const data = {
      applications: [
        { found_at: '2026-08-10' },
        { found_at: '2026-08-10' },
        { found_at: '2026-08-10' },
      ],
      digests: [{ date: '2026-08-10' }],
      news: [{ date: '2026-08-10' }],
      inbox: [{ date: '2026-08-10' }],
    }

    render(<ActivityHeatmap data={data} />)

    const cells = screen.getAllByTitle(/:/)
    expect(cells).toHaveLength(28)

    // Aug 10 gets 3 (applications) + 1 (digests) + 1 (news) + 1 (inbox) = 6, the
    // day-28 window's oldest day (Jul 19) has none of the seeded activity.
    const busyCell = screen.getByTitle('Aug 10: 6 items')
    const quietCell = screen.getByTitle('Jul 19: 0 items')
    expect(Number(busyCell.getAttribute('data-level'))).toBeGreaterThan(Number(quietCell.getAttribute('data-level')))
    expect(busyCell.getAttribute('data-level')).toBe('4')
    expect(quietCell.getAttribute('data-level')).toBe('0')
  })

  it('handles missing collections without crashing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))
    render(<ActivityHeatmap data={{}} />)
    expect(screen.getAllByTitle(/:/)).toHaveLength(28)
  })
})

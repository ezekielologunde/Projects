import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActivityChart from './ActivityChart'

describe('ActivityChart', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts applications per day for the default 7-day period, with a visible sliver on zero-count days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0)) // "today" = Aug 15, 2026 (local)

    const applications = [
      { found_at: '2026-08-14' },
      { found_at: '2026-08-14' },
      { found_at: '2026-08-15' },
      { found_at: '2026-07-01' }, // outside the 7-day window entirely
    ]

    const { container } = render(<ActivityChart applications={applications} />)

    // 7-day window ending today: Aug 9 - Aug 15.
    expect(container.querySelectorAll('.barchart rect')).toHaveLength(7)
    expect(screen.getAllByTitle(/found$/)).toHaveLength(7)

    const busiest = screen.getByTitle('Aug 14: 2 found')
    const today = screen.getByTitle('Aug 15: 1 found')
    const quiet = screen.getByTitle('Aug 9: 0 found')

    // max = 2, so Aug 14 (count 2) fills the full plot height (128 - 6*2 = 116).
    expect(busiest.getAttribute('height')).toBe('116.0')
    // Aug 15 (count 1) is half that.
    expect(today.getAttribute('height')).toBe('58.0')
    // Aug 9 (count 0) still gets the minimum 3px visible sliver, not zero.
    expect(quiet.getAttribute('height')).toBe('3.0')

    // Last (most recent/today) day-axis label is highlighted.
    const labels = container.querySelectorAll('.chart-days span')
    expect(labels).toHaveLength(7)
    expect(labels[labels.length - 1]).toHaveClass('on')
  })

  it('switches to a 14-day range when "last 2 weeks" is selected from the period menu', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))

    const { container } = render(<ActivityChart applications={[]} />)
    expect(container.querySelectorAll('.barchart rect')).toHaveLength(7)
    expect(container.querySelector('.period-btn')).toHaveTextContent('this week')

    fireEvent.click(container.querySelector('.period-btn'))
    fireEvent.click(screen.getByRole('button', { name: 'last 2 weeks' }))

    expect(container.querySelectorAll('.barchart rect')).toHaveLength(14)
    expect(container.querySelectorAll('.chart-days span')).toHaveLength(14)
    expect(container.querySelector('.period-btn')).toHaveTextContent('last 2 weeks')
    // Selecting an option also closes the menu.
    expect(container.querySelector('.period-select')).not.toHaveClass('open')
  })

  it('closes the period menu when clicking outside it', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))

    const { container } = render(<ActivityChart applications={[]} />)

    fireEvent.click(container.querySelector('.period-btn'))
    expect(container.querySelector('.period-select')).toHaveClass('open')

    fireEvent.click(document.body)
    expect(container.querySelector('.period-select')).not.toHaveClass('open')
  })

  it('shows weekday abbreviations for 7/14-day periods and switches to day-of-month numbers beyond 14 days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))

    const { container } = render(<ActivityChart applications={[]} />)

    let labels = [...container.querySelectorAll('.chart-days span')].map((s) => s.textContent)
    expect(labels).toHaveLength(7)
    expect(labels.every((l) => /^[A-Za-z]{3}$/.test(l))).toBe(true)

    fireEvent.click(container.querySelector('.period-btn'))
    fireEvent.click(screen.getByRole('button', { name: 'this month' }))

    labels = [...container.querySelectorAll('.chart-days span')].map((s) => s.textContent)
    expect(labels).toHaveLength(30)
    expect(labels.every((l) => /^\d{1,2}$/.test(l))).toBe(true)
    // The 30th (last/today) entry should be "15" — the day-of-month for Aug 15.
    expect(labels[labels.length - 1]).toBe('15')
  })
})

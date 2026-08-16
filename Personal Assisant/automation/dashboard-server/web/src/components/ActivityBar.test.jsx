import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ActivityBar from './ActivityBar'

// Reduced-motion mock (same helper as useCountUp.test.js) so every
// useCountUp instance in the tree (headline % + 3 chips) resolves straight
// to its target value on mount, instead of needing to drive several
// concurrent requestAnimationFrame loops deterministically.
function mockMatchMedia(matches) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
}

describe('ActivityBar', () => {
  afterEach(() => {
    delete window.matchMedia
  })

  it('buckets applications by status, excludes dropped from the total, and renders correct counts/percentages', () => {
    mockMatchMedia(true)
    const applications = [
      { status: 'dropped' }, // excluded entirely
      { status: 'staged' }, // progress
      { status: 'applied' }, // completed
      { status: 'interview' }, // completed
      { status: 'needs_manual_completion' }, // followup
    ]
    const { container } = render(<ActivityBar applications={applications} />)

    // 4 non-dropped apps: 1 progress, 2 completed, 1 followup
    const chips = container.querySelectorAll('.activity-chip')
    expect(chips).toHaveLength(3)
    expect(chips[0].textContent).toContain('1')
    expect(chips[0].textContent).toContain('In Progress')
    expect(chips[1].textContent).toContain('2')
    expect(chips[1].textContent).toContain('Completed')
    expect(chips[2].textContent).toContain('1')
    expect(chips[2].textContent).toContain('Needs Follow-up')

    // headline stat: completed (2) / total (4) = 50% "moved on"
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('moved on')).toBeInTheDocument()

    // segment tooltips: 25% / 50% / 25%
    expect(screen.getByTitle('In Progress: 25%')).toBeInTheDocument()
    expect(screen.getByTitle('Completed: 50%')).toBeInTheDocument()
    expect(screen.getByTitle('Needs Follow-up: 25%')).toBeInTheDocument()
  })

  it('treats ready_to_submit, rejected, and unknown per the same bucket rules as staged/applied/needs_manual_completion', () => {
    mockMatchMedia(true)
    const applications = [
      { status: 'ready_to_submit' }, // progress
      { status: 'rejected' }, // completed
      { status: 'unknown' }, // followup
    ]
    render(<ActivityBar applications={applications} />)
    expect(screen.getByTitle('In Progress: 33%')).toBeInTheDocument()
    expect(screen.getByTitle('Completed: 33%')).toBeInTheDocument()
    expect(screen.getByTitle('Needs Follow-up: 33%')).toBeInTheDocument()
  })

  it('does not render a segment for a bucket at 0%', () => {
    mockMatchMedia(true)
    const applications = [{ status: 'staged' }, { status: 'applied' }]
    const { container } = render(<ActivityBar applications={applications} />)

    expect(container.querySelectorAll('.activity-seg')).toHaveLength(2)
    expect(screen.queryByTitle(/Needs Follow-up/)).not.toBeInTheDocument()
    expect(screen.getByTitle('In Progress: 50%')).toBeInTheDocument()
    expect(screen.getByTitle('Completed: 50%')).toBeInTheDocument()
  })

  it('shows an empty message instead of a broken 0-width bar when there are no applications', () => {
    render(<ActivityBar applications={[]} />)
    expect(screen.getByText('no applications yet.')).toBeInTheDocument()
    expect(document.querySelector('.activity-segbar')).not.toBeInTheDocument()
  })

  it('shows the empty message when every application is dropped', () => {
    render(<ActivityBar applications={[{ status: 'dropped' }, { status: 'dropped' }]} />)
    expect(screen.getByText('no applications yet.')).toBeInTheDocument()
    expect(document.querySelector('.activity-chip')).not.toBeInTheDocument()
  })
})

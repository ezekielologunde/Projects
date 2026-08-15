import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatCards from './StatCards'

describe('StatCards', () => {
  it('renders one card per status key with a readable label', () => {
    render(<StatCards counts={{ staged: 3, needs_manual_completion: 1 }} trends={{}} />)
    expect(screen.getByText('staged')).toBeInTheDocument()
    expect(screen.getByText('needs manual completion')).toBeInTheDocument()
  })

  it('shows a trend badge for a nonzero trend', () => {
    render(<StatCards counts={{ applied: 5 }} trends={{ applied: 2 }} />)
    expect(screen.getByText('+2 today')).toBeInTheDocument()
  })

  it('shows a negative trend badge worded distinctly from the positive case', () => {
    render(<StatCards counts={{ rejected: 4 }} trends={{ rejected: -1 }} />)
    expect(screen.getByText('-1 today')).toBeInTheDocument()
  })

  it('does not render a trend badge for a zero or missing trend', () => {
    render(<StatCards counts={{ staged: 2, applied: 1 }} trends={{ staged: 0 }} />)
    expect(screen.queryByText(/today/)).not.toBeInTheDocument()
  })

  it('renders a card even for a status not in the built-in color map, instead of crashing', () => {
    render(<StatCards counts={{ some_new_status: 1 }} trends={{}} />)
    expect(screen.getByText('some new status')).toBeInTheDocument()
  })

  it('renders nothing when there are no counts', () => {
    const { container } = render(<StatCards counts={{}} trends={{}} />)
    expect(container).toBeEmptyDOMElement()
  })
})

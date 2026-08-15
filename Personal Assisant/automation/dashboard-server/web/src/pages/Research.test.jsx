import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Research from './Research'

describe('Research', () => {
  it('renders the degree and the open-items card', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        research: {
          program: { degree: 'Doctor of Engineering', institution: 'GWU', location: 'Washington, DC', expected: '2027', status: 'in progress' },
          research_areas: ['Zero Trust', 'AI/ML threat modeling'],
          publications: null,
          _meta: { open_items: ['Advisor name unconfirmed'] },
        },
      }),
    })
    render(<Research />)
    await waitFor(() => expect(screen.getByText('Doctor of Engineering')).toBeInTheDocument())
    expect(screen.getByText(/Advisor name unconfirmed/)).toBeInTheDocument()
  })
})

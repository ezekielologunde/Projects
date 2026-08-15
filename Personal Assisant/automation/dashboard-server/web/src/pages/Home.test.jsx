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
})

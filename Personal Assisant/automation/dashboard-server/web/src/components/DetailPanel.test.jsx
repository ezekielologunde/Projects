import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DetailPanel from './DetailPanel'

describe('DetailPanel', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        related: [{ kind: 'goal', id: 'Cyntraix growth', label: 'Cyntraix growth', sub: 'business · active' }],
      }),
    })
  })

  it('fetches and shows related items', async () => {
    render(<DetailPanel kind="application" id="2026-08-14_Acme_Analyst" title="Acme" sub="Analyst" note="" onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('Cyntraix growth')).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith('/api/related?kind=application&id=2026-08-14_Acme_Analyst')
  })

  it('shows a plain empty state when nothing is related', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ related: [] }) })
    render(<DetailPanel kind="goal" id="Unrelated goal" title="Unrelated goal" sub="" note="" onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText(/nothing else on file relates/i)).toBeInTheDocument())
  })
})

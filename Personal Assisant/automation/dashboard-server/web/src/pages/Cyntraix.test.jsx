import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Cyntraix from './Cyntraix'

describe('Cyntraix', () => {
  it('renders an active client and the open-items card', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        cyntraix: {
          business: { name: 'Cyntraix', role: 'Founder', founded: '2025-01', structure: 'AL LLC' },
          clients: [{ name: 'Client A', status: 'active', cadence_note: 'weekly timesheet' }],
          _meta: { open_items: ['Rate not on file'] },
        },
      }),
    })
    render(<Cyntraix />)
    await waitFor(() => expect(screen.getByText('Client A')).toBeInTheDocument())
    expect(screen.getByText(/Rate not on file/)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import JobSearch from './JobSearch'

describe('JobSearch', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        applications: [
          { folder: 'a', status: 'staged', company: 'Acme', role: 'Analyst', found_at: '2026-08-15', url: '', notes: '', docs: {} },
          { folder: 'b', status: 'interview', company: 'Globex', role: 'Engineer', found_at: '2026-08-14', url: '', notes: '', docs: {} },
        ],
      }),
    })
  })

  it('filters to only interview-stage applications when that pill is clicked', async () => {
    render(<JobSearch />)
    await waitFor(() => expect(screen.getByText('Acme')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^interview$/i }))
    expect(screen.queryByText('Acme')).not.toBeInTheDocument()
    expect(screen.getByText('Globex')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Goals from './Goals'

describe('Goals', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        goals: [
          { title: 'Finish DEng praxis', status: 'active', category: 'academic', notes: '', target_date: '2027-05-01' },
          { title: 'Old goal', status: 'done', category: 'career', notes: '' },
        ],
      }),
    })
  })

  it('filters to only active goals when that pill is clicked', async () => {
    render(<Goals />)
    await waitFor(() => expect(screen.getByText('Finish DEng praxis')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^active$/i }))
    expect(screen.getByText('Finish DEng praxis')).toBeInTheDocument()
    expect(screen.queryByText('Old goal')).not.toBeInTheDocument()
  })
})

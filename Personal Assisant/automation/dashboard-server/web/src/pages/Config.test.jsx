import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Config from './Config'

describe('Config', () => {
  it('renders max leads/day and work auth from preferences', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        preferences: { max_new_applications_per_day: 5, target_roles: {} },
        workAuth: 'STEM OPT',
      }),
    })
    render(<Config />)
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
    expect(screen.getByText('STEM OPT')).toBeInTheDocument()
  })
})

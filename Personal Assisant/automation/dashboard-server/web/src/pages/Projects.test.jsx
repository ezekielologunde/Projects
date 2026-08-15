import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Projects from './Projects'

describe('Projects', () => {
  it('renders a project with its ownership label', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        projectsRegistry: {
          projects: [{ name: 'Preppa', type: 'food-marketplace app', ownership: 'own_venture', status: 'active', note: 'real order flow confirmed' }],
          _meta: {},
        },
      }),
    })
    render(<Projects />)
    await waitFor(() => expect(screen.getByText('Preppa')).toBeInTheDocument())
    expect(screen.getByText('own venture')).toBeInTheDocument()
  })
})

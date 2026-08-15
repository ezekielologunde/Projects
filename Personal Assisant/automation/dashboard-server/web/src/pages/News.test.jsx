import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import News from './News'

describe('News', () => {
  it('renders its own heading and the news item date, not a sibling data key', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        inbox: [{ date: '2026-08-10' }],
        news: [{ date: '2026-08-11' }],
        digests: [{ date: '2026-08-12' }],
      }),
    })
    render(<News />)
    await waitFor(() => expect(screen.getByText('cyber/AI news digests')).toBeInTheDocument())
    expect(screen.getByText('2026-08-11')).toBeInTheDocument()
  })
})

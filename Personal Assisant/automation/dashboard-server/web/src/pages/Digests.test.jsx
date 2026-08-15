import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Digests from './Digests'

describe('Digests', () => {
  it('renders its own heading and the digest item date, not a sibling data key', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        inbox: [{ date: '2026-08-10' }],
        news: [{ date: '2026-08-11' }],
        digests: [{ date: '2026-08-12' }],
      }),
    })
    render(<Digests />)
    await waitFor(() => expect(screen.getByText('daily digests')).toBeInTheDocument())
    expect(screen.getByText('2026-08-12')).toBeInTheDocument()
  })
})

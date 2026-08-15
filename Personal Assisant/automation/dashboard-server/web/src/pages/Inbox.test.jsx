import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Inbox from './Inbox'

describe('Inbox', () => {
  it('renders its own heading and the inbox item date, not a sibling data key', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        inbox: [{ date: '2026-08-10' }],
        news: [{ date: '2026-08-11' }],
        digests: [{ date: '2026-08-12' }],
      }),
    })
    render(<Inbox />)
    await waitFor(() => expect(screen.getByText('inbox — needs revisiting')).toBeInTheDocument())
    expect(screen.getByText('2026-08-10')).toBeInTheDocument()
  })
})

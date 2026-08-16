import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

describe('App auth check', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('renders Login when the auth check request fails outright (network error)', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network down'))
    render(<App />)

    await waitFor(() => expect(screen.getByText(/HoWz/i)).toBeInTheDocument())
  })

  it('renders Login when the auth check responds with a non-401 error status', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    render(<App />)

    await waitFor(() => expect(screen.getByText(/HoWz/i)).toBeInTheDocument())
  })

  it('renders the app shell when the auth check responds 200 OK', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200 })
    // mockResolvedValue (not Once) — the app shell mounts both TopHeader
    // and Home, and each calls useDashboardData() independently (this
    // app's per-component-fetch pattern, no shared data layer), so
    // /api/dashboard gets fetched more than once after the auth check.
    global.fetch.mockResolvedValue({
      json: async () => ({
        applications: [],
        counts: {},
        goals: [],
        cyntraix: null,
        research: null,
        paymentsDueSoon: [],
        firstName: null,
      }),
    })
    render(<App />)

    await waitFor(() => expect(screen.queryByText('HoWz')).not.toBeInTheDocument())
  })
})

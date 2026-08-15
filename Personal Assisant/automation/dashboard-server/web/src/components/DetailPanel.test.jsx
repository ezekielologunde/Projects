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

  it('ignores a stale response that resolves after kind/id already changed (race condition)', async () => {
    // Two deferred fetches we can resolve in whatever order we choose, so the
    // test controls the race deterministically instead of relying on timers.
    let resolveFirst
    let resolveSecond
    const firstPromise = new Promise((resolve) => { resolveFirst = resolve })
    const secondPromise = new Promise((resolve) => { resolveSecond = resolve })

    global.fetch = vi.fn((url) => {
      if (url.includes('id=first-item')) return firstPromise
      if (url.includes('id=second-item')) return secondPromise
      throw new Error(`unexpected fetch url: ${url}`)
    })

    const { rerender } = render(
      <DetailPanel kind="application" id="first-item" title="First" sub="" note="" onClose={() => {}} />
    )

    // User quickly clicks a second item before the first request resolves.
    rerender(<DetailPanel kind="application" id="second-item" title="Second" sub="" note="" onClose={() => {}} />)

    // The second (current) request resolves and renders its related list.
    resolveSecond({ json: async () => ({ related: [{ kind: 'goal', id: 'g2', label: 'Second related', sub: 'x' }] }) })
    await waitFor(() => expect(screen.getByText('Second related')).toBeInTheDocument())

    // The first (stale) request finally resolves late - it must be ignored.
    resolveFirst({ json: async () => ({ related: [{ kind: 'goal', id: 'g1', label: 'First related', sub: 'x' }] }) })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(screen.getByText('Second related')).toBeInTheDocument()
    expect(screen.queryByText('First related')).not.toBeInTheDocument()
  })
})

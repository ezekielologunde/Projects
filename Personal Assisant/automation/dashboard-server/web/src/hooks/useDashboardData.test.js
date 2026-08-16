import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardData } from './useDashboardData'

describe('useDashboardData', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('sets data and clears loading/error on a successful fetch', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ counts: { staged: 1 } }) })
    const { result } = renderHook(() => useDashboardData())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ counts: { staged: 1 } })
    expect(result.current.error).toBe(null)
  })

  it('sets error and clears loading on a rejected fetch, leaving data null instead of hanging', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network down'))
    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.data).toBe(null)
  })
})

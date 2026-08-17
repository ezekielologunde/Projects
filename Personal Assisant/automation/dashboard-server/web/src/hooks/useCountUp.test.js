import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountUp } from './useCountUp'

// A controllable requestAnimationFrame stand-in: nothing runs until the test
// calls flush(now) with a specific timestamp, so the easing curve can be
// asserted deterministically instead of racing real frame timing.
function installFakeRAF() {
  let pending = null
  const raf = vi.fn((cb) => { pending = cb; return 1 })
  const caf = vi.fn(() => { pending = null })
  window.requestAnimationFrame = raf
  window.cancelAnimationFrame = caf
  return {
    raf,
    caf,
    flush(now) {
      const cb = pending
      pending = null
      if (cb) cb(now)
    },
  }
}

function mockMatchMedia(matches) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
}

describe('useCountUp', () => {
  let fakeRAF

  beforeEach(() => {
    fakeRAF = installFakeRAF()
    vi.spyOn(performance, 'now').mockReturnValue(1000)
  })

  afterEach(() => {
    // Only clear matchMedia: the hook reads window.matchMedia as a qualified
    // property (safe once missing), but calls requestAnimationFrame /
    // cancelAnimationFrame as bare identifiers — deleting those globals
    // entirely (rather than letting the next beforeEach overwrite them)
    // would throw a ReferenceError when React's unmount cleanup (run by the
    // global `afterEach(cleanup)` in test-setup.js) fires after this hook,
    // since vitest runs afterEach hooks in reverse registration order.
    delete window.matchMedia
    vi.restoreAllMocks()
  })

  it('eventually animates up to the target value', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useCountUp(100, 500))

    act(() => { fakeRAF.flush(1250) }) // halfway through the duration
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(100)

    act(() => { fakeRAF.flush(1500) }) // duration fully elapsed
    expect(result.current).toBe(100)
  })

  it('returns the target immediately when prefers-reduced-motion is set, skipping the animation', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useCountUp(77, 5000))
    expect(result.current).toBe(77)
    expect(fakeRAF.raf).not.toHaveBeenCalled()
  })

  it('force-corrects to the target if requestAnimationFrame never fires (e.g. a backgrounded tab)', () => {
    mockMatchMedia(false)
    // Only fake setTimeout/clearTimeout — the fallback mechanism under test.
    // Leaving requestAnimationFrame/cancelAnimationFrame out of `toFake` means
    // installFakeRAF()'s mock (from beforeEach) stays in control of RAF, and
    // since this test deliberately never calls fakeRAF.flush(), RAF's callback
    // genuinely never fires, matching the real-world scenario being tested.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { result } = renderHook(() => useCountUp(42, 500))

    // Deliberately never call fakeRAF.flush() — this simulates the browser
    // scheduling the frame but never actually painting it, so the tick
    // callback never runs and the value would otherwise be stuck at 0.
    expect(result.current).toBe(0)

    act(() => { vi.advanceTimersByTime(599) }) // duration + 100 not yet elapsed
    expect(result.current).toBe(0)

    act(() => { vi.advanceTimersByTime(2) }) // now past duration + 100
    expect(result.current).toBe(42)

    vi.useRealTimers()
  })

  it('animates from the previously-rendered value (not always from 0) when the target changes', () => {
    mockMatchMedia(false)
    const { result, rerender } = renderHook(({ target }) => useCountUp(target, 500), {
      initialProps: { target: 10 },
    })
    act(() => { fakeRAF.flush(1500) })
    expect(result.current).toBe(10)

    performance.now.mockReturnValue(2000)
    rerender({ target: 20 })
    act(() => { fakeRAF.flush(2001) }) // a hair into the new animation

    // If the hook incorrectly reset to 0 before counting up, this would read
    // a value near 0 instead of a value that starts climbing from 10.
    expect(result.current).toBeGreaterThanOrEqual(10)
    expect(result.current).toBeLessThan(20)
  })
})

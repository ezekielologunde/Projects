import { useEffect, useRef, useState } from 'react'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// Animates a number from its last-rendered value up (or down) to `target`
// using a cubic ease-out curve, mirroring the old vanilla-JS dashboard's
// countUp() — same 500ms default duration, same `1 - (1-p)^3` easing.
// Re-triggers from wherever the number currently sits whenever `target`
// changes (not always from 0), and collapses straight to `target` when the
// user has requested reduced motion.
export function useCountUp(target, duration = 500) {
  const [value, setValue] = useState(0)
  const valueRef = useRef(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const start = valueRef.current
    if (start === target) return undefined

    if (prefersReducedMotion()) {
      valueRef.current = target
      setValue(target)
      return undefined
    }

    const startTime = performance.now()
    let settled = false

    function tick(now) {
      const p = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const next = Math.round(start + (target - start) * eased)
      valueRef.current = next
      setValue(next)
      if (p < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        settled = true
      }
    }
    frameRef.current = requestAnimationFrame(tick)

    // Safety net: requestAnimationFrame's callback only fires once the browser
    // actually paints a frame. If it never does (a backgrounded/inactive tab,
    // throttled rendering, or any other reason a frame never gets composited),
    // the value would otherwise be stuck wherever it started — permanently,
    // since nothing re-triggers this effect unless `target` itself changes
    // again. Force-correct to `target` shortly after the animation should
    // have finished so a stalled decorative animation can never leave the
    // displayed number wrong.
    const fallbackTimer = setTimeout(() => {
      if (!settled) {
        settled = true
        valueRef.current = target
        setValue(target)
      }
    }, duration + 100)

    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current)
      clearTimeout(fallbackTimer)
    }
  }, [target, duration])

  return value
}

import { useEffect } from 'react'

// Shared "menu is open, clicking outside closes it, Escape closes it and
// returns focus to the trigger" behavior — extracted from ActivityChart.jsx's
// period selector and TopHeader.jsx's account menu, which both implemented
// this identically.
//
// Only attaches listeners while `isOpen` is true, and detaches them on
// close/unmount. Reattaching per `isOpen` toggle (rather than once on mount)
// avoids a stale closure over `isOpen` without needing a ref to track it.
// This can't misfire on the very click that opens the menu, because that
// click's target (the trigger button) is inside `containerRef`, so
// `.contains(e.target)` is true and the handler leaves it open.
//
// `setOpen` is expected to be a React state setter (or anything with the
// same "always the same function reference across renders" guarantee) so
// it can sit in the effect's dependency array without causing the
// listeners to be torn down and reattached on every render — matching the
// original two call sites, whose effects depended only on their `open`
// boolean and called `setOpen`/`setMenuOpen` directly.
export function useOutsideClickClose(containerRef, triggerRef, isOpen, setOpen) {
  useEffect(() => {
    if (!isOpen) return undefined
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, containerRef, triggerRef, setOpen])
}

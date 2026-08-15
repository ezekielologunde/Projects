import { useEffect, useState } from 'react'

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M13 8.79A5.5 5.5 0 1 1 6.21 2a4.4 4.4 0 0 0 6.79 6.79Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="3.25" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M7.5 0.75v1.75" />
        <path d="M7.5 12.5v1.75" />
        <path d="M14.25 7.5h-1.75" />
        <path d="M2.5 7.5H0.75" />
        <path d="M12.36 2.64l-1.24 1.24" />
        <path d="M3.88 11.12l-1.24 1.24" />
        <path d="M12.36 12.36l-1.24-1.24" />
        <path d="M3.88 3.88L2.64 2.64" />
      </g>
    </svg>
  )
}

const STORAGE_KEY = 'howz-theme'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.setAttribute('data-theme', stored)
      setTheme(stored)
    } else {
      const prefersDark =
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : true
      setTheme(prefersDark ? 'dark' : 'light')
    }
  }, [])

  function applyTheme(next) {
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem(STORAGE_KEY, next)
    setTheme(next)
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      <button
        type="button"
        className={`theme-toggle-btn${theme === 'dark' ? ' on' : ''}`}
        aria-label="Dark mode"
        onClick={() => applyTheme('dark')}
      >
        <MoonIcon />
      </button>
      <button
        type="button"
        className={`theme-toggle-btn${theme === 'light' ? ' on' : ''}`}
        aria-label="Light mode"
        onClick={() => applyTheme('light')}
      >
        <SunIcon />
      </button>
    </div>
  )
}

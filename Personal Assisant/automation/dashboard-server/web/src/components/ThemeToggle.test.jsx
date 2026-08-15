import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeToggle from './ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders both buttons with correct aria-labels', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Dark mode' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Light mode' })).toBeInTheDocument()
  })

  it('clicking "Dark mode" sets data-theme to dark and persists to localStorage', () => {
    localStorage.setItem('howz-theme', 'light')
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Light mode' })).toHaveClass('on')
    fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('howz-theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveClass('on')
    expect(screen.getByRole('button', { name: 'Light mode' })).not.toHaveClass('on')
  })

  it('clicking "Light mode" sets data-theme to light and persists to localStorage', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Light mode' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('howz-theme')).toBe('light')
    expect(screen.getByRole('button', { name: 'Light mode' })).toHaveClass('on')
  })

  it('reflects a pre-existing stored theme as already-active on mount', () => {
    localStorage.setItem('howz-theme', 'light')
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Light mode' })).toHaveClass('on')
    expect(screen.getByRole('button', { name: 'Dark mode' })).not.toHaveClass('on')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})

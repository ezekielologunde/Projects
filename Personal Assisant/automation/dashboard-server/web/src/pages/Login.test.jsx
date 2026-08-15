import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Login from './Login'

describe('Login', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('calls onSuccess after a correct password is submitted', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    const onSuccess = vi.fn()
    render(<Login onSuccess={onSuccess} />)

    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'cyntraix-orbit-7291' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledWith('/api/login', expect.objectContaining({ method: 'POST' }))
  })

  it('shows an error and does not call onSuccess on a wrong password', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ ok: false }) })
    const onSuccess = vi.fn()
    render(<Login onSuccess={onSuccess} />)

    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))

    await waitFor(() => expect(screen.getByText(/this device isn't recognized|incorrect/i)).toBeInTheDocument())
    expect(onSuccess).not.toHaveBeenCalled()
  })
})

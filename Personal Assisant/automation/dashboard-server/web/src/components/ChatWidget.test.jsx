import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatWidget from './ChatWidget'

describe('ChatWidget', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('is collapsed to a bubble by default', () => {
    render(<ChatWidget />)
    expect(screen.queryByPlaceholderText(/ask howz/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ask howz anything/i })).toBeInTheDocument()
  })

  it('opens the panel, sends a question, and shows the answer', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ answer: 'You have 2 applications staged.', matched: true }) })
    render(<ChatWidget />)

    fireEvent.click(screen.getByRole('button', { name: /ask howz anything/i }))
    fireEvent.change(screen.getByPlaceholderText(/ask howz/i), { target: { value: 'how many applications are staged?' } })
    fireEvent.submit(screen.getByTestId('chat-form'))

    await waitFor(() => expect(screen.getByText('You have 2 applications staged.')).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }))
  })

  it('shows a plain fallback when the engine has no rule for the question', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ answer: '', matched: false }) })
    render(<ChatWidget />)

    fireEvent.click(screen.getByRole('button', { name: /ask howz anything/i }))
    fireEvent.change(screen.getByPlaceholderText(/ask howz/i), { target: { value: 'what is the meaning of life?' } })
    fireEvent.submit(screen.getByTestId('chat-form'))

    await waitFor(() => expect(screen.getByText(/don't have an answer for that yet/i)).toBeInTheDocument())
  })

  it('shows an error and re-enables the send button when the request rejects (network failure)', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network down'))
    render(<ChatWidget />)

    fireEvent.click(screen.getByRole('button', { name: /ask howz anything/i }))
    fireEvent.change(screen.getByPlaceholderText(/ask howz/i), { target: { value: 'how many applications are staged?' } })
    fireEvent.submit(screen.getByTestId('chat-form'))

    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled()
  })
})

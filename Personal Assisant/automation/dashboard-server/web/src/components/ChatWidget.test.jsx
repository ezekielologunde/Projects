import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatWidget from './ChatWidget'

describe('ChatWidget', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('shows a persistent input bar with suggested-prompt pills, not a collapsed bubble', () => {
    render(<ChatWidget />)
    expect(screen.getByPlaceholderText(/ask howz/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /how many applications are staged\?/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ask howz anything/i })).not.toBeInTheDocument()
  })

  it('does not show the message log until a conversation has started', () => {
    render(<ChatWidget />)
    expect(screen.queryByText('…')).not.toBeInTheDocument()
  })

  it('types a question, submits, and shows the answer', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ answer: 'You have 2 applications staged.', matched: true }) })
    render(<ChatWidget />)

    fireEvent.change(screen.getByPlaceholderText(/ask howz/i), { target: { value: 'how many applications are staged?' } })
    fireEvent.submit(screen.getByTestId('chat-form'))

    await waitFor(() => expect(screen.getByText('You have 2 applications staged.')).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }))
  })

  it('clicking a suggested-prompt pill sends that question immediately', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ answer: 'Two interviews this week.', matched: true }) })
    render(<ChatWidget />)

    fireEvent.click(screen.getByRole('button', { name: /any interviews this week\?/i }))

    await waitFor(() => expect(screen.getByText('Two interviews this week.')).toBeInTheDocument())
    // "Any interviews this week?" now appears twice — once as the pill label,
    // once echoed as the "me" message — so assert on the echoed one specifically.
    expect(document.querySelector('.chat-msg.me').textContent).toBe('Any interviews this week?')
    expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }))
  })

  it('shows a plain fallback when the engine has no rule for the question', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ answer: '', matched: false }) })
    render(<ChatWidget />)

    fireEvent.change(screen.getByPlaceholderText(/ask howz/i), { target: { value: 'what is the meaning of life?' } })
    fireEvent.submit(screen.getByTestId('chat-form'))

    await waitFor(() => expect(screen.getByText(/don't have an answer for that yet/i)).toBeInTheDocument())
  })

  it('shows an error and re-enables the send button when the request rejects (network failure)', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network down'))
    render(<ChatWidget />)

    fireEvent.change(screen.getByPlaceholderText(/ask howz/i), { target: { value: 'how many applications are staged?' } })
    fireEvent.submit(screen.getByTestId('chat-form'))

    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled()
  })

  it('ignores a second submit while a request is still pending (no duplicate fetch)', async () => {
    // A deferred fetch we control, so we can attempt the second submit
    // before the first one resolves (same pattern as the stale-response
    // race tests in DetailPanel.test.jsx / DatedList.test.jsx).
    let resolveFetch
    const pending = new Promise((resolve) => { resolveFetch = resolve })
    global.fetch.mockReturnValueOnce(pending)
    render(<ChatWidget />)

    fireEvent.change(screen.getByPlaceholderText(/ask howz/i), { target: { value: 'how many applications are staged?' } })
    fireEvent.submit(screen.getByTestId('chat-form'))

    expect(global.fetch).toHaveBeenCalledTimes(1)

    // Rapid second submit attempt (e.g. pressing Enter again) while the
    // first request is still in flight - must be a no-op, not a second fetch.
    // Give the input a new non-empty value first so the pre-existing
    // `!question.trim()` guard can't be what blocks this (the field was
    // cleared after the first submit) - this isolates the `if (sending)
    // return` guard as the only thing that can still block the resubmit.
    fireEvent.change(screen.getByPlaceholderText(/ask howz/i), { target: { value: 'a different question' } })
    fireEvent.submit(screen.getByTestId('chat-form'))
    expect(global.fetch).toHaveBeenCalledTimes(1)

    // A pill click while sending must also be a no-op (same `sending` guard).
    fireEvent.click(screen.getByRole('button', { name: /any interviews this week\?/i }))
    expect(global.fetch).toHaveBeenCalledTimes(1)

    resolveFetch({ json: async () => ({ answer: 'You have 2 applications staged.', matched: true }) })
    await waitFor(() => expect(screen.getByText('You have 2 applications staged.')).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns focus to the input after an answer arrives', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ answer: 'You have 2 applications staged.', matched: true }) })
    render(<ChatWidget />)

    fireEvent.change(screen.getByPlaceholderText(/ask howz/i), { target: { value: 'how many applications are staged?' } })
    fireEvent.submit(screen.getByTestId('chat-form'))

    await waitFor(() => expect(screen.getByText('You have 2 applications staged.')).toBeInTheDocument())
    expect(document.activeElement).toBe(screen.getByPlaceholderText(/ask howz/i))
  })
})

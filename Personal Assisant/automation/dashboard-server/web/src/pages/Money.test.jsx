import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Money from './Money'

describe('Money', () => {
  it('shows "nothing due" when paymentsDueSoon is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        finances: { accounts: [], recurring_payments: [], one_off_transactions_seen: [] },
        paymentsDueSoon: [],
      }),
    })
    render(<Money />)
    await waitFor(() => expect(screen.getByText(/nothing due/i)).toBeInTheDocument())
  })

  it('lists an account with its balance', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        finances: {
          accounts: [{ institution: 'Example Bank', last4: '0000', type: 'credit_card', owner_account: 'x@y.com', latest_statement: { balance: 1234.56, minimum_payment: 45, minimum_payment_due: '2026-09-01' }, note: '' }],
          recurring_payments: [], one_off_transactions_seen: [],
        },
        paymentsDueSoon: [],
      }),
    })
    render(<Money />)
    await waitFor(() => expect(screen.getByText('Example Bank')).toBeInTheDocument())
    expect(screen.getByText('$1234.56')).toBeInTheDocument()
  })

  it('puts the minus sign before the dollar sign for a negative balance', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        finances: {
          accounts: [{ institution: 'Example Bank', last4: '0000', type: 'checking', owner_account: 'x@y.com', latest_statement: { balance: -50, minimum_payment: 0 }, note: '' }],
          recurring_payments: [], one_off_transactions_seen: [],
        },
        paymentsDueSoon: [],
      }),
    })
    render(<Money />)
    await waitFor(() => expect(screen.getByText('-$50.00')).toBeInTheDocument())
  })

  it('falls back to an em dash instead of "$NaN" for a non-numeric amount', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        finances: { accounts: [], recurring_payments: [], one_off_transactions_seen: [] },
        paymentsDueSoon: [{ institution: 'Example Bank', amount: 'unknown', due: '2026-09-01' }],
      }),
    })
    render(<Money />)
    await waitFor(() => expect(screen.getByText('Example Bank')).toBeInTheDocument())
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
  })

  it('shows an error state instead of hanging on "loading…" when the fetch rejects', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network down'))
    render(<Money />)
    await waitFor(() => expect(screen.getByText(/couldn't load dashboard data/i)).toBeInTheDocument())
    expect(screen.queryByText(/loading…/i)).not.toBeInTheDocument()
  })
})

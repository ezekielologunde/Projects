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
          accounts: [{ institution: 'Discover Card', last4: '7921', type: 'credit_card', owner_account: 'x@y.com', latest_statement: { balance: 2396.63, minimum_payment: 76, minimum_payment_due: '2026-09-01' }, note: '' }],
          recurring_payments: [], one_off_transactions_seen: [],
        },
        paymentsDueSoon: [],
      }),
    })
    render(<Money />)
    await waitFor(() => expect(screen.getByText('Discover Card')).toBeInTheDocument())
    expect(screen.getByText('$2396.63')).toBeInTheDocument()
  })
})

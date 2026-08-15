import { describe, it, expect } from 'vitest'
import { answerQuestion } from './chatbot.js'

const sampleData = {
  applications: [
    { status: 'staged', company: 'Acme', role: 'Analyst' },
    { status: 'staged', company: 'Globex', role: 'Engineer' },
    { status: 'interview', company: 'Initech', role: 'Consultant' },
  ],
  counts: { staged: 2, interview: 1, applied: 0, rejected: 0, needs_manual_completion: 0, unknown: 0 },
  finances: {
    accounts: [
      {
        institution: 'Discover Card',
        last4: '7921',
        latest_statement: { balance: 2396.63, minimum_payment: 76, minimum_payment_due: '2026-09-01' },
      },
    ],
    recurring_payments: [{ payee: 'Christ Apostolic Church Salvation Centre', amount: 10, cadence: 'recurring' }],
  },
  paymentsDueSoon: [],
  goals: [
    { title: 'Finish DEng praxis', status: 'active' },
    { title: 'Launch Cyntraix v2', status: 'active' },
    { title: 'Old goal', status: 'done' },
  ],
}

describe('answerQuestion', () => {
  it('answers how many applications are staged', () => {
    const { answer, matched } = answerQuestion('how many applications are staged?', sampleData)
    expect(matched).toBe(true)
    expect(answer).toContain('2')
  })

  it('answers what the minimum payment due is', () => {
    const { answer, matched } = answerQuestion('what is my minimum payment due?', sampleData)
    expect(matched).toBe(true)
    expect(answer).toContain('Discover Card')
    expect(answer).toContain('76')
  })

  it('answers how many active goals exist', () => {
    const { answer, matched } = answerQuestion('how many active goals do I have?', sampleData)
    expect(matched).toBe(true)
    expect(answer).toContain('2')
  })

  it('answers which applications are at interview stage', () => {
    const { answer, matched } = answerQuestion('what is at interview stage?', sampleData)
    expect(matched).toBe(true)
    expect(answer).toContain('Initech')
  })

  it('returns matched:false for a question with no rule', () => {
    const { matched } = answerQuestion('what is the meaning of life?', sampleData)
    expect(matched).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { findRelated } from './cross-links.js'

const data = {
  applications: [
    { folder: '2026-08-14_Acme_Analyst', company: 'Acme', role: 'Analyst', notes: 'Ties to the Cyntraix growth goal.' },
  ],
  goals: [
    { title: 'Cyntraix growth', category: 'business', status: 'active', notes: 'Land the Acme analyst role as a reference client contact.' },
    { title: 'Unrelated goal', category: 'personal', status: 'active', notes: 'Nothing to do with any of that.' },
  ],
  finances: { accounts: [] },
}

describe('findRelated', () => {
  it('finds a goal that mentions the application company name', () => {
    const related = findRelated('application', '2026-08-14_Acme_Analyst', data)
    expect(related.some((r) => r.kind === 'goal' && r.label === 'Cyntraix growth')).toBe(true)
  })

  it('does not include unrelated goals', () => {
    const related = findRelated('application', '2026-08-14_Acme_Analyst', data)
    expect(related.some((r) => r.label === 'Unrelated goal')).toBe(false)
  })

  it('returns an empty array for an unknown id', () => {
    expect(findRelated('application', 'does-not-exist', data)).toEqual([])
  })

  it('includes an account as a related result when a goal title mentions the institution name', () => {
    // Source-token generation reads company/role/title/institution off the source item,
    // so the goal's *title* (not its notes) needs to carry the matching word here.
    const dataWithAccount = {
      applications: [],
      goals: [
        { title: 'Meridian payoff plan', category: 'finance', status: 'active', notes: '' },
      ],
      finances: {
        accounts: [{ institution: 'Meridian', last4: '4321', type: 'credit_card', note: 'Primary card' }],
      },
    }
    const related = findRelated('goal', 'Meridian payoff plan', dataWithAccount)
    expect(related.some((r) => r.kind === 'account' && r.id === 'Meridian4321' && r.label === 'Meridian')).toBe(true)
  })

  it('matches a short (<=4 char) institution/company name that the old length > 4 tokenize filter would have dropped', () => {
    const dataWithShortName = {
      applications: [{ folder: '2026-08-15_Visa_Support', company: 'Visa', role: 'Support', notes: '' }],
      goals: [
        { title: 'Card cleanup', category: 'finance', status: 'active', notes: 'Related to the Visa application process.' },
      ],
      finances: { accounts: [] },
    }
    const related = findRelated('application', '2026-08-15_Visa_Support', dataWithShortName)
    expect(related.some((r) => r.kind === 'goal' && r.label === 'Card cleanup')).toBe(true)
  })
})

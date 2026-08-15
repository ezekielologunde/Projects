import { describe, it, expect } from 'vitest'
import { findRelated } from './cross-links.js'

const data = {
  applications: [
    { folder: '2026-08-14_Acme_Analyst', company: 'Acme', role: 'Analyst', notes: 'Ties to the Cyntraix growth goal.' },
  ],
  goals: [
    { title: 'Cyntraix growth', category: 'business', status: 'active', notes: 'Land the Acme analyst role as a reference client contact.' },
    { title: 'Unrelated goal', category: 'personal', status: 'active', notes: 'Nothing to do with Acme.' },
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
})

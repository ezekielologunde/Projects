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

  it('does not link two unrelated items that only share a common short word ("plan")', () => {
    // Regression test for the over-matching risk introduced by lowering the
    // tokenize() length filter to > 2: a goal titled "... payoff plan" used to
    // yield the bare source token "plan", which — since matching is plain
    // substring inclusion against an untokenized haystack, not word-boundary
    // matching — would then spuriously match ANY unrelated item whose text
    // happens to contain "plan", including as a substring of "planning".
    //
    // Note: when the source is a goal, findRelated only searches applications
    // and accounts (a goal never matches against other goals — see the
    // `kind !== 'goal'` guard), so the false-positive target here is an
    // unrelated application rather than an unrelated goal.
    const dataWithStopword = {
      applications: [
        {
          folder: '2026-08-15_Globex_Ops',
          company: 'Globex',
          role: 'Ops',
          notes: 'Still planning the office relocation next quarter.',
        },
      ],
      goals: [
        {
          title: 'Debt payoff plan',
          category: 'finance',
          status: 'active',
          notes: 'Aggressively pay down the credit card balance.',
        },
      ],
      finances: { accounts: [] },
    }
    const related = findRelated('goal', 'Debt payoff plan', dataWithStopword)
    expect(related.some((r) => r.kind === 'application')).toBe(false)
  })

  it('still matches a genuine short company name ("Acme") after the stopword-list broadening', () => {
    // Confirms the broadened STOPWORDS set didn't overcorrect and accidentally
    // swallow a real short proper noun — the original bug the > 2 length
    // change was fixing. Covered by the "finds a goal that mentions the
    // application company name" test above (company: 'Acme'); re-asserted
    // explicitly here so the guarantee is visible next to the new stopword
    // regression test.
    const related = findRelated('application', '2026-08-14_Acme_Analyst', data)
    expect(related.some((r) => r.kind === 'goal' && r.label === 'Cyntraix growth')).toBe(true)
  })
})

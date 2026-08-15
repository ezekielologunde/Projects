import { describe, it, expect } from 'vitest'
import { pickHeroCandidate } from './briefing'

describe('pickHeroCandidate', () => {
  it('prioritizes an interview over a staged application', () => {
    const data = {
      applications: [{ status: 'interview' }, { status: 'staged' }],
      counts: { interview: 1 },
      goals: [],
      cyntraix: null,
      research: null,
    }
    const hero = pickHeroCandidate(data)
    expect(hero.line1).toBe('Interview')
  })

  it('falls back to "all caught up" when nothing needs attention', () => {
    const data = { applications: [], counts: {}, goals: [], cyntraix: null, research: null }
    const hero = pickHeroCandidate(data)
    expect(hero.line2).toBe('all caught up.')
  })
})

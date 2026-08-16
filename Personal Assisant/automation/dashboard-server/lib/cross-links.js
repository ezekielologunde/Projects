// Finds items in other modules that plausibly relate to a given item, by
// looking for the source item's own name/company/title inside other
// items' free-text fields (notes/status/role). Deliberately simple
// substring matching — there is no relational ID between profile/*.json
// and applications/*/status.json today, and building one is out of scope.

// Generic short words that would otherwise create noisy false-positive matches
// now that tokenize() keeps words as short as 3 characters.
const STOPWORDS = new Set(['the', 'and', 'for', 'are', 'was', 'not', 'but', 'has', 'had', 'you', 'his', 'her', 'its', 'llc', 'inc'])

function tokenize(str) {
  return String(str || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w)) // skip very short/common words
}

function textOf(item) {
  return [item.company, item.role, item.title, item.notes, item.status, item.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function textOfAccount(a) {
  return [a.institution, a.type, a.note, a.owner_account]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function findRelated(kind, id, data) {
  let source = null
  if (kind === 'application') source = (data.applications || []).find((a) => a.folder === id)
  if (kind === 'goal') source = (data.goals || []).find((g) => g.title === id)
  if (kind === 'account') source = (data.finances?.accounts || []).find((a) => `${a.institution}${a.last4 || ''}` === id)
  if (!source) return []

  const sourceTokens = new Set(tokenize([source.company, source.role, source.title, source.institution].filter(Boolean).join(' ')))
  if (!sourceTokens.size) return []

  const results = []

  if (kind !== 'goal') {
    for (const g of data.goals || []) {
      const hay = textOf(g)
      if ([...sourceTokens].some((t) => hay.includes(t))) {
        results.push({ kind: 'goal', id: g.title, label: g.title, sub: `${g.category} · ${g.status}` })
      }
    }
  }
  if (kind !== 'application') {
    for (const a of data.applications || []) {
      const hay = textOf(a)
      if ([...sourceTokens].some((t) => hay.includes(t))) {
        results.push({ kind: 'application', id: a.folder, label: `${a.company} — ${a.role}`, sub: a.status })
      }
    }
  }
  if (kind !== 'account') {
    for (const a of data.finances?.accounts || []) {
      const hay = textOfAccount(a)
      if ([...sourceTokens].some((t) => hay.includes(t))) {
        const id = `${a.institution}${a.last4 || ''}`
        results.push({ kind: 'account', id, label: a.institution, sub: (a.type || '').replace(/_/g, ' ') })
      }
    }
  }

  return results
}

module.exports = { findRelated }

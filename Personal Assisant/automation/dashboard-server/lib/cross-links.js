// Finds items in other modules that plausibly relate to a given item, by
// looking for the source item's own name/company/title inside other
// items' free-text fields (notes/status/role). Deliberately simple
// substring matching — there is no relational ID between profile/*.json
// and applications/*/status.json today, and building one is out of scope.

function tokenize(str) {
  return String(str || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 4) // skip short/common words
}

function textOf(item) {
  return [item.company, item.role, item.title, item.notes, item.status, item.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function findRelated(kind, id, data) {
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

  return results
}

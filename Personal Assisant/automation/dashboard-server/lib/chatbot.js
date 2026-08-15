// Rule-based Q&A over the same object getDashboardData() produces.
// No external API call, by design (see PRODUCT.md / the design spec) —
// every rule below answers strictly from the fields already on `data`.

const RULES = [
  {
    test: (q) => /how many.*(application|job).*staged|staged.*how many/.test(q),
    answer: (data) => {
      const n = data.counts?.staged ?? data.applications.filter((a) => a.status === 'staged').length
      return `You have ${n} application${n === 1 ? '' : 's'} staged for review.`
    },
  },
  {
    test: (q) => /interview/.test(q) && /(which|what|show)/.test(q),
    answer: (data) => {
      const at = data.applications.filter((a) => a.status === 'interview')
      if (!at.length) return 'Nothing is at interview stage right now.'
      return `At interview stage: ${at.map((a) => `${a.company} (${a.role})`).join(', ')}.`
    },
  },
  {
    test: (q) => /minimum payment|payment due|due soon/.test(q),
    answer: (data) => {
      const accounts = (data.finances?.accounts || []).filter((a) => a.latest_statement?.minimum_payment_due)
      if (!accounts.length) return "I don't have any minimum-payment due dates on file."
      return accounts
        .map((a) => `${a.institution}${a.last4 ? ` ···${a.last4}` : ''}: $${a.latest_statement.minimum_payment.toFixed(2)} due ${a.latest_statement.minimum_payment_due}`)
        .join('. ')
    },
  },
  {
    test: (q) => /recurring payment/.test(q),
    answer: (data) => {
      const rec = data.finances?.recurring_payments || []
      if (!rec.length) return 'No recurring payments on file.'
      return rec.map((r) => `${r.payee}: $${Number(r.amount).toFixed(2)} (${r.cadence})`).join('. ')
    },
  },
  {
    test: (q) => /how many.*(active )?goal/.test(q),
    answer: (data) => {
      const n = data.goals.filter((g) => g.status === 'active').length
      return `You have ${n} active goal${n === 1 ? '' : 's'} out of ${data.goals.length} total.`
    },
  },
]

function answerQuestion(question, data) {
  const q = String(question || '').trim().toLowerCase()
  for (const rule of RULES) {
    if (rule.test(q)) {
      return { answer: rule.answer(data), matched: true }
    }
  }
  return { answer: '', matched: false }
}

module.exports = { answerQuestion }

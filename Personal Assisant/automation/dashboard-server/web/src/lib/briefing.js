export function pickHeroCandidate(data) {
  const staged = data.applications.filter((a) => a.status === "staged").length
  const interview = data.counts?.interview || 0
  const attention = data.applications.filter((a) => a.status === "needs_manual_completion" || a.status === "unknown").length
  const activeGoals = data.goals.filter((g) => g.status === "active").length
  const cyOpen = data.cyntraix?._meta?.open_items?.length || 0
  const rsOpen = data.research?._meta?.open_items?.length || 0
  const cyClients = data.cyntraix ? data.cyntraix.clients.filter((c) => c.status === "active").length : 0

  const candidates = []
  if (interview) candidates.push({ priority: 100, line1: 'Interview', line2: 'on the board.', blurb: `${interview} application${interview === 1 ? ' has' : 's have'} moved to interview stage. Check job search for details.` })
  if (attention) candidates.push({ priority: 90, line1: `${attention} application${attention === 1 ? '' : 's'}`, line2: 'need manual completion.', blurb: 'Something in the apply flow couldn\'t be finished automatically — worth a look in job search.' })
  if (cyOpen) candidates.push({ priority: 80, line1: 'Cyntraix needs', line2: 'your input.', blurb: `${cyOpen} open item${cyOpen === 1 ? '' : 's'} on the business side — check the Cyntraix page for what's blocking.` })
  if (rsOpen) candidates.push({ priority: 70, line1: 'Research has', line2: 'open questions.', blurb: `${rsOpen} open item${rsOpen === 1 ? '' : 's'} in the doctoral research tracker waiting on a decision from you.` })
  if (staged) candidates.push({ priority: 50, line1: `${staged} application${staged === 1 ? '' : 's'}`, line2: 'ready to review.', blurb: `Tailored résumé${staged === 1 ? '' : 's'} and cover letter${staged === 1 ? '' : 's'} staged and waiting on your go-ahead before anything gets submitted.` })

  if (candidates.length) {
    candidates.sort((a, b) => b.priority - a.priority)
    const { line1, line2, blurb } = candidates[0]
    return { line1, line2, blurb }
  }
  return {
    line1: "You're", line2: 'all caught up.',
    blurb: `${activeGoals} active goal${activeGoals === 1 ? '' : 's'}, ${cyClients} active Cyntraix client${cyClients === 1 ? '' : 's'}, and nothing urgent across job search, research, or the inbox right now.`,
  }
}

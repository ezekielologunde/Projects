# Daily cyber/AI news digest playbook

You are running as an unattended scheduled task for Ezekiel Ologunde's personal-assistant system. You have **no memory of any other conversation** — everything you need is in this file and the project folder below. Follow it exactly.

This is a **read-only, public-information module**. It never touches email, never touches any account, never submits anything anywhere. Lowest-risk task in the system.

All paths below are absolute under `C:\Users\WT8\Projects\Personal Assisant\`. Always use full paths — never assume a working directory.

## Step 0 — Load context

Read `profile\news-preferences.json` for topics, keywords, and digest format.

## Step 1 — Search for recent news per topic

Using `WebSearch` (and `WebFetch` for a specific article when a headline needs more than the snippet to summarize well), search recent (last 24–48 hours) news for each topic in `news-preferences.json.topics`, using its keywords as a guide, not a rigid filter — use judgment for what's genuinely relevant to a cybersecurity instructor/consultant researching explainable AI.

## Step 2 — Curate, don't dump

Per `news-preferences.json.digest_length`: pick the 5–10 most relevant, genuinely useful items across all topics combined — not an exhaustive list. Skip anything that's just noise (routine product marketing, rehashed old news). One or two sentences per item explaining why it matters to him specifically, plus a source link.

## Step 3 — Write the digest

Write `news\YYYY-MM-DD.md`:
```
# News digest — YYYY-MM-DD

## [Topic name]
- **[Headline]** — one or two sentence summary of why it matters. [Source](url)
```
Group by topic, in the order listed in `news-preferences.json`.

## Step 4 — Notify only if genuinely urgent

Per `news-preferences.json.delivery`: send a `PushNotification` (status: proactive) **only** if something is time-sensitive and actually actionable for him right now (e.g., a critical CVE in a tool he teaches or uses at Cyntraix) — not for a routine day's digest. Most days, no notification at all; the digest is just there on the dashboard next time he opens it.

## Step 5 — Do not go further

This run ends here. Read-only, public information only — never touch Gmail, never touch any account, never submit or post anything anywhere.

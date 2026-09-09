# Focus Product Specification v1

**Status:** Frozen. This document answers what every screen and state does; it sits above `2026-09-08-focus-architecture-security-design.md`, which answers how that gets built and secured. Where the two ever appear to disagree, the architecture document is not wrong by default and the product document is not wrong by default — whichever one is stale gets corrected, and the correction is logged in both documents' revision histories. Neither document restates the other's detail: no SQL, RLS, or function signatures live here; no UI copy or screen flow lives there.

**Scope:** No new product decisions. Everything below is already decided, either in the architecture document's sections 1, 2, and 12.3, or in this round's consolidation. This document exists to freeze it in one place a designer or a test facilitator can read start to finish without touching a database concept, and to stop the pattern this project was sliding into: another round of "let's also define X" arriving before the last round's X has been tested with an actual person.

---

## 1. Locked core rules

Non-negotiable for every future feature. A feature that needs to violate one of these gets rejected, not the rule.

1. Capacity is 1, 2, or 3, chosen at onboarding, changeable any time. It is a maximum, not a target.
2. A person can activate **Focus Now** before reaching capacity, closing their remaining slot on their own terms without changing their capacity number.
3. At capacity, or with Focus Now on, a person is **Focused**: discovery disappears, their profile disappears from new discovery, they receive no new Likes, and every unresolved Like involving them — sent or received, seen or not — expires. Not paused. Expires.
4. Ending a connection, unmatching, blocking, either account being deleted, either account being suspended or banned, or a safety exit all release the freed slot immediately. Nobody waits on a ghost, an admin, or a timer to get their slot back — the 10-day automatic close (section 9) is a backstop for someone who never acts, never a requirement to wait before acting themselves.
5. Personal contact information is never shared automatically, by the product, in any direction. The account's own sign-in email or phone is never surfaced as a suggested contact method.
6. No hidden backup queue. Nothing a person liked or was liked by survives becoming Focused.
7. No compatibility percentage, score, or "soulmate" claim of any kind is ever shown to a user. Ranking is real and reciprocal; what a person sees is a plain sentence about what the two of them share.
8. No paid ranking, visibility, capacity, or filters. Ever, permanently — not a launch decision, a promise.
9. A must-have is never silently relaxed. Only the person who set it can loosen it, deliberately, on their own settings screen.
10. An empty discovery result — "You're caught up" — is a correct, acceptable outcome, not a failure state to paper over with a wider funnel.

## 2. States and events

Not four mutually exclusive buckets — two independent things plus a per-connection record, kept this simple on purpose:

**Account status** (what kind of account this is): `onboarding` -> `pending_review` -> `active`, with `paused`, `restricted`, `banned`, and `deleted` as the account-level exceptions. Only an `active` account has an attention state at all.

**Attention state** (computed continuously for an `active` account, never stored as its own field):

```
AVAILABLE := active, not paused, Focus Now is off, and active connections < capacity
FOCUSED    := active and not AVAILABLE
```

**Per-connection state** (zero to `capacity` of these exist at once, each independent): a connection is simply active or ended; how it ended is one of the exit routes in section 9, and ending is what changes the count that AVAILABLE's formula depends on.

Everything else is an event, not a status: match formed, connection ended, blocked, reported, account deleted, date happened, slot opened, Focus Now turned on, Focus Now turned off. Events move a person between states; they are never a state themselves, and none of them is displayed as a count, a badge, or a history a user browses.

## 3. The capacity engine, worked example

Capacity 3, starting from zero:

```
0/3  AVAILABLE
  -> Sarah connects
1/3  AVAILABLE
  -> Amara connects
2/3  AVAILABLE  -- the person now chooses:
       A. Keep discovery open, look for one more, or
       B. Focus Now
```

If B: `2/3 FOCUSED` — no discovery, no new Likes, profile hidden, even though one slot is numerically open. This is the whole point of Focus Now existing as separate from capacity.

If A, and Jessica connects: `3/3 FOCUSED` — automatically now, since capacity is reached. Every other pending Like, in both directions, expires the instant this happens (rule 3).

If Jessica's connection later ends: `2/3`, and Focus does **not** silently reopen discovery. It asks, plainly:

> You have space for another connection.
> **Stay focused on Sarah & Amara** · **Explore one new introduction**

Choosing to stay focused is a first-class, equally-weighted answer, not a dismissed default.

## 4. Discovery

No infinite swipe, no card stack. One profile at a time, up to 5 a day:

```
mutual must-haves -> currently available -> never previously connected or "don't show again"
  -> reciprocal ranking -> up to 5/day, one at a time -> Interested / Not for me
```

The single highest-ranked introduction of the day is labeled **Strong Introduction** and shown with a short, factual line naming what the two people share — "You both want marriage. Both want children. Faith practice aligns. 11 miles apart." — never a percentage, never a claim of compatibility beyond what that sentence itself says. One of the five is deliberately drawn from outside the top-ranked set so the feed can't quietly narrow itself around whoever was liked before.

## 5. Pool exhaustion

> You're caught up. You've seen everyone currently available who meets your must-haves.

Three explicit, person-initiated choices follow — wait, explore farther (distance only), or review soft preferences — and nothing here ever widens a must-have without the person doing it themselves, on their own settings screen.

## 6. The Connection screen

One layout, used identically for every active connection:

```
[Name]
Connected [n] days ago

[ Message ]

Relationship progress: [Talking / Planning a date / Date scheduled]

Share contact
Plan a date
Focus on this connection

···  End connection · Block · Report
```

Never shown here or anywhere else: a follower count, a match score, "last active" or any other presence indicator, or a history of past connections. Relationship progress is a plain word, not a meter.

## 7. Contact exchange

Reached from inside a connection. One method, one direction, one explicit action, every time:

```
Phone · WhatsApp · Signal · Email · Instagram · Other
```

> Once shared, Focus cannot remove information the other person saves outside the app.

The account's own sign-in email or phone number is never pre-filled or suggested here — a person types what they choose to share, every time (rule 5).

## 8. Date Mode

A connection's progress is a plain label a person can see, never a score: Talking -> Planning to meet -> Date scheduled. From "Date scheduled," two optional, separate actions:

- **Share date with someone you trust** — sends, through the person's own phone share sheet, their match's first name, verification status, the venue, the time, and the expected end time. Focus does not hold the trusted contact's information and does not monitor the date; it only offers one check-in prompt near the expected end time.
- **Post-date check-in**, private, seen by nobody else: *I'd see them again* / *I'm not sure* / *Not for me* / *Something made me uncomfortable* / *I felt unsafe*, with the last two leading straight into the safety flow (section 9), skipping ordinary breakup language entirely.

This is quiet, valuable signal for later ranking quality — whether an introduction actually led to a date, and whether that date went well — never shown to anyone as a score, and never used to infer anything about a person's answer beyond what they chose.

## 9. Exit routes

Every way a connection or an interaction can end, and what happens to the freed slot. Deliberately boring:

| Route | What the other person sees | Slot |
|---|---|---|
| **End Connection** (either side, any time, note optional) | "This connection has ended," plus the note if one was left | Frees immediately |
| **Ghosted** (they stopped replying) | Nothing new happens automatically until the 3-day nudge / 7-day prompt / 10-day close sequence; the *user* can End at any point before that with no wait required | Frees on End, or automatically at 10 days |
| **Block** (no note, no reason given) | The same generic "This connection has ended" — blocking is never distinguishable from an ordinary end on the receiving side | Frees immediately |
| **Report** (can accompany a block or stand alone) | Nothing different unless severity triggers automatic restriction (below) | Frees immediately regardless of review outcome |
| **Other account deleted** | "This person is no longer on Focus. Your connection has ended." | Frees immediately |
| **Other account suspended or banned** | Same neutral message as deletion | Frees immediately |
| **Bad date, not unsafe** | Ordinary End Connection | Frees immediately |
| **Unsafe date** | Block + Report together; the reported person may be automatically restricted pending human review | Frees immediately |
| **Immediate danger** | Emergency-services and trusted-contact links surface first, ahead of any of the above | N/A — safety, not app state |

The principle underneath all nine rows: **Focus limits options. It must never limit exits.**

## 10. Screen inventory

Thirty screens, matched one-to-one with the clickable prototype (`Dating App/docs/prototype/2026-09-09-focus-clickable-prototype.html`, also published at the artifact link shared with this document). Numbering matches the prototype's own jump menu.

| # | Screen | What it proves |
|---|---|---|
| 01 | Welcome | The premise, in one sentence, before any mechanic |
| 02 | Sign in | Email code, no password |
| 03 | Basic profile | Name, city, a prompt — not the full form |
| 04 | Relationship intent | Goal, non-negotiables entry point |
| 05 | Capacity selection | Rule 1 |
| 06 | Must-haves | Rule 9's setting exists and is legible |
| 07 | Heritage (optional) | Off by default, self-written |
| 08 | Health (optional) | Off by default, separate consent |
| 09 | Photos | Face required in slot one |
| 10 | Verification | Human review, not automated |
| 11 | Home / Available | What AVAILABLE actually looks like |
| 12 | Introduction | Section 4, one profile, two buttons |
| 13 | Full profile | Non-negotiables shown above photos |
| 14 | Interested | Silent — no confirmation the other side sees |
| 15 | Connection formed | Section 3's mutual moment |
| 16 | Connections | The Connection screen list |
| 17 | Focused | Rule 3, made visible |
| 18 | Open-slot state | Section 3's "stay focused / explore one" choice |
| 19 | Focus Now | Rule 2, as its own control |
| 20 | Chat | Ordinary, no presence indicators |
| 21 | Share contact | Section 7 |
| 22 | Plan a date | Section 8 |
| 23 | Share date (trusted contact) | Section 8, the optional safety nudge |
| 24 | Post-date check-in | Section 8, private |
| 25 | End connection | Section 9, row 1 |
| 26 | Block / report | Section 9, rows 3-4 |
| 27 | Safety flow | Section 9, immediate danger |
| 28 | You're caught up | Section 5 |
| 29 | Review preferences | Section 5's third choice, rule 9 respected |
| 30 | Settings | Capacity and Focus Now as separate controls |

### Suggested test scenarios

For whoever runs the comprehension test — hand the prototype to serious daters with no explanation, then give them these, one at a time, and watch what they do before saying anything:

1. "You chose capacity 1. Your connection stopped responding." — do they find End Connection without being told it exists?
2. "You chose capacity 3. You have two connections and like both." — do they understand Focus Now, or do they assume they're stuck choosing one?
3. "You've seen everybody nearby who fits." — does "You're caught up" read as normal, or as broken?
4. "The date felt unsafe." — how fast do they find Block/Report, unprompted?
5. "You want to give Sarah your number." — is contact sharing obvious, and do they understand it's one-sided?

If any of these needs a five-minute explanation first, that's a screen to fix, not a person to educate.

---

## Appendix: architecture items already patched

For traceability against this round's input, not because anything changed here — all confirmed already fixed in the architecture document (sections 0.1-0.2, 0.6) before this document was written: the private SQL helper schema, the explicit RPC allowlist, symmetric availability checks (spec'd for Phase 2, not yet built), read-time Focused exclusion (same), the `upload_tickets` ticket record replacing a raw object path, `processUpload(ticketId)`, the Turnstile-compatible CSP, append-only consent history, the single-copy closing-note fix, True Focus's pending-Like expiration, and Focus Now. Nothing in this list needed a new fix; each is cited in the architecture document's own revision history.

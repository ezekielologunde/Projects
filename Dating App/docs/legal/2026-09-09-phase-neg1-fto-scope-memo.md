# Phase −1 Freedom-to-Operate Review: Scope Memo

**Purpose:** brief a patent attorney on exactly what needs a freedom-to-operate (FTO) opinion before Phase 2 of Focus is built. This is not legal advice and was not prepared by a lawyer — it exists to save the attorney's first hour, not to replace their analysis. Every factual claim below was checked against a primary source before being written down; where something could not be independently confirmed, it's marked as open rather than asserted.

**Why this exists and what it gates:** `2026-09-08-focus-architecture-security-design.md`, this project's architecture and security specification, names a Phase −1 gate: no code implementing the capacity/matching mechanism (Phase 2) may be written until this review is complete. Phase 0 (project setup) and Phase 1 (profiles, auth, human verification) do not touch matching, visibility, or capacity logic at all and have already been built and reviewed independently of this gate. This memo covers only what Phase 2 would implement.

---

## 1. What Focus's mechanism actually does

Two things, computed continuously, never stored as a flag a human sets:

```
available(p) := profile is active, not paused, "Focus Now" is off,
                and active connections < capacity (1, 2, or 3, user-chosen)
focused(p)   := not available(p)
```

A `focused` person: (a) is removed from every other user's candidate pool, including on re-read of an already-generated daily list, so they cannot be freshly discovered by anyone; (b) cannot have a new outgoing "like" reach anyone, since sending one requires both parties to be `available` at that exact moment, re-checked immediately before the like is created; and (c) receives no new "like" from anyone else, for the same reason. Separately, the instant a user's *last* open slot fills — whether by reaching their chosen capacity or by manually toggling "Focus Now" off, wait, sorry: reaching capacity specifically — every other pending "like" already in flight involving that user, in both directions, is cleared (project name: **Starting Fresh**). This clearing is not the same event as declining a *new* request; it retroactively resolves *existing*, previously-transmitted pending likes that were sent before the limit was reached.

Full detail: `2026-09-08-focus-architecture-security-design.md`, sections 2.2 (product description) and 7.4-7.9 (`get_daily_feed`, `decide_feed_item`, `_send_like`, `_form_connection`, `next_waiting_like`, `respond_to_like`).

## 2. The patent family to review

All three verified against the full text on FreePatentsOnline and Google Patents on 2026-09-08; attorney should re-pull current file-wrapper status before relying on any of this, since status can change.

### 2a. US 11,895,115 B2, "Match limits for dating application"

- Assignee: Sidekick Dating Inc. Inventor: Michael Robert De Lazzari.
- Priority date May 16, 2022 (provisional 63/342,564). Filed May 3, 2023 (application 18/142,738). **Issued and active** as of the last check, February 6, 2024. 24 claims. Independent claims 1 (method), 9 (computer-readable medium), 17 (system) recite the same combination.

**Claim 1, verbatim:**

> A computer-implemented method for limiting matches between users in a networked environment, the method comprising, at a first network-connected hardware processing device: determining whether a first user has reached a limit of concurrent matches, wherein each match represents a bidirectional connection between the first user and another user; responsive to the first user not having reached the limit of concurrent matches representing bidirectional connections, making the first user visible to other users; responsive to the first user having reached the limit of concurrent matches representing bidirectional connections, making the first user invisible to other users; receiving input from the first user requesting that a unidirectional indication of interest in a second user be transmitted; responsive to the first user having reached the limit of concurrent matches representing bidirectional connections, declining the request to transmit the unidirectional indication of interest; and responsive to the first user not having reached the limit of concurrent matches representing bidirectional connections, transmitting the unidirectional indication of interest.

Dependent claims 2-8 and 18-24 add: establishing a match on reciprocal response, opening a communication channel on match, incrementing/decrementing a per-user counter, terminating the channel on unmatch, the steps running inside a dating application, marking a user available/unavailable, and displaying a "limit reached" message.

**Notable:** no claim — independent or dependent — recites a user-configurable limit, a settings/preferences option, or subscription tiers. Those appear only in the written description ("may vary from user to user, and/or may be configurable via a settings or preferences option," "may be determined based on the service tier the user is currently subscribed to or has purchased"), not in anything that was actually granted. This matters twice: it's a reason the granted claims may be narrower than they sound, and it's prior art against anyone — including this project — trying to separately patent a user-configurable 1/2/3 limit.

### 2b. US 2024/0275784 A1 (pending continuation)

Filed April 22, 2024, published August 15, 2024. **Status: pending, not yet granted** as of the last check — re-verify current status before relying on this. Same specification as 11,895,115, including the configurable-limit sentence. Because a continuation can pursue claims the original didn't, and the specification already discloses configurability, this application could plausibly attempt to claim the user-configurable-limit embodiment that 11,895,115's granted claims do not cover. Pull the current claim set from the file wrapper (USPTO Patent Center) rather than relying on the 2024 publication, since continuation claims can be amended.

### 2c. US 12,003,509 B2, "Temporary holds for dating application"

Granted June 4, 2024. Covers a "hold"/"maybe" designation on a profile for a limited period (commonly 24 hours), with a cap on concurrent holds (commonly three) raisable by subscription. Focus has no "hold" or "maybe" state of any kind — profiles are decided Interested/Not for me with no intermediate state — so this looks like the weakest overlap of the three, but should still be formally cleared rather than assumed clear.

### 2d. Open: is there a broader Sidekick/De Lazzari portfolio beyond these three?

A search for the inventor's name during this memo's preparation surfaced other patents and applications attributed to a "Michael Robert De Lazzari" — including titles like "System and method for matching using location information" and "Method and system for live dating" — that were **not** independently confirmed to share an assignee or applicant with Sidekick Dating Inc., and were not cross-checked against the two confirmed dating-app patents above. This could be the same inventor's other work, a namesake, or noise. **This needs a direct USPTO assignee/inventor search by counsel** (assignee "Sidekick Dating Inc.," inventor "Michael Robert De Lazzari," and any related entities), not the search-engine pass done here — treat it as an open lead, not a finding.

## 3. Claim-element mapping (for counsel's convenience, not a legal conclusion)

Each element of claim 1, and what Focus's spec currently does against it:

| Claim 1 element | What Focus's spec does |
|---|---|
| "determining whether a first user has reached a limit of concurrent matches ... bidirectional connection" | `available(p)` compares `active_connections(p)` to a user-chosen `capacity` (1, 2, or 3); a `connection` in Focus is exactly a bidirectional (mutual) relationship. |
| "responsive to ... not having reached the limit ... making the first user visible" | A user with `available(p) = true` appears in others' `get_daily_feed()` candidate pools. |
| "responsive to ... having reached the limit ... making the first user invisible" | A `focused` user (`available(p) = false`) is excluded from every candidate pool, including on re-read of an already-generated list. |
| "receiving input ... requesting that a unidirectional indication of interest ... be transmitted" | A "like," sent via `decide_feed_item()` or `respond_to_like()`. |
| "responsive to ... having reached the limit ... declining the request to transmit" | `decide_feed_item()` re-checks `available(caller)` before creating a like and returns `not_available` without writing one if the caller is at capacity. |
| "responsive to ... not having reached the limit ... transmitting" | Otherwise the like is created via `_send_like()`. |

**Two design points beyond claim 1's literal language, worth counsel's specific attention:**

1. Focus additionally clears *pre-existing*, already-transmitted pending likes the instant the limit is reached (Starting Fresh) — claim 1 only recites declining a *new* transmission request at the moment of the limit being reached, not retroactively withdrawing likes already sent before that moment. Whether this additional behavior is inside or outside the claim's scope, or relevant to it at all, is exactly the kind of question that belongs to counsel, not this memo.
2. Every check above is symmetric — Focus re-verifies *both* parties' availability at the moment a like is sent or a match forms, not only the sender's — which isn't distinguished in claim 1's language at all (the claim only discusses the "first user"'s own limit).

## 4. What a narrower design might look like, if needed

From the original competitor research (`Dating App/research/2026-09-08-match-cap-competitor-research.md`): "a design that keeps the user visible and queues incoming likes, or that transmits and queues outgoing likes rather than refusing them, would appear to fall outside claim 1" — citing Ida, a shipped competitor, as an example of such a design. Whether that reading is correct, and whether it's a design worth adopting if a real conflict is found, are both counsel's call. It's included here only so the attorney knows a fallback direction was already considered, not abandoned.

## 5. Scope of what's being asked

An FTO opinion covering:

- Whether Focus's `available`/`focused` visibility mechanism, as described in section 1 and mapped in section 3 above, is likely to infringe any granted claim of US 11,895,115 B2.
- Whether it's likely to infringe any claim that issues from the pending continuation US 2024/0275784 A1, based on the continuation's current claim set (not the 2024 publication).
- Whether it's likely to infringe US 12,003,509 B2.
- Resolution of the open question in section 2d (broader portfolio search).
- If any conflict is identified: whether a design change (section 4, or another counsel proposes) would avoid it, and at what confidence level.

Out of scope for this review: everything already built in Phase 0 and Phase 1 (auth, profile data, human verification, the upload pipeline) — none of it touches matching, visibility, or concurrent-connection limits, and none of it is gated by this review per the architecture spec's own Phase 14 delivery plan.

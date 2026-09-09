# Focus: Architecture and Security Design

**Codename:** focus (rename any time)
**Date:** 2026-09-08, revised 2026-09-09 (twice) after external review
**Status:** Draft for review. No code exists yet. This document is the gate before any code is written.
**Inputs:** `Dating App/research/2026-09-08-match-cap-competitor-research.md`, `Dating App/research/2026-09-08-intent-filters-diaspora-gaps.md`, and two rounds of full external review received 2026-09-09, both incorporated below after verifying every specific technical claim against current vendor documentation.

---

## 0. Revision history

### 0.1 First review (2026-09-09)

Sixteen findings, all incorporated: the available/focused mechanism was introduced to stop a hidden backlog of likes accumulating behind a focused user; the patent question was moved to gate the start of core-loop implementation rather than just launch; the upload design was redone around Vercel's real 4.5 MB function payload limit; the stack moved to Next.js 16; Supabase's cost was corrected to $25 a month; the app was designed around Supabase's publishable/secret key model; admin access was given a mandatory second factor; `seeking` was moved out of the publicly-selectable table; the public accountability score was removed in favor of an admin-only signal; inactivity attribution was fixed to ignore system messages; staging was added on ephemeral per-PR Supabase branches; migrations were split into expand and contract; genotype got its own separate consent; and the money framing was split into a permanent commitment and a v1 tactical decision.

### 0.2 Second review (2026-09-09)

Eight further findings, all incorporated, plus one product decision:

1. **Internal helper functions were still exposed.** Section 6.5's rule ("internal helpers prefixed `_` are not granted") was never actually applied to `available`, `mutually_compatible`, and `preference_score`, which were labeled "internal" in prose but defined without the prefix and therefore fell under the "every function in section 7 gets `GRANT EXECUTE TO authenticated`" default. Confirmed against Supabase's own documentation: functions are executable by any role by default, with no exemption for naming conventions. **Fixed by moving every non-client-facing function into a dedicated `private` schema that is never added to the project's exposed-schema list**, so it is unreachable through the Data API regardless of grants, rather than relying on a naming convention that had already been violated once. See section 6.5.
2. **A caller could still send a new like after becoming focused, through a race.** `decide_feed_item`, `_send_like`, and `respond_to_like` checked the target's availability but not the caller's. Fixed by making every availability check symmetric: both sides are checked at every step, with `_form_connection`'s row lock as the final authority. See sections 7.5, 7.6, 7.9.
3. **A focused person could still appear in a feed that was generated before they became focused.** The read path for an already-generated daily feed had no availability check, only feed generation did, which contradicted the stated promise that a focused person never appears in anyone's feed. Fixed by checking availability at read time too, with backfill up to the daily ceiling when a card goes stale. See sections 6.2 and 7.4.
4. **Supabase's signed upload URL cannot carry a 5-minute expiry.** Confirmed against Supabase's documentation: `createSignedUploadUrl` has no `expiresIn` parameter and is fixed at 2 hours. Fixed with an application-level `upload_tickets` table that expires in 5 minutes independently of the underlying Supabase URL's own 2-hour window. See section 5.2 and 7.16.
5. **The upload-processing route accepted an arbitrary storage path from the client.** Fixed by having the client pass only a ticket id; the server resolves the path, owner, kind, and (for selfies) the linked verification attempt from the ticket row itself. See section 7.17.
6. **The CSP would likely block Turnstile.** Confirmed against Cloudflare's documentation: Turnstile requires the literal `challenges.cloudflare.com` origin in `script-src`, not just a nonce, alongside the nonce propagated onto Turnstile's own script tag. Fixed in section 9.3.
7. **Consent could not actually be re-recorded when a policy version changed**, because the original table's primary key `(profile_id, kind)` would collide on a second acceptance. Fixed by making consent an append-only event log. See section 5.2 and 7.18.
8. **Closing notes were retained twice with contradictory lifetimes**, once forever on `connections.end_note` and once for 30 days in the message stream. Fixed by removing the column; the message stream is now the only copy and follows the same 30-day post-end purge as every other message.

**Product decision: pending likes are now cleared, not just paused, the moment a user's last open slot fills.** The first review's fix (available/focused) stopped new likes from reaching a focused person. It left pre-existing likes waiting, which meant a person who formed a connection while several others had already liked them would, weeks later, resurface those old admirers one by one when the connection ended. That is a smaller version of the same problem: not a growing backlog, but a preserved one. This revision clears every other pending like, both directions, the instant a user transitions from available to focused, so that becoming available again is a genuine clean slate rather than a queue with a pause button. This is deliberately more expensive to the product's own match count, which is the point: it trades network efficiency for the "dating without backup options" premise the whole concept rests on. **Because this changes the exact capacity mechanism, it is explicitly added to the Phase −1 legal scope alongside the available/focused design itself**, not treated as a safe follow-on change.

### 0.3 Safety and exit design (2026-09-09)

A third input, verified against Hinge, Tinder, Bumble, and RAINN's current documentation, surfaced a gap the first two reviews didn't touch: the architecture had never worked out what happens when a connection goes wrong, silently, badly, or dangerously, and `paused` had existed as an enum value since the first draft without ever being given behavior. The fix adds a new stated principle and a fuller model for leaving:

1. **New principle: focus limits options, it must never limit exits.** Added to section 1 alongside "the database is the referee." Ending a connection, blocking, and reporting are always available immediately, with no waiting period and no requirement to explain.
2. **Ending a connection now has three distinct paths with different guarantees**, not one: a normal End (note now optional, not required, since forcing an explanation can manufacture confrontation rather than prevent it), Block (unchanged from the prior draft: no note, no explanation, permanent, mutual invisibility), and Report (now severity-tiered). See the new section 2.4.
3. **Reports now carry a severity**, derived from the reason and overridable by an admin, confirmed against how Hinge, Tinder, and Bumble actually triage safety reports versus ordinary complaints. A `high` or `critical` report automatically and immediately restricts the reported person's account, pausing their ability to send new messages anywhere on the platform, pending human review, rather than waiting in the same queue as a report about a bad first impression.
4. **Reporting a genuine safety incident is no longer bound by the same 30-day visibility window as an ordinary report**, matching Hinge's ability to report a past match about an offline incident. This is stated honestly alongside its real limit: if the connection's messages were already purged before the report was filed, that evidence cannot be recovered.
5. **`paused` is now a defined, self-service state**, distinct from being banned or deleting the account: it removes a person from all future matching immediately, using the same status check that already gates matching, but does not forcibly end an existing connection. The other person in that connection is told plainly and given an immediate, one-tap way to end it themselves, rather than being left to wonder or to wait out the normal inactivity timer.
6. **Automatic inactivity handling is shortened** from a 14-day nudge and a 3-day grace period (17 days total) to a 3-day nudge, a 7-day explicit prompt with a one-tap end option, and a 10-day automatic close, since the original window was not a floor on when someone could leave (manual ending was always available) but its length worked against the product's own premise of a single, present connection.
7. **A private post-meeting check-in and an optional, deliberately minimal date-safety feature are added**, scoped narrowly per the recommendation not to build anything resembling an emergency-dispatch system: Focus generates a plan a person shares through their own phone's share sheet, exactly as Bumble's Share Date does, rather than Focus storing or sending a third party's contact information itself. See sections 2.5 and 2.6.

### 0.4 Ranking philosophy and pool exhaustion (2026-09-09)

A fourth input, cross-checked against Tinder's, Bumble's, and Hinge's own published matching and Discover documentation, addressed something the first three left alone entirely: what actually decides which 5 people appear, and what Focus says when there is honestly no one left. Five changes follow from it:

1. **Matching is now explicitly reciprocal, not one-directional.** The original `preference_score` only scored the viewer's own heritage preferences against a candidate. It never asked whether the candidate would also want to see the viewer. Section 7.3 is rewritten around a symmetric score that credits both sides' soft preferences about each other, confirmed against the academic distinction between an ordinary recommender and a reciprocal one, where both parties' interest has to be modeled, not just one.
2. **A fixed non-goal is replaced with a more precise one.** "No AI matchmaking" is replaced with a specific commitment: no opaque model decides compatibility in v1; ranking is built from explicit mutual preferences, distance, activity, and reciprocal scoring, all of it inspectable; a learned ranking model is something to consider later, only with real outcome data, never allowed to touch a hard dealbreaker or infer a sensitive attribute. See section 1.
3. **Discovery stops pretending the pool is infinite.** When every mutually eligible, currently available person has already been shown, Focus says so plainly and offers to expand the search radius, review which soft preferences are narrowing things, or simply wait, rather than quietly re-serving people already passed on. See the new section 2.7.
4. **"Not for me" and "Don't show again" are now two different actions**, alongside the existing Block from section 2.4: an ordinary pass that can, much later and only through an explicit reconsideration prompt, resurface if the person's profile has materially changed, versus a permanent exclusion for someone the user already knows and never wants to see suggested at all, such as an ex or a coworker. See section 2.7.
5. **No compatibility percentage is ever shown.** The internal score exists only to order candidates. What a person sees is a short, factual explanation of what the two of them actually share, and one of the five daily introductions is named as the strongest, not as a prophecy but as a plain statement of why it ranked first.

### 0.5 Capacity as a ceiling, permanent unmatching, and deliberate contact sharing (2026-09-09)

A fifth input, confirmed against Tinder's, Hinge's, Bumble's, and RAINN's current documentation on unmatching, past-match reporting, in-app calling, and contact-safety guidance, sharpened three things at capacity 2 and 3 specifically, where more than one active connection makes "ceiling" and "target" easy to conflate:

1. **Two people who have ever connected, however it ended, are never recommended to each other again in v1.** This turns out to already be true in this design and simply hadn't been stated plainly: `get_daily_feed`'s candidate query (section 7.4) excludes anyone with any row at all in `connections`, not only an active one, and connection rows are never deleted (section 5.2), so an ended pair is permanently excluded by the same mechanism that was already there. No new table was needed; the gap was in the prose, not the schema. Section 2.4 now says this explicitly, matching how Hinge and Tinder both treat unmatching as permanent rather than something to revisit later.
2. **Capacity is a ceiling, not a quota.** A person with capacity 3 and two active connections has one open slot by the numbers, but may not want a third right now, and forcing them to either take it or lower their capacity setting entirely was a false choice. A new, separate toggle, "Open to new connections," lets a person close that remaining slot on their own terms without touching their capacity number, and reopen it just as easily. See the revised section 2.2 and section 7.1.
3. **Contact information is shared only deliberately, one method at a time, and never mutually by default.** Sharing a phone number is not something Focus does automatically once two people seem to be getting along; it is an explicit action, confirmed against RAINN's guidance to withhold personal contact details until real trust exists and Hinge's warning that scammers push people off-platform quickly. Sharing from one side never reveals the other side's information in return. See the new section 2.8.

Everything else from all five inputs was confirmed sound and is carried forward unchanged: the database-as-referee principle, likes being unselectable by users, deterministic-lock concurrency handling, the negative-authorization test list, and Realtime over Postgres Changes for chat.

---

## 1. Purpose, goals, non-goals

### What this is

A dating web app where each person chooses how many people they can genuinely get to know at once (1, 2, or 3), sees a handful of pre-screened profiles a day, and stops appearing to anyone new the moment they have no open slot left. It exists to remove the illusion of options that makes people reject everyone and commit to no one. The category is intentional dating; the mechanism is that attention is finite and the product makes you choose where yours goes.

### Goals, in priority order

1. **Attention, not volume.** Every mechanic reduces parallel options: the capacity limit, the daily browse cap, full removal from discovery while focused, clearing other pending likes the moment capacity fills, no like counts, no feed.
2. **Serious people first.** Non-negotiables (kids, faith and practice level, politics, habits) are free, set at onboarding, shown above photos, and enforced mutually before anyone appears in anyone's feed.
3. **Heritage on the user's terms.** Self-written background, community or tribe, origin, language, and raised-in fields. Heritage affects matching only when the user switches it on in settings, and then each rule carries an importance the user chose: nice to have, important, or must. The system never infers, ranks, or optimises on heritage by itself.
4. **Nothing to collect.** No validation loop: no like counter, no "who liked you," no posting, no social handles, no visible reputation score of any kind, and no backlog of old admirers waiting behind a closed door.
5. **Safety and privacy as design constraints.** Every rule above is enforced in the database, not the browser. Sensitive attributes (faith, ethnicity, genotype, who you want to meet, location) are minimised, access-controlled through functions rather than raw table access, and deletable. Every function that is not meant to be called directly by a client lives where a client cannot reach it, not merely where it is labeled as such.
6. **Accountability, held internally.** Connections can end with an optional closing note. How people end connections is tracked to catch abuse and repeat ghosting; it is not displayed as a score, because a displayed score creates pressure to keep talking to someone rather than end things honestly.
7. **Focus limits options. It must never limit exits.** Capacity limits who you can start something new with. It must never make it harder to leave something that isn't working, isn't safe, or has simply run its course. Ending a connection, blocking, and reporting are always available immediately, with no note required, no timer to wait out, and no reputation cost. Where this document's mechanisms ever seem to conflict with that sentence, this sentence wins.
8. **Explain, don't score.** Every candidate is ordered by an internal reciprocal score that a person never sees. What they see instead is a short, factual account of what the two of them share, never a percentage, never a claim that an algorithm has found their soulmate. A number that precise about something this uncertain is a lie dressed as precision.
9. **Contact information is shared only deliberately, one method at a time, and never mutually by default.** Focus never reveals a signup email, a real name beyond what a person chose to show, or any way to reach someone outside the app, unless that person explicitly chose to share it, in that moment, with that specific person. Sharing never happens automatically, is never a side effect of matching or messaging, and one person sharing never grants the other's information in return.

### A permanent commitment versus a v1 decision

These are different promises and the document keeps them distinct:

- **Permanent:** money will never change who you are eligible to meet, how visible you are, your capacity choice, or which filters you can use. There is no version of this product with a paid tier that sees more people, gets more slots, or gets better placement.
- **v1 decision, not permanent:** there are no subscriptions, boosts, or fees of any kind at launch. If human selfie review or infrastructure costs become unsustainable at scale, the only monetisation compatible with the mission is a single flat fee that changes nothing about matching, visibility, or capacity for anyone who pays it. That decision is deferred; see section 15.

### Non-goals for v1

- Differential access of any kind tied to payment (see above; this is permanent, not just v1).
- A friends or community lane, events, or a social feed.
- **No opaque AI deciding compatibility in v1.** Recommendations are built from explicit mutual preferences, distance, activity, and a reciprocal ranking score (section 7.3), all of it inspectable and none of it hidden inside a trained model. A learned ranking model is a possibility for later, and only once there is enough real outcome data (whether people who connected actually met, and wanted to again) to train it on, never before, and never in a way that overrides a hard dealbreaker or infers a sensitive attribute a user didn't state.
- AI conversation help, or personality tests.
- Video calls, voice notes, or photo messaging inside chat.
- Native iOS or Android apps.
- Automated selfie verification. A human reviews every selfie.
- Income, job, or education verification.
- A visible reputation, accountability, or "communicates respectfully" score of any kind.

### Success measures (written before launch, none are engagement)

- Share of connections that reach a first date (self-reported in the closing note or a post-connection prompt in a later version).
- Share of connections ended with a note rather than faded.
- Pairs who close their accounts together.
- Zero unauthorised reads of another user's likes, messages, photos, or sensitive fields (verified by tests, not hoped for).
- Zero cases in testing where a client can reach a function through the Data API that this document designates internal.

The daily browse cap of 5 and the 1/2/3 capacity ceiling are both starting hypotheses, chosen from the research rather than revealed truth. Both should be revisited against the funnel (profile shown → connection → real conversation → date → second date), never against time-on-app or session count.

---

## 2. Product summary

This section restates the product design so the architecture can be checked against it.

### 2.1 Onboarding

1. Sign in with a 6-digit email code or Google. No passwords exist anywhere in the system.
2. Age gate: date of birth, 18 and over. Under-18 attempts are refused and the attempt is logged without the date.
3. Consent, recorded as append-only events (section 5.2), each versioned and each separately explicit: terms, privacy policy, sensitive data (faith, heritage, seeking, politics), and, only if the user opens that section, genotype data (see section 8.1).
4. Profile: first name, gender, who you want to meet, city, two to six photos with a face in the first, three prompt answers, occupation, education level, optional height.
5. Capacity: 1 (default), 2, or 3.
6. Non-negotiables, then optional heritage (off by default in matching, see section 2.3), then optional health section (genotype, off by default, its own consent).
7. Selfie with a randomly assigned pose. Human review. Profile is `pending_review` until approved, then `active`.

### 2.2 Daily loop, and the Available/Focused mechanism

Every profile has a computed attention state, not a stored one:

```
available(p) := profiles.status = 'active'
             AND paused_at IS NULL
             AND focus_now = false
             AND active_connections(p) < capacity(p)
focused(p)   := not available(p)
```

Capacity is a ceiling, not a quota: choosing 3 means "at most three people at once," never "the product expects three." A person with capacity 3 and two active connections has room for a third by the numbers, but may genuinely not want one yet, and shouldn't have to lower their capacity setting just to say so. `focus_now` is a separate, self-service toggle for exactly this: turning it on closes the remaining slot immediately, on the person's own terms, without changing their capacity number, and turning it off reopens it just as immediately. While it's on, a person with open slots by the numbers is still `focused` in every sense that matters: no discovery for them, and they don't appear as a candidate to anyone else either. Home simply says "You have room for one more connection whenever you're ready," with the choice to look or not left entirely to the person, rather than a gallery of introductions appearing the moment a slot opens.

- **Discovery** shows up to 5 profiles a day, one full profile at a time, not a stack of cards to flick through: photo, non-negotiables, prompts, and a short, factual explanation of what the two people actually share, with two plain buttons, Interested and Not for me, not a swipe gesture. A swipe can exist later as an optional shortcut, but the visual language deliberately avoids anything that reads as a card game, because the research behind this product is specifically about what repeated quick judgment does to people's willingness to accept anyone at all. There is no going back once decided. Candidates are restricted to people who are currently `available`, checked both when a day's feed is first generated and again every time that feed is read back, so a person who becomes focused after being shown that morning is removed from the feed the next time it loads and, where possible, replaced so the day's allotment stays at 5. **A focused person never appears in anyone's discovery feed.**
- **Ranking is reciprocal, and the strongest introduction is named.** Candidates who pass every hard non-negotiable (section 7.2) are ordered by a score that credits both sides' soft preferences about each other, not just the viewer's (section 7.3), so a good match doesn't get buried because it happens to be more appealing to Focus's model than to the general population. The single highest-scoring candidate each day is shown first and labeled Focus Pick, with the other four introduced simply as today's introductions; no percentage is ever shown, only a short line naming what the two of them share ("You're both looking for marriage. Both want children. 8 miles apart."), because a number that precise about something this uncertain would be a false promise, not information. One of the five is deliberately chosen from outside the top-ranked set rather than by score alone, so the feed doesn't quietly narrow itself into an ever-smaller caricature of whoever a person has liked before.
- **"Not for me" and "Don't show again" are different.** Passing on a profile ("Not for me") is an ordinary, reversible-in-principle decision: Focus doesn't recycle it, but if that person's profile changes substantially and a long time has passed, it may be offered again later, only through the explicit reconsideration prompt in section 2.7, never by quietly reappearing in the ordinary five. "Don't show again," reached through a small menu rather than a prominent button, is permanent and immediate, for someone the user already knows, like an ex or a coworker, and never resurfaces under any condition. Neither of these is Block, which is a safety action covered in section 2.4 and ends an existing connection; "Don't show again" can be used on someone who was never a match at all.
- **Waiting list.** When you have an open slot, people who liked you while they, and you, were both still available are shown one at a time before new discovery. Only likes from senders who are currently `available` are ever surfaced. You Like or Pass each surfaced item. There is no count and no list view.
- **Likes and forming a connection.** A like is silent. The other person never sees a count and there is no "who liked you" screen. Sending a like requires both the sender and the recipient to be available at that exact moment, re-checked immediately before the like is created or a connection forms, closing the race where a person becomes focused between being shown a card and acting on it. Likes that go unanswered expire after 30 days.
- **When your last open slot fills, you enter Focused and every other pending like involving you, in either direction, is cleared.** Not merely paused: cleared. Anyone who had liked you and was still waiting, and anyone you had liked and were still waiting on, is let go. This is deliberate. When you become available again, you start from nothing: no old admirers resurface, no old interests linger. The cost is fewer eventual matches; the point is that focus means focus, not a queue with the lid on.
- **When you're Focused,** discovery disappears for you too. No blur, no upsell, no queue count. Your home screen is your connection or connections. Your profile is not shown to anyone new, and nobody can send you a new like.
- **A connection** is a private text chat plus each other's full profile. It ends when either person chooses to end it, and frees both slots immediately the instant each person's own count drops below their own capacity. How a connection can end, and what happens automatically when nobody acts, is covered in full in sections 2.4 and 2.5, because it turned out to need more than one sentence: capacity limits who you can meet, and it must never make it harder to leave.

**Why this design differs from a profile that stays universally visible:** an earlier draft kept a focused user's profile visible to everyone and only hid the discovery feed on the viewing side, partly as a way to keep some daylight from the Sidekick patent's specific claim language, which requires making the at-limit user invisible and declining their outgoing likes. This revision instead removes focused users from candidate generation, and now clears their pending likes outright, because those are the correct product fixes for the backlog problem regardless of the patent. Whether this mechanism sits closer to or further from the patent's claims is exactly the kind of question that belongs to counsel, not to this document. See section 14, Phase −1: the entire visibility and clearing mechanism in this section is provisional pending that review, and the review must happen before section 7's functions are implemented.

**Nothing to collect.** No like counts, no feed, no posting, no social handles, no visible score of any kind, no waiting queue that survives a focused period. Bios containing an Instagram handle or "add me on" are flagged for admin review.

### 2.3 Profile and non-negotiables

**Basics.** First name, age from date of birth, gender (woman, man, nonbinary, or self-described), who you want to meet (women, men, everyone), city with approximate distance, two to six photos with a face in the first, three short prompt answers instead of a free bio, occupation, education level, height optional.

**Non-negotiables**, each with your own answer and, where marked, a "must match" switch that hides anyone outside your acceptable answers:

| Field | Your answers | Must-match allowed |
|---|---|---|
| Relationship goal | Marriage, life partner, serious relationship | No, all three are serious. Casual is not offered. |
| Kids | Want, don't want, open, have kids and want more, have kids and done | Yes |
| Faith | Self-written label plus practice level: devout, practicing, cultural, not practicing | Yes, on label and on practice level |
| Politics | Liberal, moderate, conservative, other, prefer not to say | Yes |
| Smoking, drinking | Never, sometimes, regularly | Yes |
| Timeline | Ready now, within a year, exploring slowly | Display only |
| Would relocate | Yes, no, maybe | Display only |
| Income band | Optional, five bands | Display only, no filter |

**Heritage**, all optional, all self-written with suggestions as you type, so a Haitian, a Yoruba, and a Gujarati use the same fields: background, community or tribe, family origin country and region, island, or state, languages spoken, country raised in. A master switch, "Use heritage in who I'm shown," is off by default. When on, each heritage field carries an importance the user chose: nice to have, important, or must, with the acceptable values typed by the user. Nice to have and important never filter, only reorder; must filters. A separate switch, "Show heritage on my profile," independently controls whether others see the user's heritage values at all. The system never infers, ranks, or optimises on heritage on its own.

**Genotype** lives in a collapsed "health compatibility" section, off by default, with its own separate consent (see section 8.1), a plain-language note on why AS and AS matters, and a must switch. It is never suggested or gated based on a user's heritage answers; the user opens it or does not.

**Verification.** Selfie with a randomly assigned pose, reviewed by a human. Optional work or school email verification comes later, not in v1.

### 2.4 Ending a connection: End, Block, and Report

These are three different actions with three different guarantees, confirmed against how Hinge, Tinder, and Bumble draw this same line. Conflating them, which the first two drafts of this document effectively did by routing everything through one `end_connection` function, would have meant a person fleeing harassment goes through the same "pick a reason, write a note" flow as someone who just didn't feel a spark.

**End Connection.** For no chemistry, differing goals, a change of mind, or a date that was simply bad but not unsafe. Either person can end at any moment, with no waiting period. A short closing note is offered, never required: "Would you like to leave a short closing note?" with preset options (not a romantic fit, no chemistry after meeting, our goals don't align, taking a break, something else) or free text up to 300 characters, or nothing at all. If nothing is given, the other person sees a plain "This connection has ended." Both slots free immediately. This is the ordinary, expected outcome of giving one person real attention and it not working out, and the product should never make it feel like a failure. **Once two people have connected and that connection ends, however it ends, they are never shown to each other again**, matching how both Hinge and Tinder treat unmatching as permanent rather than something to revisit. There is no reconnect or rematch feature in v1.

**Block.** For "I do not want this person to contact or encounter me again," whether or not anything unsafe happened. No note, no explanation, no reason given to either the blocked person or stored against them beyond the block itself. The connection ends, messages stop, both profiles become mutually invisible everywhere (feed, waiting list, search), any likes between them are gone, and the slot frees. The blocked person is shown the same generic "This connection has ended" and has no way to learn a block occurred, matching how Tinder and Bumble both keep blocking indistinguishable from an ordinary unmatch on the receiving end.

**Report.** For behavior that Focus, not just the reporting user, needs to know about: rudeness, harassment, threats, stalking, assault, or anything that felt unsafe. A report can be filed alongside a block (most safety reports should be) or on its own, and does not require an active connection: a past connection, however it ended, can still be reported, and for genuine safety concerns this is not bound by how long ago it happened. Reports carry a severity, described fully in section 5.1 and 7.13, and the more serious tiers trigger an automatic, immediate restriction on the reported person's account while a human reviews it. Filing a report is never shown to the reporter as a verdict: Focus is not a court, and the interface never claims to have confirmed or denied what was reported. It only confirms that a human will look at it.

### 2.5 Pausing, deleting, and being restricted

Three different things can make a person stop being available, and they behave differently on purpose:

- **Pausing** is voluntary and short-term: a settings toggle a person flips themselves. A paused person disappears from everyone's discovery and waiting list immediately, the same way a focused person does, and cannot be matched with. It does not end an existing active connection, because someone stepping away for a few days might still want to say so to the one person they're actually talking to. But the other person in that connection is never left to wonder or to wait: their side of the chat shows "This person has paused their account" plainly, with an immediate, one-tap End Connection action right there, not gated behind the normal inactivity timeline in section 2.4. An existing connection never traps the other person just because one side stepped back.
- **Deleting the account** ends every active connection immediately, exactly as before, with the other person seeing a neutral "This person is no longer on Focus. Your connection has ended," never a timestamp or any detail that turns account deletion into forensic relationship analysis.
- **Being restricted** is not something a person does to themselves: it is the automatic, immediate consequence of a high or critical severity report landing against their account (section 2.4, section 7.13), pending human review. A restricted person keeps their existing connections intact at the connection-status level, so a partner unrelated to the report isn't confused by a sudden termination, but cannot send new messages anywhere on the platform, cannot appear in anyone's discovery, and cannot form new connections until an admin clears or confirms the report. Every partner affected sees a generic "This connection is under safety review and messaging is paused for now," with the same immediate End Connection or Block available to them regardless. Restriction never confirms what was reported; it is a precaution, not a verdict, and an admin resolves it one way or the other, never leaves it standing indefinitely.

### 2.6 Meeting up: a private check-in, and a deliberately small date-safety feature

Focus has no way to know when two people actually meet in person, and it should not try to find out through location tracking: that would contradict the privacy stance in section 8.2. Instead, either person can mark "We met" inside their connection at any time they choose, entirely privately; the other person is never told that this was tapped. Marking it opens a short, private check-in, seen by nobody else: would you like to see them again (yes, not sure, no), and how did it feel, with a clearly separate "I felt unsafe" option that skips straight past ordinary breakup language to Block, Report, and a plain link to local emergency services and to sharing with a trusted contact. Answering "no" here is just a fast path into the ordinary End Connection flow from section 2.4; the other person never learns "they said no to another date," only that the connection ended, exactly as any other end would look to them.

For the date itself, Focus offers a narrow, deliberately unambitious safety feature modeled on Bumble's Share Date rather than Tinder's Noonlight, because building a real emergency-monitoring service is a liability, an operational burden, and a promise of rescue this product has no business making. Inside an active connection, either person can fill in a plan (where, when, and an expected end time) and get back a short, shareable summary naming their match by first name and verification status, which they send themselves, through their own phone's own share sheet, to whomever they choose, exactly as they could already do by texting a friend, just formatted cleanly. Focus never sends this itself and never stores the friend's phone number or email; it only holds the plan's details briefly, for the duration of the date, so it can offer one check-in prompt near the expected end time asking simply "everything okay," with "I need help" leading to the same safety-first screen as "I felt unsafe" above. This is a nudge toward a habit RAINN already recommends, not a monitoring system, and the copy says so plainly rather than implying a promise the product cannot keep.

### 2.7 When the pool runs out

In a smaller city, a narrow age band, or a specific faith or diaspora preference, a person will eventually see everyone who is currently mutually eligible and available. This is not an edge case to paper over with a wider funnel that quietly reintroduces people already rejected; it is a state the product should name honestly, confirmed against how differently Tinder and Bumble handle it today by expanding distance and preferences automatically unless a person opts out.

When there is nobody left to show, Focus says plainly: "You're caught up. You've seen everyone currently available who meets your must-haves. New people will appear here as they join or become available." Three explicit choices follow, none of them automatic:

- **Keep my preferences and wait.** Do nothing; be told when someone genuinely new becomes eligible.
- **Explore a little farther.** Widen the distance radius, only with the person's own explicit action, never silently.
- **Review my preferences.** See which soft, non-must heritage or lifestyle preferences are narrowing the pool the most, and loosen them if desired. A must-have is never weakened without the person doing it themselves, deliberately, on this screen.

Only from this caught-up state, never mixed into the ordinary daily five, Focus may also offer a small number of previously passed profiles for reconsideration, and only when a real reason exists: the passed person's profile has materially changed since the pass (a new photo, a changed prompt, or an updated non-negotiable answer), at least 90 days have passed, and the two are still mutually compatible under current preferences. This is framed as "8 people you passed months ago have updated their profiles. Review them, or keep your passes as they are," and the person decides; nothing reappears on its own. A profile marked "Don't show again" is never included in this, regardless of time or changes.

Optionally, after a handful of profiles in a session, Focus may ask a single lightweight, fully optional question: "Anything missing from today's people?" with a short checklist (attraction wasn't there, lifestyle wasn't right, felt too different, felt too similar, distance, values, nothing specific). This exists to give Focus qualitative signal about what a v1, non-learning ranking system might be missing, not to interrogate a person about why they rejected someone; there is no "why didn't you like this specific person" prompt, ever.

### 2.8 Sharing contact information, deliberately

Focus never reveals a signup email, real name beyond what a person chose to display, or any way to reach someone outside the app automatically. The only path is Share Contact, reached from inside an active connection: a person picks exactly one method (phone, email, WhatsApp, Signal, Instagram, or other), types the value, and sees a plain warning before it sends: "This will be shared with [name]. If you later end or block this connection, Focus cannot remove information they've already saved outside the app." Sharing is never mutual by default: one person sharing their phone number does not reveal the other's, who makes their own separate choice, if any. This mirrors RAINN's guidance to withhold personal contact details until real trust has been established, and Hinge's own warning that people trying to move a conversation off-platform quickly are a known scam pattern, which cuts the other way if Focus itself did the revealing automatically.

The distinction that matters is between the public profile and a private, already-active connection: an Instagram handle is never permitted on a public profile, in a prompt, or anywhere a stranger in discovery could see it, because that is exactly the follower-farming and validation-seeking behavior "nothing to collect" (section 1) exists to design out. Inside a connection two people already chose to have, sharing an Instagram handle, or anything else, is their own decision to make, deliberately, one field at a time.

Focus does not attempt to detect or block a phone number, handle, or messaging app name typed casually into an ordinary chat message between two connected adults; that would be paternalism dressed as safety, and these are consenting adults who are free to move their conversation wherever they like. Where such a pattern is detected in a message, the only effect is a one-time, dismissible line shown to the sender before it goes: "Keep your personal information private until you're comfortable sharing it. Once it's out there, Focus can't control how it's used." followed by Send anyway, never a block. The same detection continues to apply, unchanged, to public-facing profile prompts, where the concern is different: a stranger farming followers from a dating profile, not two people who have already chosen each other.

Sharing a contact method, and reaching some of the other milestones in an active connection (a real conversation, a date plan created, marking "we met," wanting to meet again), together form an internal sense of how a connection is progressing. This is never shown to users as a level, a badge, or a score, matching section 1's "explain, don't score" principle; it exists only so Focus, in aggregate and never per-person in a way anyone can see, can tell whether the product is actually helping people move toward meeting rather than just accumulating messages.

---

## 3. Threat model

### 3.1 Assets, most sensitive first

1. **Sensitive attributes**: seeking (reveals orientation), faith and practice level, heritage fields, genotype, politics, coarse location.
2. **Private interactions**: likes (who liked whom), messages, closing notes, reports, blocks.
3. **Photos** including verification selfies, and the raw originals during the brief upload-processing window.
4. **Identity**: email, date of birth, Google account link.
5. **Integrity of the mechanic**: capacity limit, browse cap, mutual pre-screen, the available/focused candidate filter, the clear-on-focus rule. If these can be bypassed the product is a worse Tinder.
6. **Admin capability**: approve, ban, read reports.
7. **Availability** of the service and of the data (backups).
8. **The boundary between client-reachable and internal functions.** A function this document calls internal must actually be unreachable, not merely undocumented for clients.

### 3.2 Actors

| Actor | Motive | Capability |
|---|---|---|
| Anonymous attacker | Scrape profiles, enumerate users, abuse auth endpoints | Network access, scripts, disposable emails |
| Malicious registered user | See who liked them, exceed capacity, view profiles they were not served, call functions the UI never exposes, harass, scam, stalk | Valid JWT, ability to call any RPC or REST endpoint directly, bypassing the UI |
| Harasser or stalker | Locate or persist contact with a specific person | Registered user, possibly multiple accounts |
| Romance scammer | Build trust, move off-platform, extract money | Fake photos, scripted conversation, many accounts |
| Scraper or competitor | Bulk-export profiles and photos | Registered accounts plus automation |
| Curious or compromised admin | Read private data beyond need, or an admin session left signed in without stepping up | Admin role, possibly without aal2 |
| Compromised dependency or build | Exfiltrate secrets or data from the server | Runs in the Vercel build or server runtime |
| Platform incident | Supabase or Vercel outage, key leak, backup loss | Outside our control, mitigated by configuration |

### 3.3 Attack surfaces

- Supabase REST (PostgREST) and RPC endpoints, reachable directly with a user JWT, regardless of what the UI shows, and regardless of what this document calls a function whether or not the database actually enforces that.
- Supabase Realtime channels.
- Supabase Storage endpoints for the `incoming`, `photos`, and `verification` buckets, including the signed-upload-URL issuance path and its longer, vendor-fixed expiry.
- Supabase Auth endpoints (email OTP, Google OAuth callback, MFA enrollment and challenge).
- Next.js server actions and route handlers (upload ticket issuance, upload processing, cron, admin).
- The browser: XSS through user-authored text (prompts, notes, messages, heritage values), clickjacking, leaked secrets in the bundle.
- The admin surface, including the aal2 step-up flow itself.
- The build and dependency chain.
- Staging: an ephemeral Supabase branch reachable from a Vercel preview URL, which is a lower-stakes but still real surface (synthetic data only, but the same code paths).

### 3.4 Top risks, ranked

1. **A function documented as internal is actually reachable via the Data API.** This happened once already in this document's own drafting (section 0.2, finding 1). Mitigation: internal functions live in a `private` schema that is never added to the project's exposed-schema configuration, so PostgREST cannot route to it regardless of grants; grants are a secondary hygiene measure, not the control being relied on. A test in section 11 calls every function this document designates internal through the REST endpoint directly and asserts it is unreachable.
2. **Capacity, browse-cap, or available/focused bypass through an asymmetric check or a race.** Mitigation: every availability check is applied to both parties, at every step, not just the recipient; row locks in `_form_connection` are the final authority; concurrency tests assert zero stray pending likes after a race.
3. **A stale, already-generated feed still shows a now-focused person.** Mitigation: availability is re-checked at read time, not only at generation time, with backfill up to the daily ceiling.
4. **Profile viewing outside the served set (IDOR).** Mitigation: `can_view_profile()` is the single gate for profile rows and photo objects; it only returns true for self, admin, active connection partner, today's feed with the target still available, or a surfaced waiting-list like from a currently-available sender.
5. **Sensitive attribute exposure through direct table access.** Mitigation: seeking, faith, politics, heritage, and genotype all live in owner-only tables; matching reads them inside functions in the `private` schema and returns only what the viewer is allowed to see; no bulk endpoints; no sensitive column is ever reachable through a raw `SELECT` on a table another user can query.
6. **An upload-processing endpoint that trusts a client-supplied storage path.** Mitigation: the client passes only a ticket id; the server resolves everything else from the ticket row, which is scoped to the calling user.
7. **Location precision.** Mitigation: coordinates rounded to about 1 km before storage; only a distance bucket is ever returned; city label is user-chosen.
8. **Harassment persisting across blocks or accounts.** Mitigation: blocks are permanent and bidirectional, end connections, purge feed items and likes; reports carry context; human review; ban is a status, not a deletion, so a banned email cannot re-enter.
9. **Account takeover.** Mitigation: no passwords; email OTP codes are short-lived and rate-limited; Google OAuth with PKCE; HttpOnly cookies; admin accounts additionally require aal2 (Supabase TOTP MFA), enforced in the database, not just assumed from the identity provider.
10. **A CSP that silently breaks the CAPTCHA it depends on.** Mitigation: `script-src` and `frame-src` explicitly allow `challenges.cloudflare.com` by origin, not merely by nonce, and the nonce is also propagated onto Turnstile's own script tag as Cloudflare's documentation specifies.
11. **Scraping.** Mitigation: 5 profiles a day per account, human verification before visibility, CAPTCHA on sign-up, no list endpoints, photos only through authenticated storage reads gated by `can_view_profile()`.
12. **XSS.** Mitigation: React escaping, no `dangerouslySetInnerHTML`, strict CSP with per-request nonces via `proxy.ts`, user text stored as plain text and length-limited.
13. **Secret leakage.** Mitigation: the secret key exists only in the server runtime env; the client bundle contains only the publishable key and project URL; CI checks the built bundle for both the `sb_secret_` prefix and the legacy string `service_role`.
14. **Insider misuse.** Mitigation: admin actions only through audited functions that additionally require aal2; verification selfies deleted after decision; admins see reports and profiles, never messages except those attached to a report.
15. **Data loss.** Mitigation: Supabase daily backups on the paid project; migrations in git; restore procedure documented in section 10.
16. **A raw image upload exceeding a serverless function's body limit, or a decompression-bomb image.** Mitigation: uploads go direct-to-storage via a signed URL, never through a Vercel function body; the processing step enforces a sane maximum decoded pixel count before Sharp expands the image in memory.
17. **A consent record that cannot represent re-acceptance of a new policy version.** Mitigation: consent is an append-only event log, not a single row per kind.

### 3.5 Security principles that every later decision must honour

- **Deny by default.** No table, bucket, or function is reachable until a policy, grant, or schema-exposure decision says so.
- **Unreachable means unreachable, not undocumented.** A function this document calls internal is placed where the Data API cannot route to it. A naming convention is not a control.
- **The database is the referee.** Capacity, caps, compatibility, availability, and visibility are decided in Postgres. The UI is a rendering of what the database allows.
- **Checks are symmetric.** Any rule that depends on two people's state is checked for both of them, at every step that matters, not just at the step where it was first noticed.
- **No counts, no lists, no scores, no preserved backlog.** No endpoint returns "how many liked you," "everyone who liked you," any accountability or reputation number, or old likes held over from a focused period.
- **Least data.** Store the coarse version when the precise one is not needed. Delete when the purpose ends, including raw upload bytes within minutes and closing notes on the same 30-day clock as every other message.
- **Symmetry between users.** Anything one user can see about another, the other could see about them under the same conditions.
- **Auditable, stepped-up admin.** Every admin action writes an audit row before it takes effect, and every admin action requires a session that has completed a second factor.

---

## 4. System architecture

### 4.1 Components

```
Browser (PWA, Next.js client)
   |  HTTPS, user JWT in HttpOnly cookie
   v
Next.js 16 app on Vercel (App Router, server components, server actions, route handlers, proxy.ts)
   |            |                              |
   |            |                              +--> Route handlers: /api/upload/ticket (issues a Supabase signed
   |            |                                    upload URL plus an app-level ticket), /api/upload/process
   |            |                                    (ticket id only, server-side image pipeline), /api/cron/*
   |            +--> Server-side Supabase client (user JWT via @supabase/ssr) for reads/writes under RLS,
   |                 calling only functions in the `public` schema
   +--> Client-side Supabase client (publishable key + user session) for Realtime subscriptions,
        direct-to-storage signed uploads, and storage reads
                v
Supabase project (hosted, single region)
   - Exposed schemas: `public` and the default `graphql_public` only. `private` is never added to this list.
   - Auth: email OTP, Google OAuth (PKCE), TOTP MFA for admins, Turnstile CAPTCHA on sign-up and sign-in
   - Postgres 17: `public` (client-facing tables and RPCs), `private` (matching logic, gates, admin checks,
     unreachable via the Data API), RLS, pg_cron jobs
   - Realtime: postgres_changes on messages, RLS-filtered
   - Storage: private buckets `incoming`, `photos`, `verification`, policies gated by `private` functions
External
   - Google OAuth
   - Transactional email provider for OTP codes (Supabase default SMTP for development, custom SMTP for launch)
   - Cloudflare Turnstile
```

### 4.2 Trust boundaries

1. **Browser to Next.js server.** Untrusted input. Everything validated with zod schemas on the server before touching Supabase.
2. **Browser to Supabase Storage directly (signed upload URLs).** Untrusted bytes, but bounded: the underlying Supabase URL is valid for 2 hours (a Supabase-fixed value with no shorter option), the `incoming` bucket enforces a size ceiling and allowed MIME types at the bucket configuration level, and the application-level `upload_tickets` row independently expires in 5 minutes regardless of the URL's own longer window.
3. **Next.js server to Supabase with the user JWT.** Trusted identity, untrusted intent. RLS and the `public`-schema functions apply exactly as if the browser called Supabase directly. The server never calls anything in `private` directly; only RLS policies and `public` functions do, inside the database.
4. **Next.js server to Supabase with the secret key.** Fully trusted. Used only in: the upload-processing route (to read from `incoming` and write to `photos` or `verification`), the cron purge route, and nowhere else. Every use is listed in this document and grepped for in CI.
5. **Supabase internal.** pg_cron jobs run with database owner rights and are the only code that touches rows across users without a JWT.

### 4.3 Request flows

**Daily feed.** Client calls server action `getFeed()`. Server calls the `public` RPC `get_daily_feed()` with the user JWT. The function checks status and capacity, and either returns today's already-generated `feed_items` after re-checking `private.available()` for every still-undecided item (backfilling stale ones up to 5 where a fresh candidate exists) or generates a new set of 5 from candidates who are compatible and currently available. Client fetches photo bytes from Storage with its own JWT; the Storage policy calls `private.can_view_profile()`, which is true because a feed item exists for today and the target is still available.

**Like.** Client calls `decideFeedItem(itemId, 'like')`. Server calls the `public` RPC `decide_feed_item()`. The function verifies ownership and freshness of the item, re-checks `private.available()` for both the caller and the target, records the decision, and calls `private._send_like()`, which itself re-checks both sides again immediately before writing. Client receives `liked`, `connected`, or `not_available` (a single error code covering either side having become focused, so the client never learns which side changed). No other information is returned.

**Waiting list.** Client calls `nextWaiting()`. Server calls the `public` RPC `next_waiting_like()`. The function returns one like at a time, restricted to senders who are currently available, and stamps `surfaced_at`, which is what makes that person's profile and photos viewable to the recipient.

**Chat.** Client subscribes to Realtime `postgres_changes` on `messages` filtered by `connection_id`. Realtime enforces RLS with the user's JWT, so a user can only receive rows for connections they belong to. Sending is a server action that inserts under RLS; a trigger enforces membership, connection status, length, rate limits, and stamps `last_human_message_at` and `last_human_sender_id` on the connection (system messages, including the closing note, do not touch these fields).

**Photo or selfie upload.**
1. Client calls server action `createUploadTicket(kind, position?, verificationId?)`. Server inserts an `upload_tickets` row (5-minute application expiry) and requests a Supabase Storage signed upload URL for `incoming/{userId}/{ticketId}` (a Supabase-fixed 2-hour window, unrelated to and longer than the ticket's own expiry). Returns the URL and the ticket id.
2. Client uploads the raw file bytes directly to Supabase Storage using that URL. This never touches a Vercel function body, so Vercel's 4.5 MB function payload limit does not apply; the `incoming` bucket itself enforces a 15 MB ceiling and an image-only MIME allowlist as a first filter.
3. Client calls server action `processUpload(ticketId)`, passing nothing else. The route first calls the `public` RPC `begin_upload(ticketId)` under the user's own JWT, which claims the ticket and returns its `kind`, `object_path`, `position`, and `verification_id`, the only way the route learns any of this, never from a client-supplied path (section 7.28). The route then, using the secret key: downloads the object at that path; sniffs real file type from bytes (rejects non-images regardless of extension or declared MIME); decodes with `sharp` behind a maximum-decoded-pixel-count guard; strips all metadata including GPS; resizes to a maximum of 1600 px (1200 px for selfies) on the long edge; re-encodes as WebP; writes to a server-generated canonical path (`photos/{userId}/{newPhotoId}.webp` or `verification/{userId}/{ticket.verification_id}.webp`); deletes the `incoming` object. Finally the route calls the `public` RPC `process_upload(ticketId, width, height)` under the user's own JWT again, which inserts or updates the `photos` or `verifications` row and marks the ticket `used_at = now()` (section 7.17). If any step before that last call fails, the ticket is simply left claimed-but-unused and expires; nothing is left half-written.
4. A cron job purges anything left in `incoming` older than one hour, as a safety net for a client that uploads but never completes step 3, and a separate daily job removes used or long-expired ticket rows.

The original bytes are held only in the private `incoming` bucket for the seconds between upload and processing, then deleted.

**Admin.** `/admin` route group. Every request re-checks `private.is_admin_mfa()` (exposed to the client only through a thin `public` RPC `am_i_admin()` used purely for UI gating; the real enforcement is in RLS and every admin function's own precondition). Every mutation is an RPC that writes to `admin_audit` inside the same transaction.

---

## 5. Data model

All client-facing tables and RPCs live in schema `public`. Every function this document calls internal lives in schema `private`, which is never added to the project's exposed-schema configuration (Supabase's default is `public` plus `graphql_public`), so it is unreachable through PostgREST regardless of grants. `uuid` primary keys default to `gen_random_uuid()`. Timestamps are `timestamptz`. Every table has RLS enabled. Column lengths are enforced with CHECK constraints, not just in the app.

### 5.1 Enumerated types

```
profile_status:   onboarding | pending_review | active | paused | restricted | banned | deleted
gender:           woman | man | nonbinary | self_described
seeking:          women | men | everyone
goal:             marriage | life_partner | serious_relationship
kids:             want | dont_want | open | have_want_more | have_done
practice:         devout | practicing | cultural | not_practicing
politics:         liberal | moderate | conservative | other | prefer_not
habit:            never | sometimes | regularly
timeline:         ready_now | within_year | exploring
relocate:         yes | no | maybe
income_band:      under_40k | b40_80k | b80_150k | b150_300k | over_300k
genotype:         AA | AS | SS | AC | SC | unknown
education:        high_school | some_college | bachelors | masters | doctorate | trade | other
heritage_field:   background | community | origin_country | origin_region | language | raised_in
pref_mode:        nice_to_have | important | must
feed_decision:    none | like | pass
like_status:      pending | declined | connected | expired
connection_status: active | ended
end_reason:       ended_by_user | faded | blocked | account_deleted | banned
report_reason:    disrespectful | harassment | threats_stalking | assault_or_violence | scam | fake | underage | off_platform_push | inappropriate_content | other
report_severity:  low | medium | high | critical
report_status:    open | reviewed | actioned | dismissed
report_resolution: cleared | confirmed
verification_decision: approved | rejected
consent_kind:     terms | privacy | sensitive_data | genotype_data
consent_action:   accepted | withdrawn
upload_kind:      photo | selfie
contact_method:   phone | email | whatsapp | signal | instagram | other
```

### 5.2 Tables

**profiles** (viewable columns only; one row per user; no sensitive attributes)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | equals `auth.users.id` |
| status | profile_status | default `onboarding` |
| paused_at | timestamptz | nullable; set by `pause_account()`, cleared by `unpause_account()`; see section 2.5 |
| focus_now | boolean | default false; set by `focus_now_on()`/`focus_now_off()`; closes the person's remaining capacity slot on their own terms without changing `capacity` itself; see section 2.2 |
| first_name | text | 1 to 30 chars |
| age | smallint | maintained by trigger from `profile_private.birth_date` and nightly job |
| gender | gender | |
| gender_label | text | 1 to 30 chars, only when `self_described` |
| city_label | text | 1 to 60 chars, user-chosen |
| capacity | smallint | CHECK 1..3, default 1 |
| occupation | text | up to 80 chars |
| education | education | |
| height_cm | smallint | nullable, CHECK 120..230 |
| show_heritage | boolean | default true; when true, the card function includes the user's heritage values for viewers |
| prompts | jsonb | exactly 3 items `{prompt_id, answer}`; answer up to 200 chars; validated by trigger |
| created_at, updated_at, last_active_at | timestamptz | |
| verified_at | timestamptz | set by admin function |

`seeking` deliberately does not live here; see `profile_sensitive` below.

**profile_sensitive** (owner and `private`-schema functions only; no policy grants any other user a `SELECT`)

| Column | Type | Notes |
|---|---|---|
| profile_id | uuid PK FK | |
| seeking | seeking | |

A viewer never selects this table. `can_view_profile`-gated functions read it and return `seeking` only as part of a card, alongside the mutual gender/seeking check already performed server-side in `private.mutually_compatible()`.

**profile_private** (owner and `private`-schema functions only)

| Column | Type | Notes |
|---|---|---|
| profile_id | uuid PK FK | |
| birth_date | date | CHECK age at insert >= 18 |
| lat_coarse, lon_coarse | numeric(6,2) | rounded to 2 decimals (about 1 km) before storage; raw value never stored |
| age_min, age_max | smallint | own preference, CHECK 18..99, min <= max |
| max_distance_km | smallint | CHECK 5..500 |
| review_flags | jsonb | e.g. `{"social_handle": true}` set by trigger on prompt text |
| email_notifications | boolean | |

**profile_answers** (owner and `private`-schema functions only)

goal, kids, faith_label (text up to 40), faith_key (text, normalised), faith_practice, politics, smoking, drinking, timeline, relocate, income_band (nullable), health_section_enabled (boolean, default false), genotype (nullable, only when `health_section_enabled` and a `genotype_data` `accepted` consent event exists).

**profile_heritage** (owner and `private`-schema functions only)

| Column | Type |
|---|---|
| profile_id | uuid FK |
| field | heritage_field |
| value | text, 1 to 40 chars, as typed |
| value_key | text, normalised: lowercase, trimmed, diacritics folded, internal whitespace collapsed |

PK `(profile_id, field, value_key)`. At most 5 values per field, enforced by trigger.

**preferences** (owner and `private`-schema functions only)

kids_must boolean, kids_accept kids[]; faith_key_must boolean, faith_key_accept text[]; practice_must boolean, practice_accept practice[]; politics_must boolean, politics_accept politics[]; smoking_must, smoking_accept habit[]; drinking_must, drinking_accept habit[]; genotype_must boolean, genotype_accept genotype[]; use_heritage boolean default false. A `must` with an empty accept array is rejected by CHECK.

**heritage_preferences** (owner and `private`-schema functions only)

`(profile_id, field)` PK, mode pref_mode, accept_keys text[] (normalised, up to 10). Empty accept_keys is rejected. Rows are ignored entirely by matching while `preferences.use_heritage` is false.

**photos**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK | |
| position | smallint | CHECK 1..6, unique per profile |
| storage_path | text | `photos/{profile_id}/{id}.webp`, CHECK matches pattern, always server-generated |
| width, height | smallint | |
| created_at | timestamptz | |

Trigger: max 6 rows per profile; position 1 required before status can become `pending_review`.

**verifications**

id, profile_id, pose_code (text), selfie_path (text, nullable after decision), submitted_at, decided_at, decision (nullable), reviewer_id (FK admins), note (up to 300). Max 3 submissions per day per profile (trigger).

**upload_tickets** (no direct user access at all; function-only, same pattern as `likes`)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| kind | upload_kind | |
| object_path | text | `incoming/{user_id}/{id}`, server-generated |
| position | smallint | nullable, 1..6, only for `kind = 'photo'` |
| verification_id | uuid FK | nullable, only for `kind = 'selfie'`, must belong to `user_id` and be undecided |
| created_at, expires_at | timestamptz | `expires_at = created_at + 5 minutes`, independent of the underlying Supabase URL's own 2-hour validity |
| claimed_at | timestamptz | nullable; set by `begin_upload()` (section 7.28) the moment the processing route starts, before any Storage or Sharp work; distinct from `used_at` so "claimed, in progress" and "fully processed" are never conflated |
| used_at | timestamptz | nullable; set by `process_upload()` (section 7.17) only after the processed image is written and the `photos`/`verifications` row exists |

Index `(user_id, used_at)`; purged daily once used or more than 24 hours past `expires_at`.

**feed_items**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | viewer |
| target_id | uuid FK | |
| served_on | date | |
| position | smallint | 1..5 |
| decision | feed_decision | default `none` |
| decided_at | timestamptz | |

Unique `(user_id, target_id, served_on)`. Index `(user_id, served_on)`. Rows older than 30 days are purged.

**likes**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| from_user, to_user | uuid FK | CHECK from <> to |
| status | like_status | default `pending` |
| created_at | timestamptz | |
| expires_at | timestamptz | created_at + 30 days |
| surfaced_at | timestamptz | set when shown to `to_user` by `next_waiting_like()` |
| responded_at | timestamptz | |

Unique `(from_user, to_user)`. Index `(to_user, status, created_at)`. A like can only ever be created when both parties are available (section 7.6). When either party's last open slot fills, every other `pending` like involving them, in either direction, is set to `expired` in the same transaction that forms the connection (section 7.7); this reuses the existing `expired` status rather than adding a new one, since no user-facing distinction is ever drawn between a like that aged out and one that was cleared by its recipient or sender entering Focused.

**connections**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_a, user_b | uuid FK | CHECK user_a < user_b (canonical order) |
| status | connection_status | |
| created_at | timestamptz | |
| ended_at | timestamptz | |
| ended_by | uuid | nullable |
| end_reason | end_reason | nullable |
| last_message_at | timestamptz | updated by every message, human or system |
| last_human_message_at | timestamptz | updated only by human-authored messages; system messages never touch this |
| last_human_sender_id | uuid | who sent the last human message; used only to attribute a fade internally, never shown to users |
| nudge_sent_at | timestamptz | |

There is no `end_note` column. The closing note exists only as a system message in `messages`, which is the single source of truth and follows the same 30-day post-end retention as every other message in that connection, closing the contradiction in an earlier draft where the note was kept forever on the row while also being described as purged after 30 days in the chat.

Partial unique index on `(user_a, user_b) WHERE status = 'active'`. Index on `(user_a, status)` and `(user_b, status)`.

**messages**

id bigint identity PK, connection_id FK, sender_id FK (nullable for system messages), is_system boolean default false, body text (1 to 2000 chars), created_at, deleted_at (nullable, for account-deletion anonymisation). Index `(connection_id, id)`. Trigger enforces: sender is a member for non-system messages, connection is active, sender's `profiles.status = 'active'` (a `restricted` sender is rejected with `account_restricted`, section 2.5 and 7.13; a `paused` sender is not restricted from messaging, only from new matching, so this check only ever blocks `restricted`), rate limits, and updates `connections.last_message_at` always, `last_human_message_at`/`last_human_sender_id` only when `is_system = false`.

**blocks**

`(blocker_id, blocked_id)` PK, created_at. Never deleted by users.

**reports**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reporter_id, reported_id | uuid FK | |
| connection_id | uuid FK | nullable |
| message_id | bigint FK | nullable |
| reason | report_reason | |
| severity | report_severity | default computed from `reason` by trigger (disrespectful→low, harassment→medium, threats_stalking→high, assault_or_violence→critical, scam→medium, fake→low, underage→critical, off_platform_push→low, inappropriate_content→low, other→low); admin-overridable |
| details | text | up to 1000 |
| created_at | timestamptz | |
| status | report_status | |
| resolution | report_resolution | nullable, set only when an admin resolves a report that triggered a restriction |
| reviewed_by, reviewed_at, action | | |

Index on `(status, severity, created_at)` so `high` and `critical` reports sort to the top of the review queue by construction. For `reason` in `threats_stalking` or `assault_or_violence`, `report_user()` (section 7.13) does not require the same 30-day visibility window as an ordinary report; it only requires that a connection, feed item, or like ever existed between the two, at any point in the past, matching how Hinge allows reporting a past match about something that happened offline. If the connection's messages were already purged under the normal 30-day schedule before the report was filed, they cannot be recovered; this is stated plainly rather than implied otherwise.

**meeting_checkins**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK | the person answering; never visible to the other party |
| connection_id | uuid FK | |
| met_at | timestamptz | when this person tapped "We met" |
| see_again | text | `yes` \| `not_sure` \| `no`, nullable until answered |
| felt_unsafe | boolean | default false |
| created_at | timestamptz | |

Unique `(profile_id, connection_id)`: one check-in per person per connection, updatable. RLS: own rows only, no policy grants the connection partner access to the other's row, ever; this is deliberately more private than the connection's own message thread. A `felt_unsafe = true` value increments `user_abuse_signals.unsafe_checkin_flags_received` for the other party in the same connection, admin-only, in addition to whatever the person does next (Block, Report, or nothing).

**permanent_excludes**

`(viewer_id, target_id)` PK, created_at. One-directional and permanent: only removes `target_id` from `viewer_id`'s own candidate pool, unlike `blocks`, which is mutual and ends any active connection. Written only by `dont_show_again()` (section 7.23); no user ever sees this list, only the absence of that person from their own discovery.

**feed_feedback**

`(user_id, day)` PK, reasons text[] (values drawn from a small fixed set: `no_attraction`, `lifestyle`, `too_different`, `too_similar`, `distance`, `values`, `nothing_specific`), created_at. Entirely optional, written only by `submit_feed_feedback()` (section 7.24), used only for qualitative product review; never read by any ranking function, since v1's ranking is deliberately deterministic and inspectable, not adaptive (section 1).

**date_plans**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| connection_id | uuid FK | |
| created_by | uuid FK | |
| location_text | text | up to 200 chars |
| planned_at, expected_end_at | timestamptz | |
| created_at | timestamptz | |

No third-party contact information is ever stored here: sharing happens through the user's own device share sheet, exactly as Bumble's Share Date works, so Focus never holds a friend's phone number or email. Purged automatically 3 days after `expected_end_at` (section 7.19), since the row has no purpose once the window it describes has passed.

**contact_share_events**

`(id, connection_id, shared_by, method contact_method, created_at)`. Deliberately holds no value column: the actual phone number, email, or handle is sent as an ordinary chat message (section 7.26) and lives and dies under the same message retention as everything else in that connection (section 8.4), never duplicated here. This table exists only to give an internal, never-shown sense of how a connection is progressing (section 2.8); it records that a share of a given type happened and by whom, nothing more. Written by `share_contact()` (section 7.27).

**user_abuse_signals** (admin-only; never user-selectable, not even the owner's own row)

profile_id PK, connections_ended int, connections_ended_with_note int, connections_faded_as_non_responder int, reports_received int, unsafe_checkin_flags_received int, updated_at. Written only by functions and the inactivity job. Used exclusively to surface repeat-ghosting or abuse patterns to admins; never rendered to any user, and never contributes to matching or ordering.

**user_daily**

`(user_id, day)` PK, feed_served smallint, waiting_responses smallint, messages_sent int, reports_filed smallint, photo_uploads smallint, verification_submissions smallint. Written only by functions and triggers.

**consent_events** (append-only; replaces the single-row `consents` table from the first draft, which could not represent re-accepting a new policy version because its primary key would collide)

| Column | Type | Notes |
|---|---|---|
| id | bigint identity PK | |
| profile_id | uuid FK | |
| kind | consent_kind | |
| version | text | |
| action | consent_action | `accepted` or `withdrawn` |
| occurred_at | timestamptz | |

No `UPDATE` or `DELETE` policy for anyone, ever, matching `admin_audit`'s pattern. Current state for a given kind is derived as the most recent event; a profile cannot leave `onboarding` until the most recent event for `terms`, `privacy`, and `sensitive_data` is `accepted` at the current required version. `genotype_data` is separate and only required if `health_section_enabled` is set true; it is never implied by the other three and never implied by any heritage answer.

**admins**

user_id PK, added_at, added_by. Seeded by migration with your user id after first sign-in. Only editable through SQL migration, never through the app.

**admin_audit**

id bigint identity, admin_id, action text, target_type text, target_id uuid, details jsonb, created_at. Insert-only; no update or delete policy for anyone.

**deletion_requests**

profile_id PK, requested_at, purge_after (requested_at + 7 days), purged_at.

### 5.3 What is deliberately not stored

- Raw coordinates, IP addresses, device identifiers, or browser fingerprints.
- Original uploaded image bytes beyond the seconds they sit in `incoming` before processing, or any EXIF.
- Passwords (none exist), phone numbers.
- Like counts, view counts, or any per-profile popularity or reputation number, visible or not-quite-visible.
- Social handles. Detected ones are flagged, not stored separately.
- Free-text bios. Prompts are shorter and easier to moderate.
- A closing note anywhere but the message stream it belongs to.
- Any pending like that survived a user's transition into Focused.

---

## 6. Authorization model

### 6.1 Roles and schemas

- `anon`: can call nothing except Auth endpoints. No table or function grants.
- `authenticated`: every signed-in user. All access goes through RLS policies and the `public`-schema functions listed in section 6.5. There is nothing to grant in `private`, because `private` is not on the project's exposed-schema list and is therefore unreachable via the Data API regardless of any grant.
- Admin: an `authenticated` user whose id is in `admins`, checked by `private.is_admin(uid)` for identity, and `private.is_admin_mfa(uid)` (adds the aal2 check) for every actual access to admin data or functions. A thin `public.am_i_admin()` RPC exposes the aal2-inclusive check to the client purely so the Next.js server can decide whether to render the admin shell; it is a UX convenience, not a security boundary, since the real enforcement is in RLS and every admin function's own precondition.
- `service_role` / secret key: used only by the upload-processing route and the cron purge route. Never in the browser.

### 6.2 The single visibility gate

```sql
private.can_view_profile(viewer uuid, target uuid) returns boolean
```

True when any of the following holds, and the pair is not blocked in either direction:

1. `viewer = target`.
2. `private.is_admin_mfa(viewer)`.
3. An `active` connection exists between them, **regardless of the target's own profile status**. A paused or restricted person's existing connection partner must still be able to see their profile and photos, exactly as before, so the partner can render the plain-language notice from section 2.5 and act on it; only new matching exposure (cases 4 and 5) is gated on the target being `active`. This was a real gap in the prior draft, which required `active` status uniformly and would have broken an existing chat the moment its other member paused.
4. A `feed_items` row exists with `user_id = viewer`, `target_id = target`, `served_on = current_date`, the target's profile status is `active`, **and `private.available(target)` is true right now**. This closes the gap where an already-generated feed row kept a now-focused person visible; the check happens every time the function runs, not only at the moment the row was inserted.
5. A `likes` row exists with `from_user = target`, `to_user = viewer`, `status = 'pending'`, `surfaced_at IS NOT NULL`, not expired, the target's profile status is `active`, and `private.available(target)` is true at read time.

Ended connections do not grant visibility after 30 days (messages are purged by then; profile viewing ends immediately at `ended_at`). The function is `STABLE`, `SECURITY DEFINER`, `SET search_path = ''` with every referenced object fully qualified (`public.profiles`, `public.connections`, `auth.uid()`), and is the only predicate used by the `profiles`, `photos`, and Storage `photos` bucket read policies.

### 6.3 Policies by table

All tables are in `public`. Nothing below grants access to a `private`-schema object, because there is no client-facing operation that would ever need to.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | `private.can_view_profile(auth.uid(), id)` | own row, id = auth.uid(), status must be `onboarding` | own row; `status`, `verified_at`, `age` cannot be changed by the user (trigger rejects) | none (deletion via function) |
| profile_sensitive | own row | own row | own row | none |
| profile_private | own row | own row | own row | none |
| profile_answers | own row | own row | own row | none |
| profile_heritage | own rows | own rows | own rows | own rows |
| preferences | own row | own row | own row | none |
| heritage_preferences | own rows | own rows | own rows | own rows |
| photos | `private.can_view_profile(auth.uid(), profile_id)` | none (function only, via the processing route inserting with the user JWT) | none | own rows |
| verifications | own rows or `private.is_admin_mfa` | none (function only) | none (admin via function) | none |
| upload_tickets | none for users | none for users | none for users | none |
| feed_items | own rows (`user_id = auth.uid()`) | none (function) | none (function) | none |
| likes | **none for users.** Not even own outgoing likes. All access via functions. Admin: none. | none | none | none |
| connections | member (`auth.uid() IN (user_a, user_b)`) | none (function) | none (function) | none |
| messages | member of the connection | member, connection active, `sender_id = auth.uid()` for non-system rows (trigger enforces the rest) | none | none |
| blocks | own rows as blocker | own rows | none | none |
| reports | own rows as reporter (without `action`, `resolution`, and reviewer fields) or `private.is_admin_mfa` | own rows (via function) | admin via function (requires aal2) | none |
| meeting_checkins | own rows only, never the connection partner's | own rows (via function) | own rows (via function) | none |
| permanent_excludes | none for users, by design (section 7.23) | own rows (via function) | none | none |
| feed_feedback | own rows | own rows (via function) | none | none |
| date_plans | member of the connection | member (via function) | none | member, own plan (via function) |
| contact_share_events | member of the connection | none (function only, via `share_contact`) | none | none |
| user_abuse_signals | `private.is_admin_mfa` only. Not even the profile owner. | none | none | none |
| user_daily | own row | none | none | none |
| consent_events | own rows | own rows (via function) | none, ever | none, ever |
| admins | `private.is_admin_mfa` only | none | none | none |
| admin_audit | `private.is_admin_mfa` only | none (function) | none | none |
| deletion_requests | own row | via function | none | none |

"None" means no policy exists, so the operation is denied for every role except the database owner used by functions and cron.

### 6.4 Storage policies

| Bucket | Read | Write | Delete |
|---|---|---|---|
| incoming (private) | secret key only (processing route) | owner, via a short-lived Supabase signed upload URL issued alongside an `upload_tickets` row; bucket-level 15 MB size ceiling and image-only MIME allowlist; the Supabase URL itself is valid 2 hours by vendor design, and the paired `upload_tickets` row's own 5-minute expiry is what actually bounds the application's processing window | secret key (processing route, immediately after use; cron safety net after 1 hour) |
| photos (private) | `private.can_view_profile(auth.uid(), folder_owner)` | secret key only (processing route) | owner of folder, and secret key (account purge) |
| verification (private) | `private.is_admin_mfa` only | secret key only (processing route) | secret key (review function triggers deletion; also the account purge route) |

Object paths for `incoming` are the ticket's own `object_path`, generated server-side; the client never chooses or later re-supplies a path. Public URL access is disabled on all three buckets.

### 6.5 Function grants and the private schema

Every function a client can legitimately call lives in `public`, is created with `SECURITY DEFINER`, `SET search_path = ''` with every object fully qualified, `REVOKE ALL ON FUNCTION ... FROM PUBLIC`, and `GRANT EXECUTE TO authenticated` (admin functions additionally check `private.is_admin_mfa` in their first line). That list is exactly:

```
get_daily_feed, feed_state, decide_feed_item, next_waiting_like, respond_to_like,
end_connection, set_capacity, block_user, report_user, request_account_deletion,
pause_account, unpause_account, record_meeting_checkin,
dont_show_again, submit_feed_feedback, reconsider_passed_profiles,
focus_now_on, focus_now_off, share_contact,
create_date_plan, get_date_plan, delete_date_plan,
create_upload_ticket, begin_upload, process_upload, record_consent, am_i_admin,
admin_review_verification, admin_review_report, admin_ban_user, admin_reinstate_user
```

Every other function used by section 7, including `available`, `mutually_compatible`, `reciprocal_score`, `can_view_profile`, `is_admin`, `is_admin_mfa`, `normalize_key`, `_send_like`, `_form_connection`, and `_purge_user`, lives in schema `private`. This is the actual fix for the exposure found in the second review: an earlier draft called these "internal" in prose while defining several of them without the underscore convention the draft itself claimed to enforce, and the enforcement mechanism (a grant) was never actually withheld from them. The `private` schema is never added to the project's list of exposed schemas (the Supabase default is `public` and `graphql_public`), so these functions cannot be reached through PostgREST at all, regardless of any `GRANT` statement. Grants inside `private` are still set narrowly as ordinary Postgres hygiene, but the control being relied on is schema exposure, not a grant that a future migration could accidentally loosen.

Every exposed `public` function starts with:

```sql
if auth.uid() is null then raise exception 'not_authenticated'; end if;
```

and admin functions additionally start with:

```sql
if not private.is_admin_mfa(auth.uid()) then raise exception 'forbidden'; end if;
```

then check the caller's profile status where relevant.

---

## 7. Core loop functions

Each function lists its schema, preconditions, effects, invariants, concurrency handling, and the errors it raises. Error codes are short strings the UI maps to copy; no internal details leak. Functions marked `private` are unreachable by clients per section 6.5; functions marked `public` are the actual RPC surface.

### 7.1 `private.available(p uuid) returns boolean` (STABLE)

True when all of the following hold, matching the formula in section 2.2 exactly (an earlier draft defined this function as capacity math alone and never updated it after `focus_now` was added in section 0.5, which would have silently made that toggle a no-op; caught and fixed here before implementation):

```sql
select
  pr.status = 'active'
  and pr.paused_at is null
  and pr.focus_now = false
  and (
    select count(*) from public.connections c
    where c.status = 'active' and (c.user_a = p or c.user_b = p)
  ) < pr.capacity
from public.profiles pr
where pr.id = p
```

`restricted` and `banned` both fail the `status = 'active'` check here too, which is correct: neither should ever be a fresh candidate or receive a new like, on top of the messaging block that `restricted` gets separately (section 5.2, `messages` trigger).

This single function is checked, symmetrically, everywhere it matters: building candidate pools (7.4), re-reading an already-generated feed (7.4), before sending a like on both sides (7.5, 7.6), before forming a connection on both sides (7.7), and before surfacing or accepting a waiting like on both sides (7.8, 7.9). A focused, paused, restricted, or focus_now profile fails this check everywhere, so no new like can reach them and they never appear as a fresh or stale candidate to anyone.

### 7.2 `private.mutually_compatible(a uuid, b uuid) returns boolean` (STABLE)

True when all of the following hold. This function is intentionally about compatibility rules only; availability is a separate, additional filter applied by every caller, so a temporarily-focused person's compatibility rules are still evaluated correctly the moment they free up.

- Both profiles are `active`.
- No block in either direction.
- Gender and seeking match in both directions (`everyone` matches any gender).
- Each person's age is within the other's `age_min..age_max`.
- Distance between coarse coordinates is within both `max_distance_km`.
- For each of kids, faith_key, practice, politics, smoking, drinking, genotype: if A's `must` is set, B's answer is in A's accept list; and the same with roles reversed. A `must` on genotype against a person with the health section disabled fails.
- For each heritage field where A has `use_heritage = true` and mode `must`: at least one of B's `value_key`s for that field is in A's `accept_keys`; and reversed.

`nice_to_have` and `important` never affect compatibility, only ordering.

### 7.3 `private.reciprocal_score(a uuid, b uuid) returns int` (STABLE)

Replaces the one-directional `preference_score` from the first two drafts, which only scored the viewer's own preferences against a candidate and never asked whether the candidate would also want to see the viewer, a gap confirmed against the academic distinction between an ordinary recommender and a reciprocal one, where both parties' interest has to be modeled. This function is symmetric by construction: `reciprocal_score(a, b) = reciprocal_score(b, a)` always, since it is the sum of what each side would score about the other, calculated the same way regardless of which one is asking.

For each of `(a, b)` and `(b, a)` in turn, sum:

- Heritage: zero if that person's `use_heritage` is false; otherwise the weighted sum of their satisfied heritage rules about the other, `important` counts 3, `nice_to_have` counts 1 (unchanged from the prior draft's `preference_score`, just now applied in both directions and added together).
- Soft lifestyle alignment: +1 if `timeline` matches exactly, +1 if `relocate` matches exactly. These are display-only fields with no hard-filter role (section 2.3); this is the only place they affect anything, and only as a small nudge to ordering, never as a filter.

The total is halved and rounded, so a change to only one side's preferences doesn't silently double-count. Distance and recency are applied separately as tie-breakers in `get_daily_feed`, not folded into this score, so this function stays a pure statement of "how much do these two people's own stated preferences point toward each other," inspectable and explainable, matching the goal in section 1 that a candidate is ordered by something a person could, if they asked, actually have explained to them (section 7.4's `shared_factors`), never by an opaque model. Used for ordering and for generating the explanation shown to the user; never for filtering, and never shown to a user as a number.

### 7.4 `public.get_daily_feed() returns setof feed_card`

`feed_card` is a composite of viewable profile columns, photo paths, a distance bucket text (`under 5 km`, `5 to 15 km`, `15 to 50 km`, `over 50 km`), the feed item id and decision, `is_focus_pick boolean`, and `shared_factors text[]`, a short list of plain, factual strings such as "You're both looking for marriage," "Both want children," or "8 miles apart," generated from whichever non-negotiables both people share or whichever heritage rule was satisfied. There is no numeric score, attention-state, or accountability field on the card; section 1's "explain, don't score" principle is enforced at the return type, not just in the UI layer, since a function that never returns a number cannot be accidentally rendered as one.

- Preconditions: caller `active`; `private.available(caller)`. Otherwise returns an empty set and a reason code via `feed_state()`, which now additionally returns `caught_up` when the caller is available but zero fresh candidates exist for the day (section 2.7), distinct from `pending_review` or `at_capacity`.
- If `feed_items` for today already exist, re-validate before returning: for every item with `decision = 'none'`, re-check `private.available(target_id)` and `private.mutually_compatible(caller, target_id)`, since a target's non-negotiables could also have changed since the morning. For any item that now fails, remove it from what is returned and attempt to backfill one replacement candidate using the same selection logic as fresh generation (step 2 below), inserting a new `feed_items` row for today, up to the original ceiling of 5. If no replacement is available, the caller simply sees fewer than 5 for that day, and `feed_state()` reports `caught_up` once none remain. This closes the gap where a feed generated in the morning could still show a person who became focused later that day.
- Otherwise, inside one transaction:
  1. Lock the caller's `user_daily` row for today (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING` with `FOR UPDATE`) so two concurrent calls cannot both generate.
  2. Candidates (Layer 1, hard eligibility): `active` profiles `p` where `private.available(p)` and `private.mutually_compatible(caller, p)`, excluding: self; anyone with a `likes` row from the caller in the last 30 days (any status); anyone the caller passed in `feed_items`, ever, unless surfaced again through the separate reconsideration path in section 2.7 (which writes its own `feed_items` rows outside this function, never mixed into the ordinary daily 5); anyone in `permanent_excludes` for the caller; anyone with any `connections` row with the caller; anyone in `blocks` either way.
  3. Rank the candidate set (Layer 2, reciprocal ranking) by `private.reciprocal_score(caller, p) DESC`, distance ASC.
  4. Take the top 4 by rank. For the fifth (Layer 3, exploration), draw one candidate at random, weighted toward but not limited to the next-highest-ranked remainder, deliberately excluding whichever heritage or lifestyle attributes dominate the top 4, so the daily set doesn't compound into an ever-narrower pattern. If fewer than 5 total candidates exist, all of them are shown and no exploration slot is manufactured.
  5. Insert `feed_items` with positions; mark the single highest-`reciprocal_score` item across the full set (not only today's five) as `is_focus_pick`. Compute and store enough to reconstruct `shared_factors` per item. Set `feed_served`.
- Invariants: at most 5 items per user per day; every item returned passes `mutually_compatible` and `available` at the moment it is returned; at most one item per day is marked `is_focus_pick`; no field on `feed_card` is ever a bare number presented as a score.
- Errors: `not_active`, `at_capacity`.

The waiting list has priority: the UI calls `next_waiting_like()` first and only shows discovery when it returns nothing.

### 7.5 `public.decide_feed_item(item_id uuid, decision feed_decision) returns text`

- Preconditions: item belongs to caller, `served_on = current_date`, `decision = 'none'`, decision argument is `like` or `pass`.
- Effects: set decision and `decided_at`. If `like`: re-check `private.available(caller)` **and** `private.available(target)`; if either now fails, return `not_available` without creating a like row (this is the symmetric fix: an earlier draft only re-checked the target, which meant a caller who had just become focused through a separate connection could still like someone else off a stale card). Otherwise call `private._send_like(caller, target)` and return its outcome. If `pass`, return `passed`.
- Errors: `not_found`, `already_decided`, `stale_item`, `not_available`.

### 7.6 `private._send_like(from_user uuid, to_user uuid) returns text`

- Preconditions: `private.mutually_compatible(from, to)`; `private.available(from_user)` **and** `private.available(to_user)`, both re-checked here as the last check before this function's own writes, independent of whatever the caller already checked.
- If a `pending`, unexpired like exists to→from: call `private._form_connection(from, to)`; return its outcome (`connected`).
- Else insert like `(from, to, pending, expires_at = now() + 30 days)` and return `liked`.
- Invariant: a user never learns whether the other person had already liked them unless a connection forms.

### 7.7 `private._form_connection(x uuid, y uuid) returns text`

1. Order the pair: `a = least(x, y)`, `b = greatest(x, y)`.
2. `SELECT ... FROM public.profiles WHERE id IN (a, b) ORDER BY id FOR UPDATE` (deterministic lock order prevents deadlocks).
3. Recount active connections for each under the lock and confirm both are still available. If not, raise `not_available`.
4. Insert `connections (a, b, active)`, set both like rows to `connected`.
5. **For each of `a` and `b`, if `private.available(that user)` is now false** (this connection consumed their last open slot): update every other `pending` like involving that user, in either direction, to `expired`. A user with remaining capacity (2 or 3, still available after this connection) keeps their other pending likes untouched, since they are still open to new connections in the normal sense.
6. Return `connected`.
- Invariant: after commit, `active_connections(u) <= capacity(u)` for every user, and no user who just entered Focused has any surviving pending like.

### 7.8 `public.next_waiting_like() returns feed_card`

- Preconditions: caller `active` and `private.available(caller)`.
- Select one `likes` row where `to_user = caller`, `status = 'pending'`, not expired, no block, `private.mutually_compatible(caller, from_user)` still true, `private.available(from_user)` still true, ordered by `created_at ASC`, `LIMIT 1 FOR UPDATE SKIP LOCKED`.
- Set `surfaced_at = now()` if null. Return the card for `from_user`.
- Returns nothing when the list is empty. Never returns a count.
- Rate: at most 20 `respond_to_like` calls per day; the surfacing itself is not limited because it returns the same row until answered.

### 7.9 `public.respond_to_like(like_id uuid, accept boolean) returns text`

- Preconditions: like `to_user = caller`, `pending`, `surfaced_at IS NOT NULL`, not expired, `private.available(caller)` re-checked at call time, not only at the time it was surfaced.
- If not accept: `status = 'declined'`, `responded_at = now()`. The liker is never notified and never learns this. Return `passed`.
- If accept: increment `waiting_responses`; re-check `private.available(from_user)`; if still available, call `private._form_connection(caller, from_user)` and return `connected`; if the sender has since become focused elsewhere, return `not_available` and leave the like pending (it can surface again later if the sender frees up and this like was not itself cleared by that sender's own Focused transition, per 7.7 step 5).
- Errors: `not_found`, `not_surfaced`, `expired`, `at_capacity`, `not_available`, `daily_limit`.

### 7.10 `public.end_connection(connection_id uuid, note text) returns void`

- Preconditions: caller is a member; status `active`. `note` is nullable: when given, it is either free text 1 to 300 characters or one of the preset codes (`not_a_fit`, `no_chemistry_after_meeting`, `goals_dont_align`, `taking_a_break`, `something_else`) which expand to fixed copy; when omitted, no note is required and none is implied. Section 1's exit principle applies literally here: this function has no other precondition, no cooldown, and no minimum time in the connection.
- Effects: status `ended`, `ended_at`, `ended_by = caller`, `end_reason = ended_by_user`. Increment caller's `connections_ended` in `user_abuse_signals`, and `connections_ended_with_note` only if a note was given. Insert a system message (`is_system = true`, does not update `last_human_message_at`) containing either the note or a plain "This connection has ended."; this message is the only copy of the note that ever exists, and it is purged with the rest of the connection's messages 30 days after `ended_at`. Both users become `available` again immediately if their count drops below their capacity.

### 7.11 `public.set_capacity(n smallint) returns void`

- Preconditions: 1..3.
- Effects: update `capacity`. No connection is ever ended by this, and no pending like is cleared by this alone; clearing only happens on the transition into Focused via `_form_connection`, never on a capacity change by itself.

### 7.12 `public.block_user(target uuid) returns void`

- Insert into `blocks`. End any active connection between them with `end_reason = blocked`, no `user_abuse_signals` change for the blocker. Set every like between them to `declined`. Delete feed items between them. The blocked person sees the connection as "ended" and cannot tell it was a block.

### 7.13 `public.report_user(target uuid, reason report_reason, details text, connection_id uuid, message_id uuid) returns void`

- Preconditions: for ordinary reasons (`disrespectful`, `scam`, `fake`, `off_platform_push`, `inappropriate_content`, `other`), target is or was viewable to the caller (connection, feed, or surfaced like) within the last 30 days. For `harassment`, `threats_stalking`, `assault_or_violence`, and `underage`, that window does not apply: it is enough that a connection, feed item, or like ever existed between the two, at any point, matching the ability to report a past match about an offline incident. Max 10 per day.
- Effects: insert the report; compute `severity` from `reason` per the table in section 5.2, unless a caller-supplied `override_severity` from a trusted internal path applies (there is none for ordinary users; admins adjust severity only through `admin_review_report`). Increment target's `reports_received` in `user_abuse_signals`. **If the computed severity is `high` or `critical`, immediately set the target's `profile_status` to `restricted`** (unless already `banned`, which is stricter and unaffected): this removes them from all matching immediately (the existing `mutually_compatible` and `get_daily_feed` candidate checks already require `status = 'active'`, so no separate matching-side change is needed) and blocks them from sending any new message in any connection (enforced by the trigger on `messages`, section 5.2). Existing connections are not ended by this; each partner sees the generic notice from section 2.5 and retains their own immediate End Connection and Block options regardless. If a connection is referenced and has not yet reached its 30-day post-end purge, its messages are exempted from that purge for as long as the report remains open, exactly as already applied to any report.

### 7.14 `public.request_account_deletion() returns void`

- Immediate effects: status `deleted`; end all active connections with `end_reason = account_deleted`; decline all likes both ways; delete feed items; anonymise `messages.sender_id` display via a `deleted_at` on the profile; insert `deletion_requests` with `purge_after = now() + 7 days`.
- Deferred purge (section 10): delete Storage objects across all three buckets for this user, then all rows for the user across every table except `reports` where the user is `reported_id` (kept for 12 months) and `admin_audit`.

### 7.15 Admin functions

`admin_review_verification(id, decision, note)`, `admin_review_report(id, status, action, note, resolution)`, `admin_ban_user(profile_id, reason)`, `admin_reinstate_user(profile_id, reason)`. Each: `private.is_admin_mfa(auth.uid())` or `forbidden`; write `admin_audit` first; then act. When `admin_review_report` closes a report whose severity had set the target to `restricted`, `resolution` is required: `cleared` returns the target to `active` (restoring normal matching and messaging immediately), `confirmed` moves them to `banned` (section 7.15's existing ban effects apply: end their connections, decline their likes). A `restricted` account is never left in that state after review; it always resolves one way or the other, per section 1's exit principle applying to the platform's own obligations, not only to users.

### 7.16 `public.create_upload_ticket(kind upload_kind, position smallint, verification_id uuid) returns jsonb`

- Preconditions: for `kind = 'photo'`, `position` between 1 and 6; for `kind = 'selfie'`, `verification_id` must reference a row owned by the caller with `decision IS NULL`. Rate-limited alongside the existing photo and verification daily caps (section 9.4).
- Effects: insert an `upload_tickets` row with a server-generated `object_path` under `incoming/{caller}/{ticketId}` and `expires_at = now() + 5 minutes`; request a Supabase signed upload URL for that path (which will itself be valid 2 hours, a vendor-fixed value this function does not control and does not rely on for its own security guarantee). Return `{ ticketId, uploadUrl }`.

### 7.17 `public.process_upload(ticket_id uuid, width smallint, height smallint) returns jsonb`

Split into two functions from a single `process_upload` in earlier drafts, which described one function doing both a JWT-gated row check and secret-key Storage work in the same breath, an impossible combination for a single Postgres function to actually perform (Sharp-based image decoding runs in Node.js, not Postgres, and `upload_tickets` grants nothing directly selectable, so the calling route cannot even read `object_path` without a function to hand it over first). The two are `begin_upload` (section 7.28), called before any Storage work, and this function, called after.

- Preconditions: ticket exists, `user_id = auth.uid()`, `claimed_at IS NOT NULL` (via `begin_upload`), `used_at IS NULL`.
- Effects: insert the `photos` row (server-generated id, `storage_path = photos/{caller}/{id}.webp`, the given `width`/`height`) if `ticket.kind = 'photo'`, at `ticket.position`; or set `verifications.selfie_path` for `ticket.verification_id` if `ticket.kind = 'selfie'`. Set `used_at = now()`. This function only records that a correctly processed image already exists at the expected path; it never touches Storage itself. The calling route is responsible for having already downloaded, validated, decoded, stripped, resized, re-encoded, and written the object with the secret key, and for deleting the `incoming` original, before calling this function; if any of that fails, this function is never called and the ticket simply expires unused (section 7.19's `purge_incoming` and `purge_upload_tickets` clean up the orphaned original).
- Errors: `ticket_not_found`, `not_claimed`, `ticket_used`.

### 7.18 `public.record_consent(kind consent_kind, version text, action consent_action) returns void`

- Preconditions: `kind = 'genotype_data'` may only be `accepted` if `profile_answers.health_section_enabled` is being turned on in the same user flow (checked by the calling server action, not enforced here, since the ordering of "open the section" versus "accept its consent" is a UI concern; the function itself only ever appends the event the caller asked it to append).
- Effects: insert one row into `consent_events`. Never updates or deletes an existing row.

### 7.19 `public.pause_account() returns void` / `public.unpause_account() returns void`

- Preconditions: caller `active` (for pause) or `paused` (for unpause).
- Effects: `pause_account` sets `status = 'paused'` and `paused_at = now()`. This alone removes the caller from all matching immediately, through the existing `status = 'active'` requirement already present in `mutually_compatible` and `get_daily_feed`; no separate check is added. It does not touch any existing `connections` row. Any partner in an active connection sees the notice from section 2.5 the next time they view it. `unpause_account` sets `status = 'active'` and `paused_at = null`; the caller re-enters matching immediately if they have an open slot.
- Invariant: pausing never ends a connection, and never clears a pending like; only the transition into Focused (section 7.7) clears likes, because that transition is triggered by a real connection consuming the last slot, not by a person stepping away.

### 7.20 `public.record_meeting_checkin(connection_id uuid, see_again text, felt_unsafe boolean) returns void`

- Preconditions: caller is a member of the connection (active or recently ended, so a check-in can still be recorded shortly after an End Connection triggered by this same flow).
- Effects: upsert the caller's own `meeting_checkins` row for this connection; never readable by the other member, under any condition, unlike every other table gated by `can_view_profile`. If `felt_unsafe = true`, increment `unsafe_checkin_flags_received` in `user_abuse_signals` for the other party. Answering `see_again = 'no'` does not itself end the connection; the client offers End Connection as the immediate next step, using the ordinary flow in section 7.10, so the other person only ever sees a plain "this connection has ended," never a recorded preference.

### 7.21 `public.create_date_plan(connection_id uuid, location_text text, planned_at timestamptz, expected_end_at timestamptz) returns jsonb` / `public.get_date_plan(id uuid) returns jsonb` / `public.delete_date_plan(id uuid) returns void`

- Preconditions: caller is a member of an active connection; `expected_end_at > planned_at`; at most one open plan per connection at a time.
- Effects: `create_date_plan` inserts the row and returns a short, pre-formatted share text naming the match's first name and verification status alongside the plan details, generated for the client to hand to the device's own share sheet; Focus never transmits it and never asks for or stores a third party's contact details. `get_date_plan` lets either member re-fetch the same summary later. `delete_date_plan` lets the creator cancel it early. The row is purged automatically 3 days after `expected_end_at` regardless (section 7.22).

### 7.22 `public.dont_show_again(target uuid) returns void`

- Preconditions: caller and target are distinct; no active connection between them is required (this can be used on someone who was never a match at all, e.g., a coworker seen in a feed card).
- Effects: insert `(caller, target)` into `permanent_excludes`. Immediately and permanently removes `target` from `caller`'s own future candidate generation (section 7.4, step 2). Does not affect `target`'s own feed, does not notify them, and is unrelated to `blocks`: it never ends an existing connection, and if one exists this function does nothing to it (use Block for that, section 7.12).

### 7.23 `public.submit_feed_feedback(day date, reasons text[]) returns void`

- Preconditions: `day` is today or yesterday in the caller's own `user_daily` history; `reasons` drawn only from the fixed set in section 5.2, at most 3 selected.
- Effects: upsert the caller's `feed_feedback` row for that day. Entirely optional and never required to keep using discovery. Read only by admins for qualitative review, per section 1's commitment that v1 ranking is deterministic and does not adapt itself from this signal.

### 7.24 `public.reconsider_passed_profiles() returns setof feed_card`

- Preconditions: caller `active`, `available`, and `feed_state()` currently reports `caught_up` (section 2.7); this function is never called as part of the ordinary daily flow and never mixed into `get_daily_feed`'s own five.
- Effects: selects, at most 5, previously-passed candidates where: the pass is at least 90 days old; the target's profile (`updated_at`, or a photo or prompt added after the pass) has changed since the pass was recorded; the pair is still `mutually_compatible` today; the target is not in `permanent_excludes` for the caller. Returns them as ordinary `feed_card` values (ranked the same way) but does not write `feed_items` rows for them until the caller acts on one, at which point a normal `decide_feed_item`-equivalent path applies. Presenting this list is always an explicit choice the caller makes from the caught-up screen; nothing here runs automatically or silently reintroduces anyone into the daily five.

### 7.25 Scheduled jobs (pg_cron unless noted)

| Job | Schedule | Effect |
|---|---|---|
| expire_likes | hourly | `pending` likes past `expires_at` become `expired` |
| refresh_ages | daily 03:00 | recompute `profiles.age` from `birth_date` |
| connection_inactivity | daily 04:00 | active connections where `last_human_message_at` (or `created_at` if never set) is more than 3 days ago and `nudge_sent_at` is null: insert a system "Still here?" message and set `nudge_sent_at` (does not touch `last_human_message_at`). Those where the last human message (or creation) is more than 7 days ago and a second prompt has not been sent: insert a system message asking "Still interested?" with a one-tap End Connection action built into how the client renders that message type, and mark it sent. Those where it has been more than 10 days total with still no human message since: end with `faded`; increment `connections_faded_as_non_responder` in `user_abuse_signals` for whichever party is not `last_human_sender_id` (or for both if `last_human_sender_id` is null). This is a shortened, two-touchpoint version of the original 14-plus-3-day schedule: the manual End Connection action in section 7.10 has never had any waiting period attached to it, in either version; only the automatic backstop for when nobody acts has been shortened, from 17 days total to 10 |
| purge_feed_items | daily | delete `feed_items` older than 30 days |
| purge_ended_messages | daily | delete messages of connections ended more than 30 days ago that have no open report; this now includes the closing-note system message, which has no separate retention rule anymore |
| purge_incoming | hourly | delete anything in the `incoming` bucket older than 1 hour |
| purge_upload_tickets | daily | delete `upload_tickets` rows that are used, or more than 24 hours past `expires_at` unused |
| purge_date_plans | daily | delete `date_plans` rows more than 3 days past `expected_end_at` |
| purge_deleted_accounts | daily, via Vercel Cron calling `/api/cron/purge` with a bearer secret | for each `deletion_requests` past `purge_after`: delete Storage objects across all buckets with the secret key, then call `private._purge_user(profile_id)` |
| purge_verification_selfies | daily, same route | delete Storage objects for verifications decided more than 1 day ago and null `selfie_path` |

### 7.26 `public.focus_now_on() returns void` / `public.focus_now_off() returns void`

- Preconditions: caller `active`.
- Effects: `focus_now_on` sets `profiles.focus_now = true`; `focus_now_off` sets it `false`. Both take effect immediately and are picked up everywhere `available()` is evaluated (section 7.1), with no other side effect: no connection is touched, no like is cleared, unlike the transition into Focused through capacity itself (section 7.7), because this is a voluntary pause on new introductions, not the product's own signal that a slot is genuinely full.

### 7.27 `public.share_contact(connection_id uuid, method contact_method, value text, confirmed boolean) returns void`

- Preconditions: caller is a member of an `active` connection; `confirmed = true` is required (the client only sets this after showing the warning in section 2.8; the function itself has no way to know the warning was read, so this is a deliberate, minimal check rather than a real enforcement of informed consent, which is ultimately a UX responsibility); `value` 1 to 200 characters.
- Effects: insert an ordinary message (`is_system = false`, `sender_id = caller`) containing a formatted line naming the method and the value, so it is delivered, stored, and later purged under exactly the same rules as any other message in that connection (section 8.4), never duplicated elsewhere. Separately, insert a `contact_share_events` row recording only the method and who shared, never the value. Sharing is one-directional by construction: this function only ever grants the recipient the caller's information; the recipient's own information is unaffected and requires their own separate call to reciprocate, if they choose to.

### 7.28 `public.begin_upload(ticket_id uuid) returns jsonb`

Called by the processing route immediately before any Storage or Sharp work, using the caller's own JWT, not the secret key; this is the check section 4.3 already described as happening "under the user's own JWT" before "the actual byte-moving happens with the secret key."

- Preconditions: ticket exists, `user_id = auth.uid()`, `claimed_at IS NULL`, `used_at IS NULL`, `expires_at > now()`.
- Effects: set `claimed_at = now()` (an atomic `UPDATE ... WHERE claimed_at IS NULL RETURNING ...`, so two concurrent calls for the same ticket cannot both proceed). Return `{ kind, object_path, position, verification_id }` read from the ticket row; this is the only way the route learns which object to fetch, closing the IDOR surface an earlier draft left open by accepting an arbitrary client-supplied `objectPath` instead of deriving it from a ticket the caller does not control the contents of.
- Errors: `ticket_not_found`, `ticket_expired`, `already_claimed`, `ticket_used`.

---

## 8. Privacy and data protection

### 8.1 Sensitive categories

Seeking, faith, heritage, genotype, and politics are special-category data under GDPR-style regimes and treated that way regardless of jurisdiction:

- Collected only with explicit, versioned consent, recorded as append-only events (section 5.2) in two tiers: `sensitive_data` (seeking, faith, heritage, politics) is required to leave onboarding; `genotype_data` is entirely separate, required only if the user opens the health section, and is never implied by heritage answers or by the general sensitive-data consent. Washington's My Health My Data Act and GDPR-style regimes both treat genetic data as its own protected category, and the consent model reflects that split rather than bundling it in.
- Stored in owner-only tables (`profile_sensitive`, `profile_answers`, `profile_heritage`). Other users never select them directly; they receive only the derived compatibility result and the display-only fields the user marked viewable, through a `private`-schema function that a client cannot call directly.
- Never used for ranking except the user's own `nice_to_have`/`important` heritage rules.
- Deleted with the account, and individually clearable at any time. Withdrawing consent is itself an event (`action = 'withdrawn'`), not a deletion of history, so the record shows what was true when.

### 8.2 Location

- The browser geolocation result, or a geocoded city, is rounded to two decimal places before it is sent to the server. The server rounds again. Raw values are never persisted or logged.
- Others see only a distance bucket and the user's typed city label.
- No "last active near" or map features.

### 8.3 Photos

- The original uploaded bytes are held in the private `incoming` bucket only for the seconds between upload and processing, then deleted; a cron job removes anything left behind within an hour as a safety net.
- Processing strips EXIF, including GPS and device data, before the processed copy is written to `photos` or `verification`.
- Buckets are private. Reads require a JWT and pass through `private.can_view_profile()`. There is no public URL.
- Verification selfies are readable by admins with an aal2 session only and deleted within a day of the decision.
- Screenshots cannot be prevented on the web. The privacy policy says so plainly.

### 8.4 Messages and notes

- Readable only by the two members and, for a specific reported message, by an admin reviewing that report.
- Purged 30 days after a connection ends unless a report references the connection. The closing note is a message like any other and is purged on the same schedule; there is no separate, longer-lived copy of it anywhere in the schema.

### 8.5 Retention schedule

| Data | Kept until |
|---|---|
| Feed items | 30 days |
| Pending likes | 30 days, then `expired`; expired and declined rows purged after 90 days; a like can also become `expired` immediately if its sender or recipient enters Focused (section 7.7) |
| Messages of ended connections, including the closing note | 30 days after end, unless reported |
| Raw upload originals (`incoming` bucket) | Seconds, deleted immediately after processing; 1 hour hard ceiling via cron |
| Upload tickets | Used immediately, or purged 24 hours after expiry if unused |
| Verification selfies | 1 day after decision |
| Reports | 12 months after review |
| Consent events | Indefinitely, as a historical record; this is the point of an append-only log |
| Admin audit | Indefinitely (no personal content, ids only) |
| Deleted accounts | Purged 7 days after request |
| Everything else | Life of the account |

### 8.6 What admins can see

Profiles (viewable columns), verification selfies during review, reports with the reported message if one is attached, user status, `user_abuse_signals` for pattern detection, and audit history, all gated behind `private.is_admin_mfa`. Admins cannot read likes, cannot read chats except a reported message, and cannot see sensitive-category answers unless a report requires it.

### 8.7 Logging

- Server logs record request path, status, duration, and user id. Never bodies, emails, names, or coordinates.
- Database logs are Supabase defaults; statement logging of parameters is off.
- Errors sent to the client are codes, never stack traces or SQL.

---

## 9. Application security

### 9.1 Authentication and sessions

- Supabase Auth with two providers only: email OTP (6-digit code, 10-minute expiry, single use) and Google OAuth with PKCE. Magic links are disabled because they break in installed PWAs and are phishable.
- Cloudflare Turnstile is required on the OTP request and on sign-up. Supabase Auth verifies the token server-side.
- Sessions live in HttpOnly, Secure, SameSite=Lax cookies managed by `@supabase/ssr`. Access token lifetime 1 hour, refresh token rotation on, reuse detection on.
- Admin accounts require both a linked Google provider and an enrolled TOTP factor. On first admin sign-in without an enrolled factor, every admin screen shows only "Set up two-factor authentication to continue"; nothing admin-shaped is reachable until the session reports `aal = 'aal2'`.
- Sign-out revokes the refresh token server-side.
- Email change requires confirmation from both old and new addresses (Supabase "secure email change").

### 9.2 Input validation

- Every server action and route handler validates input with a zod schema. Unknown keys are stripped. Strings are trimmed and length-limited to the same limits the database enforces.
- The database is the last line: CHECK constraints on lengths and ranges, enums for categorical fields, triggers for cross-row rules (photo count, heritage value count, prompt shape).
- Heritage values and faith labels are normalised with a single SQL function `private.normalize_key(text)` used everywhere, so "Yorùbá", "yoruba", and "YORUBA " match.
- User text is rendered as text. No markdown, no HTML, no link unfurling in v1. URLs in messages are shown as plain text, not anchors.

### 9.3 Browser hardening

Headers set in `proxy.ts` (Next.js 16's replacement for `middleware.ts`) for every response:

- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'nonce-{per-request}' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://{project}.supabase.co; connect-src 'self' https://{project}.supabase.co wss://{project}.supabase.co https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`. Confirmed against Cloudflare's Turnstile documentation, which requires the literal `challenges.cloudflare.com` origin in both `script-src` and `frame-src`, not merely a nonce; the same per-request nonce is also set as an attribute on Turnstile's own script tag, per Cloudflare's documented nonce-propagation approach, so the widget's own dynamically loaded resources inherit it.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(self), geolocation=(self), microphone=(), payment=()`
- `style-src 'unsafe-inline'` is a known compromise for Tailwind-generated inline styles in Next.js and is revisited in the red-team pass.
- A per-request nonce forces dynamic rendering on every page that uses it. Accepted deliberately; a marketing or terms page with no user data could reasonably drop the nonce and use a stricter static CSP instead.

### 9.4 Rate limits

Enforced in the database unless stated, because the database cannot be bypassed.

| Action | Limit | Where |
|---|---|---|
| Feed generation | 5 profiles per day | `get_daily_feed()` |
| Waiting-list responses | 20 per day | `respond_to_like()` |
| Messages | 30 per minute per connection, 500 per day | trigger on `messages` |
| Reports | 10 per day | `report_user()` |
| Photo/selfie uploads | 20 per day, 15 MB each at the `incoming` bucket ceiling | `create_upload_ticket()` plus `user_daily` |
| Verification submissions | 3 per day | trigger on `verifications` |
| Profile edits | 60 per hour | trigger on `profiles` |
| OTP requests | Supabase defaults (per email and per IP) plus Turnstile | Supabase Auth |
| Any server action | 120 per minute per user | in-memory token bucket in the Next.js server as a first filter; not relied on |

### 9.5 Abuse controls

- **Fake profiles:** human selfie review before visibility; at least two photos; a face required in the first (checked by the reviewer, not by software, in v1).
- **Off-platform pushing and social handles on public profiles:** a trigger scans prompts for handle patterns, platform names, and payment app names, since a public profile is where follower-farming and validation-seeking actually happen (section 1's "nothing to collect"). A hit sets `review_flags.social_handle` and the profile is held for review before it becomes visible.
- **Contact details typed casually into a private chat are a different situation, deliberately handled differently (section 2.8).** These are two connected adults, not a stranger farming followers, and Focus does not block or silently flag this by default; the same detection instead surfaces a one-time, dismissible friction line to the sender ("keep this private until you're comfortable"), never a refusal. The one exception is a pattern consistent with a known scam script (an unusually early push off-platform combined with other signals already covered under romance-scam patterns below), which is still surfaced to admins the same way any other reported concern is.
- **Duplicate accounts:** one account per email; Google accounts are their own email. Nothing stronger in v1, by choice.
- **Scraping:** 5 profiles a day, no list endpoints, no public photo URLs, human verification, CAPTCHA on sign-up.
- **Harassment:** block is permanent and invisible to the blocked person; reports carry the exact message; ban keeps the email out.
- **Underage:** date of birth with server-side age check; `underage` report reason routes to immediate ban on confirmation.
- **Romance scam patterns:** `user_abuse_signals.reports_received` gives admins a repeat-offender view across all time, without exposing any number to users.
- **Threats, stalking, and violence:** a `high` or `critical` severity report restricts the account automatically, before any human looks at it, per section 2.4, 2.5, and 7.13. The reporting user is never shown a verdict, only confirmation that a human will review it, and never asked to prove anything to unlock this protection.
- **In-app safety UI is not an emergency service.** Every "I felt unsafe" or "I need help" path (sections 2.4, 2.6) leads first to a plain, unambiguous link to local emergency services and to sharing with a trusted contact, before anything else, and the product never implies it can dispatch help itself.

### 9.6 Admin surface

- `/admin` is a route group with a server-side `private.is_admin_mfa()` check (via `am_i_admin()` for the UI gate, and directly in every mutating function) in its layout and again in every action.
- Admin pages render lists of verifications, reports, and `user_abuse_signals` flags only.
- All mutations are RPCs that write `admin_audit` in the same transaction.
- No admin function can read `likes` or arbitrary `messages`.

### 9.7 Secrets

| Secret | Lives in | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env, `.env.local` | browser and server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel env, `.env.local` | browser and server (public by design; RLS is the protection) |
| `SUPABASE_SECRET_KEY` | Vercel env (server only), `.env.local` | upload-processing route, cron purge route |
| `CRON_SECRET` | Vercel env | cron route bearer check |
| `TURNSTILE_SECRET_KEY` | Supabase Auth settings | Supabase |
| Google OAuth client id and secret | Supabase Auth settings | Supabase |
| SMTP credentials | Supabase Auth settings | Supabase |

`.env*` is gitignored. `.env.example` lists names only. CI fails if the built client bundle contains the `sb_secret_` prefix or the legacy string `service_role`. Rotation: any suspected leak rotates the key in the Supabase dashboard and redeploys.

### 9.8 Dependencies and build

- Runtime dependencies kept to: `next` (16.x), `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `sharp`. UI components are copied into the repo (shadcn style), not installed as a runtime package.
- `pnpm-lock.yaml` committed. `pnpm install --frozen-lockfile` in CI. Lifecycle scripts disabled (pnpm default).
- Dependabot weekly. `pnpm audit --prod` in CI, failing on high or critical.
- Vercel deploys from the `main` branch only, from the `Dating App/app` root directory. Pull request preview deployments point at an ephemeral, per-PR Supabase branch, never at the production project.

### 9.9 Error handling

- Functions raise short codes. Server actions map codes to user copy and log the code with the user id. Unexpected errors return `unexpected` to the client and the full error to the server log.
- No error path ever reveals whether a specific email is registered, whether a specific person liked you, whether a profile id exists, or a person's current available/focused state beyond what the product intentionally shows. `not_available` is deliberately used for both "the target became focused" and "the caller became focused" so the two cannot be distinguished from the error alone.

---

## 10. Availability and operations

### 10.1 Environments

| Environment | Database | App | Purpose |
|---|---|---|---|
| Local | Supabase CLI local stack in Docker (`npx supabase start`) | `pnpm dev` | all development and tests |
| Staging (per pull request) | Ephemeral Supabase branch, created automatically by the Supabase GitHub integration when a PR opens, migrations applied automatically, destroyed when the PR closes or merges. Billed hourly at $0.01344/hour (about $0.32/day) only while the PR is open; confirmed against the live Supabase cost API for this organisation on 2026-09-09. | Vercel preview deployment for that PR, configured with that branch's URL and publishable key | UI and integration review with synthetic data only; never touches production data |
| Production | Hosted Supabase project, Pro plan: $25/month base, which includes a $10/month compute credit covering one Micro instance, so the expected steady-state bill is $25/month at this scale; confirmed against the live Supabase cost API for this organisation on 2026-09-09 | Vercel production from `main` | real users |

### 10.2 Migrations

Every migration is written as either **expand** or **contract**:

- **Expand** migrations are additive and backward-compatible. They run automatically: applied to a PR's ephemeral branch on open, and to production via CI on merge to `main`, immediately followed by the Vercel deploy that depends on them.
- **Contract** migrations are destructive or narrowing and are never run automatically. A contract migration is written as its own pull request, labelled as such in the filename, and is applied to production manually, only after confirming the application version that depended on the old shape is no longer live and the replacement has been stable for at least one full day. CI refuses to merge a PR that mixes a contract migration with application code in the same change.

Seed data for local development lives in `supabase/seed.sql` and never contains real people.

### 10.3 Backups and restore

- Hosted project: Supabase daily backups (7-day retention on the Pro tier). Point-in-time recovery is a paid add-on and is not enabled in v1.
- Restore drill: once before launch, restore the latest backup into a fresh local stack and run the test suite against it.
- Storage objects are not in database backups. Photos are re-uploadable by users; the app tolerates a missing object by showing a placeholder.

### 10.4 Monitoring

- Vercel: deployment status and function errors.
- Supabase: weekly review of the security and performance advisors through the dashboard or MCP; alert email on high CPU or disk.
- A daily cron route logs a one-line health summary: active profiles, active connections, open reports, pending verifications. No personal data.

### 10.5 Incident basics

- Suspected key leak: rotate in Supabase, update Vercel env, redeploy, review audit and logs. A secret key can be revoked without invalidating every signed-in user's session, unlike the old service_role key.
- Suspected data exposure: pause sign-ups (feature flag), assess with the advisors and logs, fix, notify affected users by email in plain language, document.

---

## 11. Testing strategy

### 11.1 Database tests (pgTAP, run by `supabase test db`)

- User A cannot select any row from `likes`, including their own outgoing likes.
- User A cannot select B's `profile_sensitive`, `profile_answers`, `profile_private`, `profile_heritage`, `preferences`, or `user_abuse_signals`, even A's own row of the last one.
- User A cannot select B's `profiles` row or `photos` unless one of the five `can_view_profile` conditions holds; each condition has a positive and a negative test, including a pending like from a sender who has since become focused, and a feed item whose target has since become focused (must not grant visibility in either case).
- User A cannot insert into `feed_items`, `likes`, `connections`, `user_abuse_signals`, or `upload_tickets`.
- User A cannot update `profiles.status`, `verified_at`, or `capacity` outside `set_capacity()`.
- A non-admin cannot execute any `admin_*` function; an admin without an aal2 session cannot execute any `admin_*` function or select `admins`, `admin_audit`, or `user_abuse_signals`; the same admin, after completing TOTP enrollment and a challenge in the test harness, can.
- **Every function this document designates `private` is called directly through the REST endpoint (`POST /rest/v1/rpc/available`, `.../mutually_compatible`, `.../reciprocal_score`, `.../can_view_profile`, `.../is_admin`, `.../is_admin_mfa`, `.../normalize_key`) with a valid user JWT and confirmed to return a schema-not-found style error, not a permission error and not a result.** A permission error would suggest the schema is reachable but merely denied by a grant, which is exactly the fragile state this revision moved away from.
- Storage policies: A can read B's photo only under `can_view_profile`; nobody but an aal2 admin can read `verification` objects; nobody but the secret key can read `incoming` objects.

### 11.2 Function and invariant tests (Vitest against the local stack, using real JWTs for several test users)

- Capacity: with capacity 1, a user who is in a connection gets `at_capacity` from `feed_state()` and an empty feed; `respond_to_like` and `decide_feed_item` raise `not_available` when relevant.
- **The exact race from the second review:** user A, capacity 1, is shown a feed while available. Two requests are then issued concurrently: request 1 forms a connection between A and B through the normal like flow; request 2, from A, calls `decide_feed_item('like')` against a different, already-served card C. Assert exactly one connection forms (A–B), and assert zero `likes` rows exist from A to C afterward, regardless of which request's database work happens to interleave first.
- **Stale feed backfill:** user A's feed for today includes target T. T forms an unrelated connection that fills their capacity. A calls `get_daily_feed()` again the same day: assert T is no longer present, and if a compatible available replacement exists, assert a new card appears in T's place while the total for the day stays at 5.
- **Clean slate on Focused:** user A, capacity 1, has three incoming pending likes and one outgoing pending like when a fourth party forms a mutual connection with A. Assert all three incoming likes and the one outgoing like are now `expired`, and assert none of them resurface even after A later ends that connection and becomes available again.
- Concurrency: 20 parallel `respond_to_like` calls from different likers against one user with capacity 1 produce exactly one `connected` and 19 `not_available`.
- Mutual pre-screen: a user whose `kids_must` excludes `dont_want` never sees a `dont_want` profile, and that profile never sees them either.
- Heritage: with `use_heritage` on, `must` with keys `['yoruba']` matches a profile whose community values include "Yorùbá"; `important` outranks `nice_to_have` in feed order but neither changes membership; with `use_heritage` off, the same rules have no effect on either.
- Waiting list: likes are surfaced one at a time, oldest first; a like from a sender who has since become focused is skipped; declined likes never resurface.
- Browse cap: the sixth candidate is never served; calling `get_daily_feed()` twice returns the same five (or fewer, after a backfill miss).
- End connection: frees both slots; the closing note appears only as a message and is confirmed absent from any `connections` column; `user_abuse_signals` updates for the ender only, and is confirmed unreadable by either user via a direct select.
- Inactivity attribution: a connection where A sends the last human message and B never replies, after the nudge and fade window, increments `connections_faded_as_non_responder` for B only; a system nudge message does not reset `last_human_message_at`.
- Block: ends the connection with no note, purges feed items and likes, and `can_view_profile` becomes false both ways.
- End Connection with no note: assert the partner sees a plain "This connection has ended" system message and that `connections_ended_with_note` does not increment for the ender.
- Pause: a paused user disappears from a third party's fresh `get_daily_feed()` immediately; their existing active connection's partner can still call `can_view_profile` successfully, still receive messages, and can call `end_connection` immediately with no error; unpausing restores normal matching eligibility.
- Restriction: filing a report with reason `assault_or_violence` against an `active` target immediately flips their status to `restricted`; a subsequent message attempt from that user in any of their connections is rejected with `account_restricted`; their existing connections remain queryable by their partners; `admin_review_report` with `resolution = 'cleared'` returns them to `active` and restores messaging in the same test.
- Safety reporting window: a report with reason `harassment` about an interaction more than 30 days old with no current connection, feed item, or like is accepted, where an ordinary `disrespectful` report about the same age interaction is rejected as out of window.
- Meeting check-in privacy: user A's `meeting_checkins` row for a shared connection is never selectable by user B under any RLS condition, including an active connection between them.
- Date plan: `date_plans` created by A is readable by B (the connection partner) but contains no contact-detail column at all; the row is gone from a direct select after the purge job runs 3 days past `expected_end_at`.
- Deletion: after `request_account_deletion()` plus the purge job, no rows remain for the user except retained reports and audit, and Storage is empty for that folder across all three buckets.
- Upload ticket pipeline: `begin_upload` rejects a ticket belonging to another user, an already-claimed ticket, an already-used ticket, and an expired ticket (at 5 minutes, well before the underlying Supabase URL's own 2-hour window closes), even though the Storage object itself would still be fetchable by the secret key; two concurrent `begin_upload` calls for the same ticket produce exactly one success; `process_upload` rejects a ticket that was never claimed via `begin_upload`; a file uploaded via the signed URL larger than the `incoming` bucket ceiling is rejected before it reaches the processing route; a non-image file with an image extension is rejected by byte-sniffing; a successfully processed image leaves no object behind in `incoming`.
- Consent: a user can record a `sensitive_data` `accepted` event at version 1, then later a second `accepted` event at version 2, without any conflict; the derived current state reflects version 2; a `withdrawn` event is recorded without deleting the prior `accepted` event.

### 11.3 Application tests

- Server actions: zod rejection of oversize and malformed input; error codes never contain SQL.
- Upload routes: the ticket route never accepts a `kind` outside `photo`/`selfie`; `processUpload` accepts only a ticket id and rejects any attempt to pass a storage path directly; the processing route rejects non-images by byte sniffing, rejects a decoded pixel count above the sanity ceiling before full decode, strips EXIF, and writes to a server-derived path only.
- Playwright smoke: sign up with OTP (local inbucket), complete onboarding, get approved via the admin page (as an aal2-enrolled test admin), see a feed, like, form a connection with a second test user, chat over Realtime, end with a note, verify slot freed and the ended party immediately eligible to appear in a fresh feed.
- Headers: a test fetches `/` and asserts every header in section 9.3, including a fresh nonce on each request and its presence on the Turnstile script tag on the sign-up page.
- Bundle check: the client build contains no `sb_secret_`-prefixed string and no server-only env names.

### 11.4 Continuous integration (GitHub Actions on every pull request)

1. `pnpm install --frozen-lockfile`
2. `pnpm lint` and `pnpm typecheck`
3. `supabase start`, apply migrations, `supabase test db`
4. `pnpm test` (Vitest)
5. `pnpm build`, bundle secret check
6. Playwright smoke against the local build
7. `pnpm audit --prod`
8. Verify the PR contains no migration file tagged `contract` alongside application code changes

Merge to `main` additionally runs `supabase db push` (expand migrations only) to production and lets Vercel deploy. A contract migration merge is a separate, manually-triggered production step.

---

## 12. Review process (standing order)

Every phase in section 14 ends with three passes, in this order, before the next phase starts.

### 12.1 Code review

Ordinary review for correctness, clarity, and adherence to this document. Any deviation from the spec is either fixed or written back into the spec with a reason.

### 12.2 Red-team pass

Adversarial, performed against the running local stack with raw HTTP calls and SQL, not through the UI.

- Call every RPC with another user's ids, stale ids, and random uuids.
- **Attempt to call every function this document designates `private` directly through the REST endpoint and confirm the schema itself is unreachable, not merely permission-denied.**
- Select from every table as a normal user; attempt to read likes, others' answers, others' sensitive fields, others' photos, verification selfies, and `user_abuse_signals` for any profile including your own.
- Hit `get_daily_feed()` and `respond_to_like()` in parallel from many sessions; assert capacity, caps, and the available/focused candidate exclusion all hold, including the specific caller-side race from section 11.2.
- Read back an already-generated feed after artificially forming a connection for one of its targets in a separate session; confirm the target disappears on the next read.
- Force a user into Focused with several pending likes outstanding and confirm they are all cleared, not merely hidden.
- Attempt `begin_upload` and `process_upload` with a fabricated or another user's ticket id, and with a raw object path where a ticket id is expected; attempt `process_upload` on a ticket never passed through `begin_upload`.
- Fetch Storage objects by guessed path in all three buckets with a valid JWT.
- Subscribe to Realtime on a connection you are not in.
- Submit prompts and messages containing script tags, long unicode, right-to-left overrides, and social handles; verify rendering and flagging.
- Attempt admin routes and admin RPCs as a normal user, and as an admin whose Google account is linked but has not completed TOTP enrollment.
- Load the sign-up page with the CSP active and confirm Turnstile actually renders and verifies, not just that the CSP report console is quiet.
- Search the client bundle and network responses for secrets, emails, coordinates, and birth dates.
- Request deletion and verify the purge is complete, including all three Storage buckets and the ticket table.
- Review Supabase security advisors and fix every finding.
- Try to learn whether a specific person liked you, or whether a specific person is currently focused, through timing, error messages, or state differences beyond what the product intentionally reveals.
- Attempt to upload an image crafted to decompress to a very large pixel count and confirm the guard rejects it before full decode.

Findings are fixed before the sane-mode pass.

### 12.3 Sane-mode pass

Sober review against section 1:

- Does every screen serve attention over volume? Is anything counting, listing, scoring, or nudging toward more?
- Is any feature present that a serious 34-year-old would not understand in five seconds?
- What can be removed? Remove it.
- Do the non-negotiable and heritage flows work for a Haitian, a Yoruba, a Gujarati, and a fourth-generation American, with the same fields?
- Are the copy and error messages calm and plain?
- Is the code smaller than it was before the red-team fixes, or has security work added complexity that can be simplified?
- Does anything in this phase quietly reintroduce a visible count, list, score, or preserved backlog that section 1 rules out?
- Is anything this document calls internal actually reachable, or merely undocumented?

---

## 13. Goals cross-check

| Research or review finding | Design decision |
|---|---|
| Acceptance odds fall 27% across a browsing session (Pronk and Denissen) | 5 profiles a day, one at a time, no going back |
| Large pool plus reversible choice is the worst outcome (D'Angelo and Toma) | Capacity limit; ending a connection requires a note; no undo on Pass |
| 82% swipe without intending to meet (Coffee Meets Bagel 2025) | No like counts, no feed, no handles; human verification before visibility |
| 44% use Tinder for a confidence boost (LendEDU) | Nothing to collect; likes are invisible until surfaced one at a time; no visible score of any kind |
| Hinge paywalls kids, family plans, politics, education | All non-negotiables free and set at onboarding; money never changes eligibility or visibility, permanently |
| Mainstream apps stop at race-level ethnicity | Self-written heritage fields, switched on in settings, each rule nice to have, important, or must |
| Cornell: race filters and same-race algorithms reinforce bias | User-stated preference only; no inference; no ranking except the user's own rules |
| Genotype is a first-date question in Nigeria | Optional, off-by-default health section with its own separate consent, decoupled from heritage |
| Physical attraction is a must-have for 97% | Photos shown, first must show a face; non-negotiables shown above them |
| Ghosting and "ghostlighting" (66.5%, BLK) | End-with-a-note, fade detection attributed to whoever actually stopped replying; held as an internal abuse signal, never a public score |
| A hidden backlog of admirers undermines the "no illusion of options" premise (first external review) | Focused users are removed from every other user's candidate pool; only pre-existing likes from senders who were available at send time could ever surface |
| A preserved, not merely paused, backlog still contradicts the premise (second external review) | Every other pending like, both directions, is cleared the instant a user's last slot fills; becoming available again is a genuine clean slate |
| A function labeled internal was still reachable via the Data API (second external review) | Every non-client-facing function lives in a `private` schema that is never exposed, not merely named with an underscore |
| A caller, not just a target, could bypass focus through a race (second external review) | Every availability check is symmetric: both sides, at every step, with the row-locked transaction as final authority |
| An already-generated feed could still show a now-focused person (second external review) | Availability is re-checked at read time with backfill, not only at generation time |
| Sidekick patent claims require hiding the profile and refusing likes at the limit | The available/focused mechanism and the clear-on-focus rule were designed for product reasons independent of the patent; whether this reading is closer to or further from the claims is a Phase −1 legal question |
| Hinge Your Turn Limits raised responsiveness 20% | Waiting list must be answered before new discovery |
| Diaspora apps bundle dating with community, and community is where the pool comes from | No community lane in v1; launch inside an existing community |
| A single "end connection" flow conflates a bad date with a dangerous one, confirmed against how Hinge, Tinder, and Bumble each separate ordinary unmatching from safety reporting (third external input) | End, Block, and Report are three distinct actions with distinct guarantees (section 2.4); reports carry a severity that can automatically restrict an account before any human reviews it |
| `paused` existed as an enum value since the first draft with no defined behavior, and an existing connection could leave the other person waiting indefinitely (third external input) | Pausing is self-service, removes a person from all new matching immediately, and never traps their existing connection partner, who gets an immediate one-tap way out (section 2.5) |
| A 17-day automatic silence window contradicted the product's own premise of one present connection (third external input) | Shortened to a 10-day automatic backstop; manual ending has never had a waiting period in any version |
| Building a real emergency-dispatch feature would be a liability and an operational promise this product cannot keep (third external input, explicit caution) | Date planning generates a share-sheet summary the user sends themselves, exactly as Bumble's Share Date works; Focus never stores a third party's contact details and never claims to monitor or dispatch help |
| Ranking that only scores the viewer's preferences ignores whether the candidate would want to see the viewer back, unlike a genuine reciprocal recommender (fourth external input) | `reciprocal_score` is symmetric by construction, crediting both sides' preferences about each other |
| An infinite-feeling feed that quietly recycles rejected profiles once a pool is exhausted trains people to mistake volume for possibility, the opposite of this product's premise (fourth external input) | Focus states plainly when a pool is exhausted and offers explicit, user-initiated choices instead of silently widening the funnel |
| A compatibility percentage implies false precision about something inherently uncertain (fourth external input) | No score is ever shown; only a short, factual list of what two people share |
| At capacity 2 or 3, an open slot by the numbers can still be unwanted right now, and forcing a capacity change to express that is a false choice (fifth external input) | `focus_now` is a separate, self-service toggle that closes the remaining slot without touching the capacity number itself |
| A rematch feature would contradict how Hinge and Tinder both treat unmatching as permanent (fifth external input) | Confirmed as already true by construction: the candidate query excludes anyone with any connections row, ended or active, permanently; stated explicitly rather than left implicit |
| Automatically revealing contact information, or making it a side effect of matching, ignores RAINN's guidance to withhold personal details until real trust exists, and Hinge's own warning about early off-platform pushes (fifth external input) | Contact sharing is a deliberate, one-directional, one-method-at-a-time action with an explicit warning; never automatic, never mutual by default |

---

## 14. Phased delivery

Each phase ends with the three review passes in section 12.

### Phase −1: Legal and technical prerequisites (gates Phase 2 only)

- Commission a freedom-to-operate review of the capacity and visibility mechanism (sections 2.2 and 7) against the Sidekick Dating patent family (US 11,895,115 and its pending continuation), covering the current design specifically: focused users removed from candidate pools, and every other pending like cleared the moment a user's last slot fills.
- This gates the start of Phase 2 specifically, because Phase 2 is where `private.available()`, `private._form_connection()`, `get_daily_feed()`, and the rest of the patent-adjacent mechanism get implemented. Phase 0 and Phase 1 do not touch capacity, matching, or visibility logic and may proceed in parallel with this review.
- Confirm the stack decisions in this document (Next.js 16, Supabase publishable/secret keys, Supabase Pro at $25/month, ephemeral staging branches, the 2-hour Supabase upload URL paired with a 5-minute application ticket) are still current before Phase 0 begins, since they were verified against live sources on 2026-09-09 and could drift before implementation starts.

### Phase 0: Project setup

- Create the Supabase project (cost confirmed at $25/month base). Configure Auth providers, Turnstile, SMTP for development, the GitHub branching integration for ephemeral PR previews, and the `private` schema, confirming it is absent from the exposed-schema configuration.
- Scaffold `Dating App/app` with Next.js 16, TypeScript, Tailwind, `@supabase/ssr`, zod, sharp. Add root `.gitignore`. Add `proxy.ts` with the header set from section 9.3, including the Turnstile-compatible CSP, from the start.
- Local stack running; CI skeleton green on an empty migration, including the expand/contract label check and the private-schema-unreachability test.
- Exit: `pnpm dev` shows a sign-in page with a working Turnstile widget; `supabase test db` runs zero tests successfully; a test PR produces a working ephemeral preview.

### Phase 1: Foundation

- Migrations (all expand): enums, `profiles`, `profile_sensitive`, `profile_private`, `profile_answers`, `profile_heritage`, `preferences`, `heritage_preferences`, `photos`, `verifications`, `upload_tickets`, `consent_events`, `admins`, `admin_audit`, `user_daily`. RLS for all. `private.is_admin()`, `private.is_admin_mfa()`, `private.normalize_key()`, `public.am_i_admin()`, `public.create_upload_ticket()`, `public.begin_upload()`, `public.process_upload()`, `public.record_consent()`, triggers for lengths and counts.
- Auth flows including admin TOTP enrollment, onboarding screens (with the two-tier append-only consent from section 8.1), the ticket-and-process upload pipeline, selfie capture, admin verification queue behind `is_admin_mfa`.
- Exit: a new user can complete onboarding and be approved by an aal2-enrolled admin; pgTAP covers every policy in this phase, including the `profile_sensitive` split, the admin MFA gate, and the private-schema unreachability test for every helper introduced so far.

### Phase 2: Core loop (gated by Phase −1)

- Migrations: `feed_items`, `likes`, `connections` (with `last_human_message_at`/`last_human_sender_id`, no `end_note`), `user_abuse_signals`, `blocks`; `private.available()`, `private.can_view_profile()`, `private.mutually_compatible()`, `private.reciprocal_score()`, `public.get_daily_feed()`, `public.feed_state()`, `public.decide_feed_item()`, `private._send_like()`, `private._form_connection()` (including the clear-on-focus step), `public.next_waiting_like()`, `public.respond_to_like()`, `public.set_capacity()`, `public.block_user()`, `public.pause_account()`, `public.unpause_account()`, `public.focus_now_on()`, `public.focus_now_off()`, `public.dont_show_again()`, expire and purge jobs. `profiles.paused_at` and `profiles.focus_now` are added here too, since both depend on the same status and availability machinery as the rest of this phase. `permanent_excludes` is added here alongside `dont_show_again()`.
- Screens: home (state machine over `feed_state()`), card, waiting list, connections list, capacity setting, and the paused-partner notice with its one-tap End Connection. No accountability or score display anywhere.
- Exit: two test users can connect; the focused-exclusion, symmetric-race, stale-feed-backfill, and clean-slate concurrency tests all pass; a paused user's existing connection stays visible and messageable to their partner, who is never blocked from ending it immediately; RLS and schema-unreachability tests for `likes` and `user_abuse_signals` pass.

### Phase 3: Chat and ending

- Migrations: `messages` (with `is_system`), `contact_share_events`, triggers, Realtime publication, `end_connection()`, `share_contact()`, inactivity job with human-message attribution.
- Screens: chat, the Share Contact flow with its explicit warning, end-connection sheet with note (delivered only as a message), faded state. No public accountability signal on cards, and no visible connection-progression level or badge anywhere (section 2.8).
- Exit: Playwright smoke passes end to end, including the fade-attribution test, a contact share landing only in the message stream with a matching metadata-only event row, and confirming no `end_note` persists anywhere but the message stream.

### Phase 4: Safety, privacy, launch readiness

- `reports` (with `severity` and `resolution`), `meeting_checkins`, `date_plans`, `report_user()` (including the safety-reason eligibility window and the automatic restriction effect), `record_meeting_checkin()`, `create_date_plan()`/`get_date_plan()`/`delete_date_plan()`, admin report review with severity-ordered queueing and the restricted-to-active-or-banned resolution, `request_account_deletion()`, purge routes across all three storage buckets, the ticket table, and expired date plans, Vercel Cron, `proxy.ts` header verification including the Turnstile CSP, PWA manifest and install prompt, privacy and terms pages, restore drill, production deploy.
- Screens: the End/Block/Report split from section 2.4 with severity-appropriate copy, the private post-meeting check-in with its separate "I felt unsafe" branch, the date-plan share-sheet flow and its single check-in prompt, and the plain link to emergency services and trusted-contact sharing that every "I need help" path leads to first.
- Exit: red-team checklist fully green on production configuration, including that a `high` or `critical` report actually blocks the reported account's outgoing messages within the same request and that an admin can resolve a restriction in either direction; a friend can install it on a phone and complete the loop, including sharing a date plan through their own phone's share sheet.

---

## 15. Decisions deferred

- The product name and domain.
- Production email provider (Supabase default SMTP is rate-limited to a few messages an hour and is fine only for development).
- Whether iOS Safari's PWA camera access is reliable enough for selfie capture, to be tested in Phase 1 on a real phone.
- Freedom-to-operate review of the Sidekick patent family, a hard Phase −1 gate; see section 14.
- Whether human selfie review remains sustainable past low thousands of users, and, if not, whether to introduce the single flat, universal fee described in section 1.
- A staging environment beyond ephemeral per-PR branches, if the team grows past one contributor.
- Whether `style-src 'unsafe-inline'` in the CSP can be tightened once the Tailwind build output is audited in the red-team pass.
- Whether a like cleared by the Focused transition should carry a distinct status value from one that naturally aged out at 30 days, for future internal analytics; currently both use `expired` and the distinction is not user-facing either way.
- In-app voice and video calling, so two people can talk before ever exchanging a phone number, the way Bumble's in-app calling works. Explicitly out of v1 scope by the fifth external input's own recommendation, not by oversight; Share Contact (section 2.8) covers v1's needs on its own.

---

## 16. Glossary

- **Capacity**: the number of active connections a user allows themselves, 1 to 3.
- **Connection**: a mutual match that has formed and is active. Occupies one slot for each member.
- **Slot**: capacity minus active connections. "Open slot" means at least one.
- **Available**: `active_connections(p) < capacity(p)`. Can appear as a candidate in others' feeds, in an already-shown feed on re-read, and can receive new likes.
- **Focused**: not available. Removed entirely from other users' candidate pools, including on re-read of an already-generated feed; cannot receive new likes; and, on the transition into this state, every other pending like involving the user, in either direction, is cleared rather than merely held.
- **Feed item**: one profile served to one user on one day, re-validated for availability every time it is read back, not only when it was generated.
- **Waiting list**: pending likes addressed to a user, surfaced one at a time, only from senders who are currently available, only when the user has an open slot.
- **Non-negotiables**: the fields a user can mark must-match.
- **Heritage**: self-written background, community, origin, language, and raised-in fields. Used in matching only when the user turns "Use heritage in who I'm shown" on.
- **Importance**: the weight a user gives a heritage rule: nice to have (1), important (3), or must (hard filter).
- **Faded**: a connection closed by the inactivity job after a nudge went unanswered, attributed internally to whichever party stopped sending human messages. The automatic backstop is 10 days total; manual ending has never had a waiting period.
- **End, Block, Report**: three distinct ways a connection or interaction can conclude, with three distinct guarantees. See section 2.4. End is ordinary and its note is optional. Block is permanent, silent, and mutual. Report is severity-tiered and can happen with or without a block, and for genuine safety concerns is not bound by the ordinary 30-day reportability window.
- **Paused**: a self-service state that removes a person from all new matching immediately without ending an existing connection; the partner in that connection is told plainly and can end it immediately, without waiting.
- **Restricted**: an automatic, provisional state triggered by a high or critical severity report, pending human review; blocks new matching and new outgoing messages everywhere, but does not itself end existing connections. Always resolves to either active or banned; never left standing.
- **Meeting check-in**: a private, one-sided record of whether either person wants to meet again after marking "We met," never visible to the other party, with a separate branch for feeling unsafe that leads to Block, Report, and emergency resources rather than ordinary breakup language.
- **Date plan**: a plan (location, time, expected end) a user shares through their own phone's share sheet, not through Focus; Focus never stores a third party's contact details.
- **Focus now**: a self-service toggle that closes a person's remaining capacity slot on their own terms, without changing their capacity number. Capacity is a ceiling; this is intent.
- **Focus Pick**: the single highest reciprocal-scoring candidate in a day's five, labeled as such; the other four are simply that day's introductions. Never accompanied by a percentage.
- **Reciprocal score**: an internal, symmetric measure of how much two people's own stated soft preferences point toward each other, used only for ordering and for generating a plain-language explanation; never shown to a user as a number.
- **Not for me / Don't show again / Block**: three different, non-overlapping ways a person can stop seeing someone. Not for me is an ordinary pass, never recycled automatically but possibly reconsidered much later if the person's profile changes materially. Don't show again is permanent and one-directional, for someone already known outside the app. Block is the safety action in section 2.4 and ends any active connection.
- **Share Contact**: the only way personal contact information moves between two people on Focus: deliberate, one method at a time, never mutual by default, with an explicit warning shown first.
- **aal2**: the Supabase Auth assurance level reached after a second factor (TOTP) is verified in the current session; required for all admin data access and actions.
- **private schema**: the Postgres schema holding every function a client must never call directly, kept off the project's exposed-schema list so the Data API cannot route to it regardless of grants.
- **Upload ticket**: an application-level row bounding a direct-to-storage upload to 5 minutes, independent of the underlying Supabase signed URL's own fixed 2-hour validity.

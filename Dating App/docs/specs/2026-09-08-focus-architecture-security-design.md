# Focus: Architecture and Security Design

**Codename:** focus (rename any time)
**Date:** 2026-09-08, revised 2026-09-09 after external review
**Status:** Draft for review. No code exists yet. This document is the gate before any code is written.
**Inputs:** `Dating App/research/2026-09-08-match-cap-competitor-research.md`, `Dating App/research/2026-09-08-intent-filters-diaspora-gaps.md`, and a full external review received 2026-09-09 (sixteen findings, all incorporated below; verified against current Vercel, Next.js, and Supabase documentation before being folded in).

---

## 0. Revision note (2026-09-09)

The 2026-09-08 draft was reviewed line by line. Sixteen findings came back, all substantive, and all are reflected in this revision:

1. Focused users were still accumulating a hidden backlog of new likes. **Fixed by mechanism, not by renaming**: see section 2.2 and 7.1. A focused profile is now removed from every other user's candidate pool, so no new like can reach them while they are focused. Only likes that arrived while they were still available can be waiting.
2. The patent question was scheduled before "public launch." It now gates the start of Phase 2 (the matching mechanism itself), not just launch. See section 14, Phase −1.
3. The 8 MB upload design would fail against Vercel's real 4.5 MB function payload limit. Redesigned around direct-to-storage signed uploads; see section 4.3 and 9.7.
4. Stack updated to Next.js 16 (middleware.ts renamed to proxy.ts in Next.js 16).
5. Supabase production cost corrected to $25 a month (Pro plan, includes a $10 compute credit covering one Micro instance), not $10.
6. Key names updated to Supabase's publishable/secret key model ahead of the anon/service_role deprecation.
7. Admin access now requires a second factor (aal2), not just a Google-linked account.
8. `seeking` moved out of the publicly-selectable `profiles` table into a function-mediated sensitive table, matching how faith, politics, and heritage were already handled.
9. The public accountability signal is removed. The underlying data stays, admin-only, as an abuse-detection input.
10. Inactivity attribution now ignores system messages and tracks who actually went quiet, for the admin-only signal in point 9.
11. Staging added, using ephemeral per-pull-request Supabase branches, before any external beta. Preview deployments no longer point at production.
12. Migrations follow an expand-then-contract discipline; only expand migrations run automatically on merge.
13. Genotype gets its own explicit, separate, off-by-default consent, decoupled from heritage.
14. The "no money ever" framing is split into a permanent commitment (money never changes who you can meet or how visible you are) and a v1 tactical decision (no subscriptions yet), so a future flat, universal fee remains compatible with the mission if verification costs demand it at scale.
15. The daily browse cap of 5 is explicitly labeled a starting hypothesis to be measured against dates and second dates, not fixed doctrine.

Everything else in the 2026-09-08 draft was confirmed sound and is carried forward unchanged: the database-as-referee principle, likes being unselectable by users, deterministic-lock concurrency handling, the negative-authorization test list, and Realtime over Postgres Changes for chat.

---

## 1. Purpose, goals, non-goals

### What this is

A dating web app where each person chooses how many people they can genuinely get to know at once (1, 2, or 3), sees a handful of pre-screened profiles a day, and stops appearing to anyone new the moment they have no open slot left. It exists to remove the illusion of options that makes people reject everyone and commit to no one. The category is intentional dating; the mechanism is that attention is finite and the product makes you choose where yours goes.

### Goals, in priority order

1. **Attention, not volume.** Every mechanic reduces parallel options: the capacity limit, the daily browse cap, full removal from discovery while focused, no like counts, no feed.
2. **Serious people first.** Non-negotiables (kids, faith and practice level, politics, habits) are free, set at onboarding, shown above photos, and enforced mutually before anyone appears in anyone's feed.
3. **Heritage on the user's terms.** Self-written background, community or tribe, origin, language, and raised-in fields. Heritage affects matching only when the user switches it on in settings, and then each rule carries an importance the user chose: nice to have, important, or must. The system never infers, ranks, or optimises on heritage by itself.
4. **Nothing to collect.** No validation loop: no like counter, no "who liked you," no posting, no social handles, no visible reputation score of any kind.
5. **Safety and privacy as design constraints.** Every rule above is enforced in the database, not the browser. Sensitive attributes (faith, ethnicity, genotype, who you want to meet, location) are minimised, access-controlled through functions rather than raw table access, and deletable.
6. **Accountability, held internally.** Connections end with a note. How people end connections is tracked to catch abuse and repeat ghosting; it is not displayed as a score, because a displayed score creates pressure to keep talking to someone rather than end things honestly.

### A permanent commitment versus a v1 decision

These are different promises and the document keeps them distinct:

- **Permanent:** money will never change who you are eligible to meet, how visible you are, your capacity choice, or which filters you can use. There is no version of this product with a paid tier that sees more people, gets more slots, or gets better placement.
- **v1 decision, not permanent:** there are no subscriptions, boosts, or fees of any kind at launch. If human selfie review or infrastructure costs become unsustainable at scale, the only monetisation compatible with the mission is a single flat fee that changes nothing about matching, visibility, or capacity for anyone who pays it. That decision is deferred; see section 15.

### Non-goals for v1

- Differential access of any kind tied to payment (see above; this is permanent, not just v1).
- A friends or community lane, events, or a social feed.
- AI matchmaking, AI conversation help, or personality tests.
- Video calls, voice notes, or photo messaging inside chat.
- Native iOS or Android apps.
- Automated selfie verification. A human reviews every selfie.
- Income, job, or education verification.
- A visible reputation, accountability, or "communicates respectfully" score of any kind (see revision note, point 9).

### Success measures (written before launch, none are engagement)

- Share of connections that reach a first date (self-reported in the closing note or a post-connection prompt in a later version).
- Share of connections ended with a note rather than faded.
- Pairs who close their accounts together.
- Zero unauthorised reads of another user's likes, messages, photos, or sensitive fields (verified by tests, not hoped for).

The daily browse cap of 5 and the 1/2/3 capacity ceiling are both starting hypotheses, chosen from the research rather than revealed truth. Both should be revisited against the funnel (profile shown → connection → real conversation → date → second date), never against time-on-app or session count.

---

## 2. Product summary

This section restates the product design so the architecture can be checked against it.

### 2.1 Onboarding

1. Sign in with a 6-digit email code or Google. No passwords exist anywhere in the system.
2. Age gate: date of birth, 18 and over. Under-18 attempts are refused and the attempt is logged without the date.
3. Consent, each versioned and each separately explicit: terms, privacy policy, sensitive data (faith, heritage, seeking, politics), and, only if the user opens that section, genotype data (see section 8.1).
4. Profile: first name, gender, who you want to meet, city, two to six photos with a face in the first, three prompt answers, occupation, education level, optional height.
5. Capacity: 1 (default), 2, or 3.
6. Non-negotiables, then optional heritage (off by default in matching, see section 2.3), then optional health section (genotype, off by default, its own consent).
7. Selfie with a randomly assigned pose. Human review. Profile is `pending_review` until approved, then `active`.

### 2.2 Daily loop, and the Available/Focused mechanism

Every profile has a computed attention state, not a stored one:

```
available(p) := active_connections(p) < capacity(p)
focused(p)   := not available(p)
```

- **Discovery** shows up to 5 profiles a day, one at a time, Like or Pass, no going back. Candidates are restricted to people who are currently `available`. **A focused person never appears in anyone's discovery feed, full stop.** This is the point of the mechanism: focus is not just a private state the user sees, it removes them from the matching pool entirely, so nobody's likes pile up against a person who has already stopped looking. There is no ranking between available and focused people because focused people are never candidates.
- **Waiting list.** When you have an open slot, people who liked you while they, and you, were both still available are shown one at a time before new discovery. Only likes from currently-`available` senders are ever surfaced; if someone who liked you has since filled their own capacity elsewhere, their like sits dormant and is never shown to you while they remain focused. You Like or Pass each surfaced item. There is no count and no list view.
- **Likes and forming a connection.** A like is silent. The other person never sees a count and there is no "who liked you" screen. If both people have liked each other and both are available at that instant, the app confirms and a connection forms immediately. If a like arrives for someone who has just become focused (a race: they were available when shown, focused by the time the like was processed), the like is declined with a plain message, not silently queued. Likes that go unanswered expire after 30 days.
- **When you're Focused,** discovery disappears for you too. No blur, no upsell, no queue count. Your home screen is your connection or connections. Your profile is not shown to anyone new, and nobody can send you a new like. Likes that reached you before you became focused still wait, one at a time, exactly as they would for an available person.
- **A connection** is a private text chat plus each other's full profile. It ends when either person taps End Connection and picks or writes a short closing note, which the other person sees. Ending frees both slots immediately, and each person becomes `available` again the instant their own count drops below their own capacity. If nobody has written for 14 days, both get a "still here?" prompt (a system message, which does not count toward the human-activity check in section 7.9), and after 3 more silent days with no human message from either side, the connection closes as faded.

**Why this design differs from the profile staying universally visible:** the 2026-09-08 draft kept a focused user's profile visible to everyone and only hid the discovery feed on the viewing side, which is also how the Sidekick patent's product description reads and was chosen partly as a way to keep some daylight from that patent's specific claim language (which requires making the at-limit user invisible and declining their outgoing likes). This revision instead removes focused users from candidate generation because it is the correct product fix for the backlog problem regardless of the patent. Whether this new mechanism sits closer to or further from the patent's claims is exactly the kind of question that belongs to counsel, not to this document. See section 14, Phase −1: the entire visibility mechanism in this section is provisional pending that review, and the review must happen before section 7's functions are implemented.

**Nothing to collect.** No like counts, no feed, no posting, no social handles, no visible score of any kind. Bios containing an Instagram handle or "add me on" are flagged for admin review.

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

---

## 3. Threat model

### 3.1 Assets, most sensitive first

1. **Sensitive attributes**: seeking (reveals orientation), faith and practice level, heritage fields, genotype, politics, coarse location.
2. **Private interactions**: likes (who liked whom), messages, closing notes, reports, blocks.
3. **Photos** including verification selfies, and the raw originals during the brief upload-processing window.
4. **Identity**: email, date of birth, Google account link.
5. **Integrity of the mechanic**: capacity limit, browse cap, mutual pre-screen, the available/focused candidate filter. If these can be bypassed the product is a worse Tinder.
6. **Admin capability**: approve, ban, read reports.
7. **Availability** of the service and of the data (backups).

### 3.2 Actors

| Actor | Motive | Capability |
|---|---|---|
| Anonymous attacker | Scrape profiles, enumerate users, abuse auth endpoints | Network access, scripts, disposable emails |
| Malicious registered user | See who liked them, exceed capacity, view profiles they were not served, harass, scam, stalk | Valid JWT, ability to call any RPC or REST endpoint directly, bypassing the UI |
| Harasser or stalker | Locate or persist contact with a specific person | Registered user, possibly multiple accounts |
| Romance scammer | Build trust, move off-platform, extract money | Fake photos, scripted conversation, many accounts |
| Scraper or competitor | Bulk-export profiles and photos | Registered accounts plus automation |
| Curious or compromised admin | Read private data beyond need, or an admin session left signed in without stepping up | Admin role, possibly without aal2 |
| Compromised dependency or build | Exfiltrate secrets or data from the server | Runs in the Vercel build or server runtime |
| Platform incident | Supabase or Vercel outage, key leak, backup loss | Outside our control, mitigated by configuration |

### 3.3 Attack surfaces

- Supabase REST (PostgREST) and RPC endpoints, reachable directly with a user JWT, regardless of what the UI shows.
- Supabase Realtime channels.
- Supabase Storage endpoints for the `incoming`, `photos`, and `verification` buckets, including the signed-upload-URL issuance path.
- Supabase Auth endpoints (email OTP, Google OAuth callback, MFA enrollment and challenge).
- Next.js server actions and route handlers (upload ticket issuance, upload processing, cron, admin).
- The browser: XSS through user-authored text (prompts, notes, messages, heritage values), clickjacking, leaked secrets in the bundle.
- The admin surface, including the aal2 step-up flow itself.
- The build and dependency chain.
- Staging: an ephemeral Supabase branch reachable from a Vercel preview URL, which is a lower-stakes but still real surface (synthetic data only, but the same code paths).

### 3.4 Top risks, ranked

1. **RLS or RPC gap that leaks likes, messages, or photos.** Mitigation: deny-by-default RLS on every table and bucket, all core writes through SECURITY DEFINER functions with explicit checks, pgTAP tests that assert the negative cases.
2. **Capacity, browse-cap, or available/focused bypass by calling functions directly or concurrently.** Mitigation: limits enforced inside functions with row locks; candidate queries filter on `available(target)` at read time, not at feed-generation time only; no client-side-only rule anywhere; concurrency tests.
3. **Profile viewing outside the served set (IDOR).** Mitigation: `can_view_profile()` is the single gate for profile rows and photo objects; it only returns true for self, admin, active connection partner, today's feed, or a surfaced waiting-list like from a currently-available sender.
4. **Sensitive attribute exposure through direct table access.** Mitigation: seeking, faith, politics, heritage, and genotype all live in owner-only tables (`profile_sensitive`, `profile_answers`, `profile_heritage`); matching reads them inside SECURITY DEFINER functions and returns only what the viewer is allowed to see; no bulk endpoints; no sensitive column is ever reachable through a raw `SELECT` on a table another user can query.
5. **Location precision.** Mitigation: coordinates rounded to about 1 km before storage; only a distance bucket is ever returned; city label is user-chosen.
6. **Harassment persisting across blocks or accounts.** Mitigation: blocks are permanent and bidirectional, end connections, purge feed items and likes; reports carry context; human review; ban is a status, not a deletion, so a banned email cannot re-enter.
7. **Account takeover.** Mitigation: no passwords; email OTP codes are short-lived and rate-limited; Google OAuth with PKCE; HttpOnly cookies; admin accounts additionally require aal2 (Supabase TOTP MFA), enforced in the database, not just assumed from the identity provider.
8. **Scraping.** Mitigation: 5 profiles a day per account, human verification before visibility, CAPTCHA on sign-up, no list endpoints, photos only through authenticated storage reads gated by `can_view_profile()`.
9. **XSS.** Mitigation: React escaping, no `dangerouslySetInnerHTML`, strict CSP with per-request nonces via `proxy.ts`, user text stored as plain text and length-limited.
10. **Secret leakage.** Mitigation: the secret key exists only in the server runtime env; the client bundle contains only the publishable key and project URL; CI checks the built bundle for both the `sb_secret_` prefix and the legacy string `service_role` as a defense-in-depth belt-and-braces check.
11. **Insider misuse.** Mitigation: admin actions only through audited functions that additionally require aal2; verification selfies deleted after decision; admins see reports and profiles, never messages except those attached to a report.
12. **Data loss.** Mitigation: Supabase daily backups on the paid project; migrations in git; restore procedure documented in section 10.
13. **A raw image upload exceeding a serverless function's body limit, or a decompression-bomb image.** Mitigation: uploads go direct-to-storage via a signed URL, never through a Vercel function body; the processing step enforces a sane maximum decoded pixel count before Sharp expands the image in memory.

### 3.5 Security principles that every later decision must honour

- **Deny by default.** No table, bucket, or function is reachable until a policy or grant says so.
- **The database is the referee.** Capacity, caps, compatibility, availability, and visibility are decided in Postgres. The UI is a rendering of what the database allows.
- **No counts, no lists, no scores.** No endpoint returns "how many liked you," "everyone who liked you," or any accountability or reputation number, however coarse.
- **Least data.** Store the coarse version when the precise one is not needed. Delete when the purpose ends, including raw upload bytes within minutes.
- **Symmetry.** Anything one user can see about another, the other could see about them under the same conditions.
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
   |            |                              +--> Route handlers: /api/upload/ticket (signed upload URL), /api/upload/process
   |            |                                    (server-side image pipeline), /api/cron/* (purge jobs, bearer secret)
   |            +--> Server-side Supabase client (user JWT via @supabase/ssr) for reads/writes under RLS
   +--> Client-side Supabase client (publishable key + user session) for Realtime subscriptions,
        direct-to-storage signed uploads, and storage reads
                v
Supabase project (hosted, single region)
   - Auth: email OTP, Google OAuth (PKCE), TOTP MFA for admins, Turnstile CAPTCHA on sign-up and sign-in
   - Postgres 17: tables, RLS, SECURITY DEFINER functions, pg_cron jobs
   - Realtime: postgres_changes on messages, RLS-filtered
   - Storage: private buckets `incoming`, `photos`, `verification`, policies gated by SQL functions
External
   - Google OAuth
   - Transactional email provider for OTP codes (Supabase default SMTP for development, custom SMTP for launch)
   - Cloudflare Turnstile
```

### 4.2 Trust boundaries

1. **Browser to Next.js server.** Untrusted input. Everything validated with zod schemas on the server before touching Supabase.
2. **Browser to Supabase Storage directly (signed upload URLs).** Untrusted bytes, but bounded: the URL is short-lived, scoped to one path, and the `incoming` bucket enforces a size ceiling and allowed MIME types at the bucket configuration level as a first filter.
3. **Next.js server to Supabase with the user JWT.** Trusted identity, untrusted intent. RLS and function checks apply exactly as if the browser called Supabase directly.
4. **Next.js server to Supabase with the secret key.** Fully trusted. Used only in: the upload-processing route (to read from `incoming` and write to `photos` or `verification`), the cron purge route, and nowhere else. Every use is listed in this document and grepped for in CI.
5. **Supabase internal.** pg_cron jobs run with database owner rights and are the only code that touches rows across users without a JWT.

### 4.3 Request flows

**Daily feed.** Client calls server action `getFeed()`. Server calls RPC `get_daily_feed()` with the user JWT. Function checks status and capacity, generates or returns today's `feed_items` (candidates restricted to `available(target)`), and returns card data (viewable columns only plus a distance bucket and photo paths). Client fetches photo bytes from Storage with its own JWT; the Storage policy calls `can_view_profile()`, which is true because a feed item exists for today.

**Like.** Client calls `decideFeedItem(itemId, 'like')`. Server calls RPC `decide_feed_item()`. Function verifies ownership and freshness of the item, re-checks `available(target)` (closing the race described in section 2.2), records the decision, and calls internal `_send_like()`, which either stores a pending like or forms a connection under lock. Client receives `liked`, `connected`, or `target_focused`. No other information is returned.

**Waiting list.** Client calls `nextWaiting()`. Server calls RPC `next_waiting_like()`. Function returns one like at a time, restricted to senders who are currently `available`, and stamps `surfaced_at`, which is what makes that person's profile and photos viewable to the recipient.

**Chat.** Client subscribes to Realtime `postgres_changes` on `messages` filtered by `connection_id`. Realtime enforces RLS with the user's JWT, so a user can only receive rows for connections they belong to. Sending is a server action that inserts under RLS; a trigger enforces membership, connection status, length, rate limits, and stamps `last_human_message_at` and `last_human_sender_id` on the connection (system messages do not touch these fields).

**Photo or selfie upload.**
1. Client calls server action `createUploadTicket(kind)`. Server generates a Supabase Storage signed upload URL for `incoming/{userId}/{uuid}`, TTL 5 minutes, and returns it.
2. Client uploads the raw file bytes directly to Supabase Storage using that URL. This never touches a Vercel function body, so Vercel's 4.5 MB function payload limit does not apply; the `incoming` bucket itself enforces a 15 MB ceiling and an image-only MIME allowlist as a first filter.
3. Client calls server action `processUpload(objectPath, kind, position?)`. Server, using the secret key: downloads the object from `incoming`; sniffs real file type from bytes (rejects non-images regardless of extension or declared MIME); decodes with `sharp` behind a maximum-decoded-pixel-count guard; strips all metadata including GPS; resizes to a maximum of 1600 px (1200 px for selfies) on the long edge; re-encodes as WebP; writes to `photos/{userId}/{photoId}.webp` or `verification/{userId}/{verificationId}.webp`; inserts or updates the corresponding row under the user's JWT (so RLS still governs the metadata row); deletes the `incoming` object immediately.
4. A cron job purges anything left in `incoming` older than one hour, as a safety net for a client that uploads but never calls step 3.

The original bytes are held only in the private `incoming` bucket for the seconds between upload and processing, then deleted. This is a materially different and more honest claim than "original bytes are never stored," and section 8.3 uses this exact wording.

**Admin.** `/admin` route group. Every request re-checks `is_admin_mfa()` server-side, which requires both admin-role membership and an aal2 session. Every mutation is an RPC that writes to `admin_audit` inside the same transaction.

---

## 5. Data model

All tables in schema `public` unless noted. `uuid` primary keys default to `gen_random_uuid()`. Timestamps are `timestamptz`. Every table has RLS enabled. Column lengths are enforced with CHECK constraints, not just in the app.

### 5.1 Enumerated types

```
profile_status:   onboarding | pending_review | active | paused | banned | deleted
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
report_reason:    fake | harassment | scam | underage | off_platform_push | inappropriate_content | other
report_status:    open | reviewed | actioned | dismissed
verification_decision: approved | rejected
consent_kind:     terms | privacy | sensitive_data | genotype_data
upload_kind:      photo | selfie
```

### 5.2 Tables

**profiles** (viewable columns only; one row per user; no sensitive attributes)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | equals `auth.users.id` |
| status | profile_status | default `onboarding` |
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

`seeking` deliberately does not live here; see `profile_sensitive` below. This corrects the 2026-09-08 draft, which placed it in `profiles` while every other sensitive field was already owner-only, an inconsistency flagged in review.

**profile_sensitive** (owner and functions only; no policy grants any other user a `SELECT`)

| Column | Type | Notes |
|---|---|---|
| profile_id | uuid PK FK | |
| seeking | seeking | |

A viewer never selects this table. `can_view_profile`-gated functions read it and return `seeking` only as part of a card, alongside the mutual gender/seeking check already performed server-side in `mutually_compatible()`.

**profile_private** (owner and functions only)

| Column | Type | Notes |
|---|---|---|
| profile_id | uuid PK FK | |
| birth_date | date | CHECK age at insert >= 18 |
| lat_coarse, lon_coarse | numeric(6,2) | rounded to 2 decimals (about 1 km) before storage; raw value never stored |
| age_min, age_max | smallint | own preference, CHECK 18..99, min <= max |
| max_distance_km | smallint | CHECK 5..500 |
| review_flags | jsonb | e.g. `{"social_handle": true}` set by trigger on prompt text |
| email_notifications | boolean | |

**profile_answers** (owner and functions only)

goal, kids, faith_label (text up to 40), faith_key (text, normalised), faith_practice, politics, smoking, drinking, timeline, relocate, income_band (nullable), health_section_enabled (boolean, default false), genotype (nullable, only when `health_section_enabled` and the `genotype_data` consent exists).

Viewable subset for others is served through functions, never by direct select. This was already correct in the 2026-09-08 draft; only `seeking` was the outlier, now fixed above.

**profile_heritage** (owner and functions only)

| Column | Type |
|---|---|
| profile_id | uuid FK |
| field | heritage_field |
| value | text, 1 to 40 chars, as typed |
| value_key | text, normalised: lowercase, trimmed, diacritics folded, internal whitespace collapsed |

PK `(profile_id, field, value_key)`. At most 5 values per field, enforced by trigger.

**preferences** (owner and functions only)

kids_must boolean, kids_accept kids[]; faith_key_must boolean, faith_key_accept text[]; practice_must boolean, practice_accept practice[]; politics_must boolean, politics_accept politics[]; smoking_must, smoking_accept habit[]; drinking_must, drinking_accept habit[]; genotype_must boolean, genotype_accept genotype[]; use_heritage boolean default false. A `must` with an empty accept array is rejected by CHECK.

**heritage_preferences** (owner and functions only)

`(profile_id, field)` PK, mode pref_mode, accept_keys text[] (normalised, up to 10). Empty accept_keys is rejected. Rows are ignored entirely by matching while `preferences.use_heritage` is false, so a user can switch heritage matching off and on without losing their rules.

**photos**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK | |
| position | smallint | CHECK 1..6, unique per profile |
| storage_path | text | `photos/{profile_id}/{id}.webp`, CHECK matches pattern |
| width, height | smallint | |
| created_at | timestamptz | |

Trigger: max 6 rows per profile; position 1 required before status can become `pending_review`.

**verifications**

id, profile_id, pose_code (text), selfie_path (text, nullable after decision), submitted_at, decided_at, decision (nullable), reviewer_id (FK admins), note (up to 300). Max 3 submissions per day per profile (trigger).

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

Unique `(from_user, to_user)`. Index `(to_user, status, created_at)`. There is no `mutual_waiting` flag in this revision: because a like can only ever be sent to someone who is currently `available` (section 2.2), by the time both people have liked each other, both were available at like-send time; the only remaining race is the one closed in `decide_feed_item()` and `respond_to_like()` by re-checking availability immediately before forming the connection.

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
| end_note | text | up to 300 chars, nullable |
| last_message_at | timestamptz | updated by every message, human or system |
| last_human_message_at | timestamptz | updated only by human-authored messages; system messages (nudges, end notes shown as system messages) never touch this |
| last_human_sender_id | uuid | who sent the last human message; used only to attribute a fade internally, never shown to users |
| nudge_sent_at | timestamptz | |

Partial unique index on `(user_a, user_b) WHERE status = 'active'`. Index on `(user_a, status)` and `(user_b, status)`.

**messages**

id bigint identity PK, connection_id FK, sender_id FK (nullable for system messages), is_system boolean default false, body text (1 to 2000 chars), created_at, deleted_at (nullable, for account-deletion anonymisation). Index `(connection_id, id)`. Trigger enforces: sender is a member for non-system messages, connection is active, rate limits, and updates `connections.last_message_at` always, `last_human_message_at`/`last_human_sender_id` only when `is_system = false`.

**blocks**

`(blocker_id, blocked_id)` PK, created_at. Never deleted by users.

**reports**

id, reporter_id, reported_id, connection_id (nullable), message_id (nullable), reason, details (up to 1000), created_at, status, reviewed_by, reviewed_at, action (text). Index on `(status, created_at)`.

**user_abuse_signals** (renamed from the 2026-09-08 draft's `user_stats`; admin and function access only, never user-selectable, not even the owner's own row)

profile_id PK, connections_ended int, connections_ended_with_note int, connections_faded_as_non_responder int (incremented only for the party identified by `last_human_sender_id` logic as the one who went quiet after the other's last human message, or for both if neither ever sent a human message), reports_received int, updated_at. Written only by functions and the inactivity job. Used exclusively to surface repeat-ghosting or abuse patterns to admins; never rendered to any user, and never contributes to matching or ordering. This directly replaces the public "accountability signal" removed in this revision.

**user_daily**

`(user_id, day)` PK, feed_served smallint, waiting_responses smallint, messages_sent int, reports_filed smallint, photo_uploads smallint, verification_submissions smallint. Written only by functions and triggers.

**consents**

`(profile_id, kind)` PK, version text, accepted_at. A profile cannot leave `onboarding` until `terms`, `privacy`, and `sensitive_data` all exist at their current versions. `genotype_data` is separate and only required if `health_section_enabled` is set true; it is never implied by the other three and never implied by any heritage answer.

**admins**

user_id PK, added_at, added_by. Seeded by migration with your user id after first sign-in. Only editable through SQL migration, never through the app.

**admin_mfa_status** (view, not a table)

A `SECURITY DEFINER` function `is_admin_mfa(uid uuid) returns boolean`, not a stored table: true when `is_admin(uid)` and the current request's JWT carries `aal = 'aal2'`. There is nothing to store; assurance level is a property of the current session, re-checked on every call.

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

---

## 6. Authorization model

### 6.1 Roles

- `anon`: can call nothing except Auth endpoints. No table or function grants.
- `authenticated`: every signed-in user. All access goes through RLS policies and granted functions.
- Admin: an `authenticated` user whose id is in `admins`. Checked by `is_admin(uid)` (STABLE, SECURITY DEFINER, reads `admins`) for identity, and `is_admin_mfa(uid)` (adds the aal2 check) for every actual access to admin data or functions.
- `service_role` / secret key: used only by the upload-processing route and the cron purge route. Never in the browser. Referred to throughout as "the secret key" per Supabase's current key model.

### 6.2 The single visibility gate

```sql
can_view_profile(viewer uuid, target uuid) returns boolean
```

True when any of the following holds, and the pair is not blocked in either direction:

1. `viewer = target`.
2. `is_admin_mfa(viewer)`.
3. An `active` connection exists between them.
4. A `feed_items` row exists with `user_id = viewer`, `target_id = target`, `served_on = current_date`.
5. A `likes` row exists with `from_user = target`, `to_user = viewer`, `status = 'pending'`, `surfaced_at IS NOT NULL`, not expired, and `available(target)` is true at read time (a like from someone who has since become focused elsewhere does not currently grant visibility, though the like itself is untouched and can surface again once they free up).

For cases 3 to 5 the target must have status `active`. Ended connections do not grant visibility after 30 days (messages are purged by then; profile viewing ends immediately at `ended_at`). The function is `STABLE`, `SECURITY DEFINER`, `SET search_path = public, pg_temp`, and is the only predicate used by the `profiles`, `photos`, and Storage `photos` bucket read policies.

Note the admin case now requires `is_admin_mfa`, not merely `is_admin`: an admin session that has not completed a second factor cannot view any profile beyond the generic public case, including through this gate.

### 6.3 Policies by table

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | `can_view_profile(auth.uid(), id)` | own row, id = auth.uid(), status must be `onboarding` | own row; `status`, `verified_at`, `age` cannot be changed by the user (trigger rejects) | none (deletion via function) |
| profile_sensitive | own row | own row | own row | none |
| profile_private | own row | own row | own row | none |
| profile_answers | own row | own row | own row | none |
| profile_heritage | own rows | own rows | own rows | own rows |
| preferences | own row | own row | own row | none |
| heritage_preferences | own rows | own rows | own rows | own rows |
| photos | `can_view_profile(auth.uid(), profile_id)` | none (function only, via the processing route inserting with the user JWT) | none | own rows |
| verifications | own rows or `is_admin_mfa` | own rows (via processing route) | none (admin via function) | none |
| feed_items | own rows (`user_id = auth.uid()`) | none (function) | none (function) | none |
| likes | **none for users.** Not even own outgoing likes. All access via functions. Admin: none. | none | none | none |
| connections | member (`auth.uid() IN (user_a, user_b)`) | none (function) | none (function) | none |
| messages | member of the connection | member, connection active, `sender_id = auth.uid()` for non-system rows (trigger enforces the rest) | none | none |
| blocks | own rows as blocker | own rows | none | none |
| reports | own rows as reporter (without `action` and reviewer fields) or `is_admin_mfa` | own rows | admin via function (requires aal2) | none |
| user_abuse_signals | `is_admin_mfa` only. Not even the profile owner. | none | none | none |
| user_daily | own row | none | none | none |
| consents | own rows | own rows | none | none |
| admins | `is_admin_mfa` only | none | none | none |
| admin_audit | `is_admin_mfa` only | none (function) | none | none |
| deletion_requests | own row | via function | none | none |

"None" means no policy exists, so the operation is denied for every role except the database owner used by functions and cron.

### 6.4 Storage policies

| Bucket | Read | Write | Delete |
|---|---|---|---|
| incoming (private) | secret key only (processing route) | owner, via a short-lived signed upload URL issued by the ticket route; bucket-level 15 MB size ceiling and image-only MIME allowlist | secret key (processing route, immediately after use; cron safety net after 1 hour) |
| photos (private) | `can_view_profile(auth.uid(), folder_owner)` | secret key only (processing route) | owner of folder, and secret key (account purge) |
| verification (private) | `is_admin_mfa` only | secret key only (processing route) | secret key (review function triggers deletion; also the account purge route) |

Object paths are validated against `^{uuid}/{uuid}\.webp$` for `photos` and `verification`; `incoming` paths are validated against `^{uuid}/{uuid}$` with no extension trusted. Public URL access is disabled on all three buckets.

### 6.5 Function grants

Every function in section 7 is created with `SECURITY DEFINER`, `SET search_path = public, pg_temp`, `REVOKE ALL ON FUNCTION ... FROM PUBLIC`, and `GRANT EXECUTE TO authenticated`. Internal helpers prefixed `_` are not granted to anyone and are callable only from other functions. Every exposed function starts with:

```sql
if auth.uid() is null then raise exception 'not_authenticated'; end if;
```

and admin functions additionally start with:

```sql
if not is_admin_mfa(auth.uid()) then raise exception 'forbidden'; end if;
```

then checks the caller's profile status where relevant.

---

## 7. Core loop functions

Each function lists preconditions, effects, invariants, concurrency handling, and the errors it raises. Error codes are short strings the UI maps to copy; no internal details leak.

### 7.1 `available(p uuid) returns boolean` (internal, STABLE)

`(select count(*) from connections where status = 'active' and (user_a = p or user_b = p)) < (select capacity from profiles where id = p)`.

This single function is the entire fix for the backlog problem raised in review: it is checked when building candidate pools (7.3), before sending a like (7.4 to 7.5), and before surfacing a waiting like (7.7). A focused profile fails this check everywhere it matters, so no new like can reach them and they never appear as a fresh candidate to anyone.

### 7.2 `mutually_compatible(a uuid, b uuid) returns boolean` (internal, STABLE)

True when all of the following hold. This function is intentionally about compatibility rules only; availability is a separate, additional filter applied by callers (see 7.3, 7.5, 7.7), so that a temporarily-focused person's compatibility rules are still evaluated correctly the moment they free up.

- Both profiles are `active`.
- No block in either direction.
- Gender and seeking match in both directions (`everyone` matches any gender).
- Each person's age is within the other's `age_min..age_max`.
- Distance between coarse coordinates is within both `max_distance_km`.
- For each of kids, faith_key, practice, politics, smoking, drinking, genotype: if A's `must` is set, B's answer is in A's accept list; and the same with roles reversed. A `must` on genotype against a person with the health section disabled fails.
- For each heritage field where A has `use_heritage = true` and mode `must`: at least one of B's `value_key`s for that field is in A's `accept_keys`; and reversed.

`nice_to_have` and `important` never affect compatibility, only ordering.

### 7.3 `preference_score(viewer uuid, target uuid) returns int` (internal, STABLE)

Zero when the viewer's `use_heritage` is false. Otherwise the weighted sum of the viewer's satisfied heritage rules: `important` counts 3, `nice_to_have` counts 1, `must` counts 0 because it already filtered. Used for ordering only.

### 7.4 `get_daily_feed() returns setof feed_card`

`feed_card` is a composite of viewable profile columns, photo paths, a distance bucket text (`under 5 km`, `5 to 15 km`, `15 to 50 km`, `over 50 km`), and the feed item id and decision. There is no attention-state or accountability field on the card: every candidate returned is, by construction, currently available, and there is nothing else to display about them beyond their profile.

- Preconditions: caller `active`; caller has an open slot (`available(caller)`). Otherwise returns an empty set and a reason code via a companion function `feed_state()` that returns `at_capacity`, `pending_review`, `waiting_list_pending`, or `ok`.
- If `feed_items` for today exist, return them with decisions. Otherwise, inside one transaction:
  1. Lock the caller's `user_daily` row for today (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING` with `FOR UPDATE`) so two concurrent calls cannot both generate.
  2. Candidates: `active` profiles `p` where `available(p)` and `mutually_compatible(caller, p)`, excluding: self; anyone with a `likes` row from the caller in the last 30 days (any status); anyone the caller passed in `feed_items` in the last 90 days; anyone with any `connections` row with the caller; anyone in `blocks` either way.
  3. Order by `preference_score(caller, p) DESC`, distance ASC, `random()`.
  4. Take 5. Insert `feed_items` with positions. Set `feed_served`.
- Invariants: at most 5 items per user per day; every item passes `mutually_compatible` and `available` at generation time.
- Errors: `not_active`, `at_capacity`.

The waiting list has priority: the UI calls `next_waiting_like()` first and only shows discovery when it returns nothing.

### 7.5 `decide_feed_item(item_id uuid, decision feed_decision) returns text`

- Preconditions: item belongs to caller, `served_on = current_date`, `decision = 'none'`, decision argument is `like` or `pass`.
- Effects: set decision and `decided_at`. If `like`: re-check `available(target)` (closes the generation-to-decision race); if now focused, return `target_focused` without creating a like row; otherwise call `_send_like(caller, target)` and return its outcome. If `pass`, return `passed`.
- Errors: `not_found`, `already_decided`, `stale_item`, `target_focused`.

### 7.6 `_send_like(from_user uuid, to_user uuid) returns text` (internal)

- Preconditions: `mutually_compatible(from, to)`; `available(to_user)`; no existing like from→to.
- If a `pending`, unexpired like exists to→from, and `available(from_user)` and `available(to_user)` both still hold: call `_form_connection(from, to)`; return its outcome (`connected`).
- Else insert like `(from, to, pending, expires_at = now() + 30 days)` and return `liked`.
- Invariant: a user never learns whether the other person had already liked them unless a connection forms.

### 7.7 `_form_connection(x uuid, y uuid) returns text` (internal)

1. Order the pair: `a = least(x, y)`, `b = greatest(x, y)`.
2. `SELECT ... FROM profiles WHERE id IN (a, b) ORDER BY id FOR UPDATE` (deterministic lock order prevents deadlocks).
3. Recount active connections for each under the lock and confirm both are still `available`. If not, raise `target_focused` (caller translates to a graceful message; this should be rare given the checks in 7.5 to 7.6, and exists as the final authority, not the only one).
4. Insert `connections (a, b, active)`, set both like rows to `connected`, return `connected`.
- Invariant: after commit, `active_connections(u) <= capacity(u)` for every user, enforced by the lock and the recount under it.

### 7.8 `next_waiting_like() returns feed_card`

- Preconditions: caller `active` and `available(caller)`.
- Select one `likes` row where `to_user = caller`, `status = 'pending'`, not expired, no block, `mutually_compatible(caller, from_user)` still true, `available(from_user)` still true, ordered by `created_at ASC`, `LIMIT 1 FOR UPDATE SKIP LOCKED`.
- Set `surfaced_at = now()` if null. Return the card for `from_user` (this is what makes their profile viewable).
- Returns nothing when the list is empty. Never returns a count.
- Rate: at most 20 `respond_to_like` calls per day; the surfacing itself is not limited because it returns the same row until answered.

### 7.9 `respond_to_like(like_id uuid, accept boolean) returns text`

- Preconditions: like `to_user = caller`, `pending`, `surfaced_at IS NOT NULL`, not expired.
- If not accept: `status = 'declined'`, `responded_at = now()`. The liker is never notified and never learns this. Return `passed`.
- If accept: increment `waiting_responses`; re-check `available(from_user)`; if still available, call `_form_connection(caller, from_user)` and return `connected`; if the sender has since become focused elsewhere, return `target_focused` and leave the like pending (it can surface again later if the sender frees up).
- Errors: `not_found`, `not_surfaced`, `expired`, `at_capacity`, `target_focused`, `daily_limit`.

### 7.10 `end_connection(connection_id uuid, note text) returns void`

- Preconditions: caller is a member; status `active`; `note` trimmed length between 1 and 300, or one of the preset codes (`not_a_fit`, `met_someone`, `taking_a_break`, `no_spark`) which expand to fixed copy.
- Effects: status `ended`, `ended_at`, `ended_by = caller`, `end_reason = ended_by_user`, `end_note`. Increment caller's `connections_ended` and `connections_ended_with_note` in `user_abuse_signals` (admin-only signal, never shown to either user). Insert a system message (`is_system = true`, does not update `last_human_message_at`) in the chat with the note so the other person sees it in context. Both users become `available` again immediately if their count drops below their capacity.
- The ended connection stays readable by both members for 30 days (profile view ends immediately; chat history stays), then messages are purged.

### 7.11 `set_capacity(n smallint) returns void`

- Preconditions: 1..3.
- Effects: update `capacity`. No connection is ever ended by this. If new capacity < active count, `available(caller)` is false until the count drops, exactly as the general definition already implies.

### 7.12 `block_user(target uuid) returns void`

- Insert into `blocks`. End any active connection between them with `end_reason = blocked`, no note, no `user_abuse_signals` change for the blocker. Set every like between them to `declined`. Delete feed items between them. The blocked person sees the connection as "ended" with no note and cannot tell it was a block.

### 7.13 `report_user(target uuid, reason report_reason, details text, connection_id uuid, message_id uuid) returns void`

- Preconditions: target is or was viewable to the caller (connection, feed, or surfaced like, including within the last 30 days). Max 10 per day.
- Effects: insert report; increment target's `reports_received` in `user_abuse_signals`. Reports do not block; the UI offers Block alongside Report.

### 7.14 `request_account_deletion() returns void`

- Immediate effects: status `deleted`; end all active connections with `end_reason = account_deleted` (partner sees "This person left the app"); decline all likes both ways; delete feed items; anonymise `messages.sender_id` display via a `deleted_at` on the profile (the partner still sees the conversation for 30 days with "Deleted user"); insert `deletion_requests` with `purge_after = now() + 7 days`.
- Deferred purge (section 10): delete Storage objects (across all three buckets for this user), then all rows for the user across every table except `reports` where the user is `reported_id` (kept, with the reporter's id, for 12 months for safety and legal reasons) and `admin_audit`.

### 7.15 Admin functions

`admin_review_verification(id, decision, note)`, `admin_review_report(id, status, action, note)`, `admin_ban_user(profile_id, reason)`, `admin_reinstate_user(profile_id, reason)`. Each: `is_admin_mfa(auth.uid())` or `forbidden`; write `admin_audit` first; then act. Ban: status `banned`, end connections with `end_reason = banned`, decline likes, delete feed items. Banned users remain in `auth.users` so the email cannot register again; sign-in succeeds but every screen shows the ban notice.

### 7.16 Scheduled jobs (pg_cron unless noted)

| Job | Schedule | Effect |
|---|---|---|
| expire_likes | hourly | `pending` likes past `expires_at` become `expired` |
| refresh_ages | daily 03:00 | recompute `profiles.age` from `birth_date` |
| connection_inactivity | daily 04:00 | active connections where `last_human_message_at` (or `created_at` if never set) is more than 14 days ago and `nudge_sent_at` is null: insert a system "Still here?" message and set `nudge_sent_at` (this does not touch `last_human_message_at`). Those with `nudge_sent_at` older than 3 days and still no human message since: end with `faded`; increment `connections_faded_as_non_responder` in `user_abuse_signals` for whichever party is not `last_human_sender_id` (or for both if `last_human_sender_id` is null, meaning neither ever sent a human message) |
| purge_feed_items | daily | delete `feed_items` older than 30 days |
| purge_ended_messages | daily | delete messages of connections ended more than 30 days ago that have no open report |
| purge_incoming | hourly | delete anything in the `incoming` bucket older than 1 hour (safety net for interrupted uploads) |
| purge_deleted_accounts | daily, via Vercel Cron calling `/api/cron/purge` with a bearer secret | for each `deletion_requests` past `purge_after`: delete Storage objects across all buckets with the secret key, then call `_purge_user(profile_id)` |
| purge_verification_selfies | daily, same route | delete Storage objects for verifications decided more than 1 day ago and null `selfie_path` |

---

## 8. Privacy and data protection

### 8.1 Sensitive categories

Seeking, faith, heritage, genotype, and politics are special-category data under GDPR-style regimes and treated that way regardless of jurisdiction:

- Collected only with explicit, versioned consent, in two tiers: `sensitive_data` (seeking, faith, heritage, politics) is required to leave onboarding; `genotype_data` is entirely separate, required only if the user opens the health section, and is never implied by heritage answers or by the general sensitive-data consent. Washington's My Health My Data Act and GDPR-style regimes both treat genetic data as its own protected category, and the consent model reflects that split rather than bundling it in.
- Stored in owner-only tables (`profile_sensitive`, `profile_answers`, `profile_heritage`). Other users never select them directly; they receive only the derived compatibility result and the display-only fields the user marked viewable, through a function.
- Never used for ranking except the user's own `nice_to_have`/`important` heritage rules.
- Deleted with the account, and individually clearable at any time. The health section can be turned off independently, which stops genotype from being used in matching immediately, without needing to delete the account.

### 8.2 Location

- The browser geolocation result, or a geocoded city, is rounded to two decimal places before it is sent to the server. The server rounds again. Raw values are never persisted or logged.
- Others see only a distance bucket and the user's typed city label.
- No "last active near" or map features.

### 8.3 Photos

- The original uploaded bytes are held in the private `incoming` bucket only for the seconds between upload and processing, then deleted; a cron job removes anything left behind within an hour as a safety net. This replaces the earlier, less accurate claim that originals are "never stored."
- Processing strips EXIF, including GPS and device data, before the processed copy is written to `photos` or `verification`.
- Buckets are private. Reads require a JWT and pass through `can_view_profile()`. There is no public URL.
- Verification selfies are readable by admins with an aal2 session only and deleted within a day of the decision. The decision, reviewer, and timestamp are kept.
- Screenshots cannot be prevented on the web. The privacy policy says so plainly.

### 8.4 Messages and notes

- Readable only by the two members and, for a specific reported message, by an admin reviewing that report.
- Purged 30 days after a connection ends unless a report references the connection.
- Closing notes are part of the message stream (as a system message) and follow the same rules.

### 8.5 Retention schedule

| Data | Kept until |
|---|---|
| Feed items | 30 days |
| Pending likes | 30 days, then `expired`; expired and declined rows purged after 90 days |
| Messages of ended connections | 30 days after end, unless reported |
| Raw upload originals (`incoming` bucket) | Seconds, deleted immediately after processing; 1 hour hard ceiling via cron |
| Verification selfies | 1 day after decision |
| Reports | 12 months after review |
| Admin audit | indefinitely (no personal content, ids only) |
| Deleted accounts | purged 7 days after request |
| Everything else | life of the account |

### 8.6 What admins can see

Profiles (viewable columns), verification selfies during review, reports with the reported message if one is attached, user status, `user_abuse_signals` for pattern detection, and audit history, all gated behind `is_admin_mfa`. Admins cannot read likes, cannot read chats except a reported message, and cannot see sensitive-category answers unless a report requires it (and then only through a function that logs the access).

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
- **Admin accounts require both a linked Google provider and an enrolled TOTP factor.** Google sign-in alone is not treated as sufficient, because a Google login does not guarantee that account has its own 2FA enabled. On first admin sign-in without an enrolled factor, every admin screen shows only "Set up two-factor authentication to continue" with Supabase's TOTP enrollment flow; nothing admin-shaped is reachable until the session reports `aal = 'aal2'`. `is_admin_mfa()` is the single check used everywhere in sections 6 and 7 for admin access; plain `is_admin()` is used only internally where an aal2 check would be redundant (e.g., inside a function already gated by `is_admin_mfa` at its entry).
- Sign-out revokes the refresh token server-side.
- Email change requires confirmation from both old and new addresses (Supabase "secure email change").

### 9.2 Input validation

- Every server action and route handler validates input with a zod schema. Unknown keys are stripped. Strings are trimmed and length-limited to the same limits the database enforces.
- The database is the last line: CHECK constraints on lengths and ranges, enums for categorical fields, triggers for cross-row rules (photo count, heritage value count, prompt shape).
- Heritage values and faith labels are normalised with a single SQL function `normalize_key(text)` used everywhere, so "Yorùbá", "yoruba", and "YORUBA " match.
- User text is rendered as text. No markdown, no HTML, no link unfurling in v1. URLs in messages are shown as plain text, not anchors.

### 9.3 Browser hardening

Headers set in `proxy.ts` (Next.js 16's replacement for `middleware.ts`; same runtime concept, renamed because "middleware" was routinely confused with Express-style middleware when it is really a boundary in front of the app) for every response:

- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'nonce-{per-request}'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://{project}.supabase.co; connect-src 'self' https://{project}.supabase.co wss://{project}.supabase.co https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(self), geolocation=(self), microphone=(), payment=()`
- `style-src 'unsafe-inline'` is a known compromise for Tailwind-generated inline styles in Next.js and is revisited in the red-team pass.
- A per-request nonce forces dynamic rendering on every page that uses it, which is a real performance cost against Next.js's static and partial-prerendering paths. This trade-off is accepted deliberately for the CSP protection it buys; it is not an oversight, and it is a candidate for reconsideration if a specific page's dynamic-rendering cost turns out to matter (a marketing or terms page with no user data could reasonably drop the nonce and use a stricter static CSP instead).

### 9.4 Rate limits

Enforced in the database unless stated, because the database cannot be bypassed.

| Action | Limit | Where |
|---|---|---|
| Feed generation | 5 profiles per day | `get_daily_feed()` |
| Waiting-list responses | 20 per day | `respond_to_like()` |
| Messages | 30 per minute per connection, 500 per day | trigger on `messages` |
| Reports | 10 per day | `report_user()` |
| Photo/selfie uploads | 20 per day, 15 MB each at the `incoming` bucket ceiling | upload ticket route plus `user_daily` |
| Verification submissions | 3 per day | trigger on `verifications` |
| Profile edits | 60 per hour | trigger on `profiles` |
| OTP requests | Supabase defaults (per email and per IP) plus Turnstile | Supabase Auth |
| Any server action | 120 per minute per user | in-memory token bucket in the Next.js server as a first filter; not relied on |

### 9.5 Abuse controls

- **Fake profiles:** human selfie review before visibility; at least two photos; a face required in the first (checked by the reviewer, not by software, in v1).
- **Off-platform pushing and social handles:** a trigger scans prompts and messages for `@handle` patterns, "instagram", "ig", "snap", "whatsapp", "telegram", phone-number shapes, and payment app names. Prompts with hits set `review_flags.social_handle` and the profile is held for review. Messages with hits are delivered but the count is visible to the admin on the reporter's report. Nothing is silently dropped.
- **Duplicate accounts:** one account per email; Google accounts are their own email. Nothing stronger in v1, by choice: device fingerprinting is a privacy cost the product does not want to pay.
- **Scraping:** 5 profiles a day, no list endpoints, no public photo URLs, human verification, CAPTCHA on sign-up.
- **Harassment:** block is permanent and invisible to the blocked person; reports carry the exact message; ban keeps the email out.
- **Underage:** date of birth with server-side age check; `underage` report reason routes to immediate ban on confirmation.
- **Romance scam patterns:** reason `scam` on reports; `user_abuse_signals.reports_received` gives admins a repeat-offender view across all time, without exposing any number to users.

### 9.6 Admin surface

- `/admin` is a route group with a server-side `is_admin_mfa()` check in its layout and again in every action. There is no client-only gate, and no path that treats a Google-linked, non-MFA session as sufficient.
- Admin pages render lists of verifications, reports, and `user_abuse_signals` flags only. Profile detail is the same viewable card users see, plus status and report history.
- All mutations are RPCs that write `admin_audit` in the same transaction.
- No admin function can read `likes` or arbitrary `messages`.

### 9.7 Secrets

| Secret | Lives in | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env, `.env.local` | browser and server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel env, `.env.local` | browser and server (public by design; RLS is the protection; replaces the legacy anon key ahead of Supabase's deprecation) |
| `SUPABASE_SECRET_KEY` | Vercel env (server only), `.env.local` | upload-processing route, cron purge route (replaces the legacy service_role key; can be revoked and rotated in seconds without invalidating every user's session, unlike the old key) |
| `CRON_SECRET` | Vercel env | cron route bearer check |
| `TURNSTILE_SECRET_KEY` | Supabase Auth settings | Supabase |
| Google OAuth client id and secret | Supabase Auth settings | Supabase |
| SMTP credentials | Supabase Auth settings | Supabase |

`.env*` is gitignored. `.env.example` lists names only. CI fails if the built client bundle contains the `sb_secret_` prefix or the legacy string `service_role` (checked as a belt-and-braces measure even though the project is built on the new key model from day one). Rotation: any suspected leak rotates the key in the Supabase dashboard and redeploys; documented in section 10.

### 9.8 Dependencies and build

- Runtime dependencies kept to: `next` (16.x), `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `sharp`. UI components are copied into the repo (shadcn style), not installed as a runtime package.
- `pnpm-lock.yaml` committed. `pnpm install --frozen-lockfile` in CI. Lifecycle scripts disabled (pnpm default).
- Dependabot weekly. `pnpm audit --prod` in CI, failing on high or critical.
- Vercel deploys from the `main` branch only, from the `Dating App/app` root directory. Pull request preview deployments point at an ephemeral, per-PR Supabase branch (section 10.1), never at the production project.

### 9.9 Error handling

- Functions raise short codes. Server actions map codes to user copy and log the code with the user id. Unexpected errors return `unexpected` to the client and the full error to the server log.
- No error path ever reveals whether a specific email is registered, whether a specific person liked you, whether a profile id exists, or a person's current available/focused state beyond what the product intentionally shows.

---

## 10. Availability and operations

### 10.1 Environments

| Environment | Database | App | Purpose |
|---|---|---|---|
| Local | Supabase CLI local stack in Docker (`npx supabase start`) | `pnpm dev` | all development and tests |
| Staging (per pull request) | Ephemeral Supabase branch, created automatically by the Supabase GitHub integration when a PR opens, migrations applied automatically, destroyed when the PR closes or merges. Billed hourly at $0.01344/hour (about $0.32/day) only while the PR is open; confirmed against the live Supabase cost API for this organisation on 2026-09-09. | Vercel preview deployment for that PR, configured with that branch's URL and publishable key | UI and integration review with synthetic data only; never touches production data |
| Production | Hosted Supabase project, Pro plan: $25/month base, which includes a $10/month compute credit covering one Micro instance, so the expected steady-state bill is $25/month at this scale; confirmed against the live Supabase cost API for this organisation on 2026-09-09 | Vercel production from `main` | real users |

This replaces the 2026-09-08 draft's plan to point preview deployments at production "for UI only," which review correctly identified as a real risk: a preview build's mistake can mutate real data regardless of intent. Staging exists from before the first external beta, not after the app is successful enough to deserve one.

### 10.2 Migrations

Every migration is written as either **expand** or **contract**, and the two follow different rules:

- **Expand** migrations are additive and backward-compatible: new tables, new nullable or defaulted columns, new functions, new indexes. They are safe for the previous application version to run against unmodified. Expand migrations, and only expand migrations, run automatically: applied to a PR's ephemeral branch on open, and to production via CI on merge to `main`, immediately followed by the Vercel deploy that depends on them.
- **Contract** migrations are destructive or narrowing: dropping or renaming a column or table, tightening a constraint, removing a function. They are never run automatically. A contract migration is written as its own pull request, labelled as such in the migration filename, and is applied to production manually, by a maintainer, only after confirming the application version that depended on the old shape is no longer live in Vercel's deployment history and the replacement has been stable for at least one full day. CI refuses to merge a PR that mixes a contract migration with application code in the same change.

This directly avoids the failure mode raised in review: migration succeeds, the paired Vercel deploy fails or lags, and the previous application version runs against a schema it cannot handle. With expand-only automatic migrations, the previous version keeps working against the expanded schema by construction, so the two deploys are no longer required to land within the same instant.

- Seed data for local development lives in `supabase/seed.sql` and never contains real people.

### 10.3 Backups and restore

- Hosted project: Supabase daily backups (7-day retention on the Pro tier). Point-in-time recovery is a paid add-on and is not enabled in v1.
- Restore drill: once before launch, restore the latest backup into a fresh local stack and run the test suite against it. Document the steps in `docs/runbooks/restore.md`.
- Storage objects are not in database backups. Photos are re-uploadable by users; the app tolerates a missing object by showing a placeholder.

### 10.4 Monitoring

- Vercel: deployment status and function errors.
- Supabase: weekly review of the security and performance advisors through the dashboard or MCP; alert email on high CPU or disk.
- A daily cron route logs a one-line health summary: active profiles, active connections, open reports, pending verifications. No personal data.

### 10.5 Incident basics

- Suspected key leak: rotate in Supabase, update Vercel env, redeploy, review audit and logs, note in `docs/runbooks/incidents.md`. The new secret-key model makes this materially faster than the old service_role key, since a secret key can be revoked without invalidating every signed-in user's session.
- Suspected data exposure: pause sign-ups (feature flag in `app_settings` table), assess with the advisors and logs, fix, notify affected users by email with plain language, document.

---

## 11. Testing strategy

### 11.1 Database tests (pgTAP, run by `supabase test db`)

For every table: a signed-in user can read and write exactly what section 6.3 allows and nothing else. Specifically:

- User A cannot select any row from `likes`, including their own outgoing likes.
- User A cannot select B's `profile_sensitive`, `profile_answers`, `profile_private`, `profile_heritage`, `preferences`, or `user_abuse_signals`, even A's own row of the last one.
- User A cannot select B's `profiles` row or `photos` unless one of the five `can_view_profile` conditions holds; each condition has a positive and a negative test, including the specific case of a pending like from a sender who has since become focused (must not grant visibility).
- User A cannot insert into `feed_items`, `likes`, `connections`, or `user_abuse_signals`.
- User A cannot update `profiles.status`, `verified_at`, or `capacity` outside `set_capacity()`.
- A non-admin cannot execute any `admin_*` function; an admin without an aal2 session cannot execute any `admin_*` function or select `admins`, `admin_audit`, or `user_abuse_signals`; the same admin, after completing TOTP enrollment and a challenge in the test harness, can.
- Storage policies: A can read B's photo only under `can_view_profile`; nobody but an aal2 admin can read `verification` objects; nobody but the secret key can read `incoming` objects.

### 11.2 Function and invariant tests (Vitest against the local stack, using real JWTs for several test users)

- Capacity: with capacity 1, a user who is in a connection gets `at_capacity` from `feed_state()` and an empty feed; `respond_to_like` and `decide_feed_item` raise `target_focused` when relevant.
- **Focused users are excluded from candidate generation, not merely reordered.** With capacity 1, user A in an active connection: confirm A never appears in `get_daily_feed()` for any other user, and confirm that a like sent toward A by a third party through direct RPC calls with a stale feed reference is rejected with `target_focused` rather than silently queued.
- Concurrency: 20 parallel `respond_to_like` calls from different likers against one user with capacity 1 produce exactly one `connected` and 19 `target_focused`; the recount trigger never fires more than once.
- Mutual pre-screen: a user whose `kids_must` excludes `dont_want` never sees a `dont_want` profile, and that profile never sees them either.
- Heritage: with `use_heritage` on, `must` with keys `['yoruba']` matches a profile whose community values include "Yorùbá"; `important` outranks `nice_to_have` in feed order but neither changes membership; with `use_heritage` off, the same rules have no effect on either.
- Waiting list: likes are surfaced one at a time, oldest first; a like from a sender who has since become focused is skipped and does not surface until that sender frees up or the like expires; declined likes never resurface.
- Browse cap: the sixth candidate is never served; calling `get_daily_feed()` twice returns the same five.
- End connection: frees both slots (confirmed by the freed party immediately appearing in a third party's feed within the same test); note appears as a system message; `user_abuse_signals` updates for the ender only, and is confirmed unreadable by either user via a direct select.
- Inactivity attribution: a connection where A sends the last human message and B never replies, after the nudge and fade window, increments `connections_faded_as_non_responder` for B only; a system nudge message does not reset `last_human_message_at`.
- Block: ends the connection with no note, purges feed items and likes, and `can_view_profile` becomes false both ways.
- Deletion: after `request_account_deletion()` plus the purge job, no rows remain for the user except retained reports and audit, and Storage is empty for that folder across all three buckets.
- Upload pipeline: a file uploaded via a signed URL larger than the `incoming` bucket ceiling is rejected before it reaches the processing route; a non-image file with an image extension is rejected by byte-sniffing; a successfully processed image leaves no object behind in `incoming`; an interrupted upload (ticket issued, never processed) is removed by the hourly safety-net job within its window.

### 11.3 Application tests

- Server actions: zod rejection of oversize and malformed input; error codes never contain SQL.
- Upload routes: the ticket route never accepts a `kind` outside `photo`/`selfie`; the processing route rejects non-images by byte sniffing, rejects a decoded pixel count above the sanity ceiling before full decode, strips EXIF (assert no GPS tag in output), and writes to the correct path only.
- Playwright smoke: sign up with OTP (local inbucket), complete onboarding, get approved via the admin page (as an aal2-enrolled test admin), see a feed, like, form a connection with a second test user, chat over Realtime, end with a note, verify slot freed and the ended party immediately eligible to appear in a fresh feed.
- Headers: a test fetches `/` and asserts every header in section 9.3, including the presence of a fresh nonce on each request.
- Bundle check: the client build contains no `sb_secret_`-prefixed string and no server-only env names.

### 11.4 Continuous integration (GitHub Actions on every pull request)

1. `pnpm install --frozen-lockfile`
2. `pnpm lint` and `pnpm typecheck`
3. `supabase start`, apply migrations, `supabase test db`
4. `pnpm test` (Vitest)
5. `pnpm build`, bundle secret check
6. Playwright smoke against the local build
7. `pnpm audit --prod`
8. Verify the PR contains no migration file tagged `contract` alongside application code changes (see section 10.2)

Merge to `main` additionally runs `supabase db push` (expand migrations only) to production and lets Vercel deploy. A contract migration merge is a separate, manually-triggered production step, never part of this automatic path.

---

## 12. Review process (standing order)

Every phase in section 14 ends with three passes, in this order, before the next phase starts.

### 12.1 Code review

Ordinary review for correctness, clarity, and adherence to this document. Any deviation from the spec is either fixed or written back into the spec with a reason.

### 12.2 Red-team pass

Adversarial, performed against the running local stack with raw HTTP calls and SQL, not through the UI. Checklist, extended as the code grows:

- Call every RPC with another user's ids, stale ids, and random uuids.
- Select from every table as a normal user; attempt to read likes, others' answers, others' sensitive fields, others' photos, verification selfies, and `user_abuse_signals` for any profile including your own.
- Hit `get_daily_feed()` and `respond_to_like()` in parallel from many sessions; assert capacity, caps, and the available/focused candidate exclusion all hold.
- Attempt to like a target through a replayed or forged feed-item id after that target has become focused; confirm `target_focused` and no queued state results.
- Fetch Storage objects by guessed path in all three buckets with a valid JWT.
- Subscribe to Realtime on a connection you are not in.
- Submit prompts and messages containing script tags, long unicode, right-to-left overrides, and social handles; verify rendering and flagging.
- Attempt admin routes and admin RPCs as a normal user, and as an admin whose Google account is linked but has not completed TOTP enrollment; confirm both are refused identically to a non-admin.
- Search the client bundle and network responses for secrets, emails, coordinates, and birth dates.
- Request deletion and verify the purge is complete, including all three Storage buckets.
- Review Supabase security advisors and fix every finding.
- Try to learn whether a specific person liked you, or whether a specific person is currently focused, through timing, error messages, or state differences beyond what the product intentionally reveals.
- Attempt to upload an image crafted to decompress to a very large pixel count (a decompression bomb) and confirm the guard rejects it before full decode.

Findings are fixed before the sane-mode pass.

### 12.3 Sane-mode pass

Sober review against section 1:

- Does every screen serve attention over volume? Is anything counting, listing, scoring, or nudging toward more?
- Is any feature present that a serious 34-year-old would not understand in five seconds?
- What can be removed? Remove it.
- Do the non-negotiable and heritage flows work for a Haitian, a Yoruba, a Gujarati, and a fourth-generation American, with the same fields?
- Are the copy and error messages calm and plain?
- Is the code smaller than it was before the red-team fixes, or has security work added complexity that can be simplified?
- Does anything in this phase quietly reintroduce a visible count, list, or score that section 1 rules out?

---

## 13. Goals cross-check

| Research finding | Design decision |
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
| Ghosting and "ghostlighting" (66.5%, BLK) | End-with-a-note, fade detection attributed to whoever actually stopped replying; held as an internal abuse signal, never a public score, because a public score would pressure people into staying in bad conversations |
| Sidekick patent claims require hiding the profile and refusing likes at the limit | The available/focused mechanism removes focused users from candidate pools entirely, decided for product reasons independent of the patent; whether this reading is closer to or further from the claims is a Phase −1 legal question, not an assumption baked into the architecture |
| Hinge Your Turn Limits raised responsiveness 20% | Waiting list must be answered before new discovery |
| Diaspora apps bundle dating with community, and community is where the pool comes from | No community lane in v1; launch inside an existing community |
| A hidden backlog of admirers undermines the "no illusion of options" premise (external review, 2026-09-09) | Focused users are removed from every other user's candidate pool; only pre-existing likes from senders who were available at send time can ever surface |

---

## 14. Phased delivery

Each phase ends with the three review passes in section 12.

### Phase −1: Legal and technical prerequisites (gates Phase 2 only)

- Commission a freedom-to-operate review of the capacity and visibility mechanism (sections 2.2 and 7) against the Sidekick Dating patent family (US 11,895,115 and its pending continuation), covering the specific available/focused design in this revision, not the 2026-09-08 draft's design.
- This gates the start of Phase 2 specifically, because Phase 2 is where `available()`, `_form_connection()`, `get_daily_feed()`, and the rest of the patent-adjacent mechanism get implemented. Phase 0 and Phase 1 do not touch capacity, matching, or visibility logic and may proceed in parallel with this review.
- Confirm the stack decisions in this document (Next.js 16, Supabase publishable/secret keys, Supabase Pro at $25/month, ephemeral staging branches) are still current before Phase 0 begins, since they were verified against live sources on 2026-09-09 and could drift before implementation starts.

### Phase 0: Project setup

- Create the Supabase project (cost confirmed at $25/month base). Configure Auth providers, Turnstile, SMTP for development, and the GitHub branching integration for ephemeral PR previews.
- Scaffold `Dating App/app` with Next.js 16, TypeScript, Tailwind, `@supabase/ssr`, zod, sharp. Add root `.gitignore`. Add `proxy.ts` with the header set from section 9.3 from the start.
- Local stack running; CI skeleton green on an empty migration, including the expand/contract label check.
- Exit: `pnpm dev` shows a sign-in page; `supabase test db` runs zero tests successfully; a test PR produces a working ephemeral preview.

### Phase 1: Foundation

- Migrations (all expand): enums, `profiles`, `profile_sensitive`, `profile_private`, `profile_answers`, `profile_heritage`, `preferences`, `heritage_preferences`, `photos`, `verifications`, `consents`, `admins`, `admin_audit`, `user_daily`. RLS for all. `is_admin()`, `is_admin_mfa()`, `normalize_key()`, triggers for lengths and counts.
- Auth flows including admin TOTP enrollment, onboarding screens (with the two-tier consent from section 8.1), the ticket-and-process upload pipeline, selfie capture, admin verification queue behind `is_admin_mfa`.
- Exit: a new user can complete onboarding and be approved by an aal2-enrolled admin; pgTAP covers every policy in this phase, including the `profile_sensitive` split and the admin MFA gate.

### Phase 2: Core loop (gated by Phase −1)

- Migrations: `feed_items`, `likes`, `connections` (with `last_human_message_at`/`last_human_sender_id`), `user_abuse_signals`, `blocks`; `available()`, `can_view_profile()`, `mutually_compatible()`, `preference_score()`, `get_daily_feed()`, `feed_state()`, `decide_feed_item()`, `_send_like()`, `_form_connection()`, `next_waiting_like()`, `respond_to_like()`, `set_capacity()`, `block_user()`, expire and purge jobs.
- Screens: home (state machine over `feed_state()`), card, waiting list, connections list, capacity setting. No accountability or score display anywhere.
- Exit: two test users can connect; the focused-exclusion concurrency test passes; RLS tests for `likes` and `user_abuse_signals` negative cases pass.

### Phase 3: Chat and ending

- Migrations: `messages` (with `is_system`), triggers, Realtime publication, `end_connection()`, inactivity job with human-message attribution.
- Screens: chat, end-connection sheet with note, faded state. No public accountability signal on cards.
- Exit: Playwright smoke passes end to end, including the fade-attribution test.

### Phase 4: Safety, privacy, launch readiness

- `reports`, `report_user()`, admin report review, ban and reinstate, `request_account_deletion()`, purge routes across all three storage buckets, Vercel Cron, `proxy.ts` header verification, PWA manifest and install prompt, privacy and terms pages, restore drill, production deploy.
- Exit: red-team checklist fully green on production configuration; a friend can install it on a phone and complete the loop.

---

## 15. Decisions deferred

- The product name and domain.
- Production email provider (Supabase default SMTP is rate-limited to a few messages an hour and is fine only for development).
- Whether iOS Safari's PWA camera access is reliable enough for selfie capture, to be tested in Phase 1 on a real phone.
- Freedom-to-operate review of the Sidekick patent family, now a hard Phase −1 gate rather than a pre-launch checklist item; see section 14.
- Whether human selfie review remains sustainable past low thousands of users, and, if not, whether to introduce the single flat, universal fee described in section 1 rather than any differential-access model. This is explicitly not a decision to make now.
- A staging environment beyond ephemeral per-PR branches, such as a longer-lived pre-production environment, if the team grows past one contributor.
- Whether `style-src 'unsafe-inline'` in the CSP can be tightened once the Tailwind build output is audited in the red-team pass.

---

## 16. Glossary

- **Capacity**: the number of active connections a user allows themselves, 1 to 3.
- **Connection**: a mutual match that has formed and is active. Occupies one slot for each member.
- **Slot**: capacity minus active connections. "Open slot" means at least one.
- **Available**: `active_connections(p) < capacity(p)`. Can appear as a candidate in others' feeds and can receive new likes.
- **Focused**: not available. Removed entirely from other users' candidate pools; cannot receive new likes; can still act on likes that reached them while they were available.
- **Feed item**: one profile served to one user on one day.
- **Waiting list**: pending likes addressed to a user, surfaced one at a time, only from senders who are currently available, only when the user has an open slot.
- **Non-negotiables**: the fields a user can mark must-match.
- **Heritage**: self-written background, community, origin, language, and raised-in fields. Used in matching only when the user turns "Use heritage in who I'm shown" on.
- **Importance**: the weight a user gives a heritage rule: nice to have (1), important (3), or must (hard filter).
- **Faded**: a connection closed by the inactivity job after a nudge went unanswered, attributed internally to whichever party stopped sending human messages.
- **aal2**: the Supabase Auth assurance level reached after a second factor (TOTP) is verified in the current session; required for all admin data access and actions.

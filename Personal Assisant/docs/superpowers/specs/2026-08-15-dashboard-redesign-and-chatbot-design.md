# HoWz Dashboard Redesign + Chatbot — Design Spec

Status: approved by user 2026-08-15, pending implementation plan.

## Job and audience

Sole audience: Ezekiel Ologunde, on his home LAN, checking in on real state an automation system (this Claude Code project) has found/staged/flagged — job search, money, Cyntraix, doctoral research, projects, news, inbox, goals. Operate mode: task completion and scanability outrank pure expression, but the user explicitly wants real visual energy, not a purely utilitarian look. See `PRODUCT.md` for full product truth (already written and confirmed this session).

## Outcome and proof

Primary task: open the dashboard, immediately see what needs attention today, drill into any item down to the real source document, and — new — ask a direct question ("what's my minimum payment due?", "how many applications are staged?") and get an answer sourced strictly from the real local data. Success: nothing on screen is fabricated; the chat answers only what the data actually supports.

## Selected direction — "Command Center, not Command Line"

Chosen after three rolls of `impeccable`'s concept-seed tool produced print-culture/art-world metaphors (data-art strobing, film-editing bench, cassette j-card, boxed manual, phosphor terminal, warm consumer app, variable type specimen) that didn't match the user's plain-language brief ("bold, bright, joyful, colorful, interactive"). Direction was synthesized directly against that brief instead of forced from the catalog, then confirmed by the user.

- **World:** Real, saturated color fields per module (not accent dots on neutral glass) — job search electric blue, money emerald, Cyntraix violet, research amber, projects/news/inbox get their own place in the same system. Big, confident rounded cards, generous padding. Motion has personality: numbers count up and settle with a slight overshoot, a small celebration moment on genuinely good news (application → interview, goal completed), a live pulse on anything active right now.
- **Structural/interaction thesis:** cross-linked drill-down (opening one item surfaces related items across modules — an application links to the goal it serves; a money account links to its recurring payments) plus a persistent, always-reachable chat entry point ("Ask HoWz anything") rather than a buried nav item.
- **Signature interaction:** the chat bubble — bottom-right on desktop, becomes a full-screen sheet on mobile — is the one thing that should still be recognizable a year later.
- **Implementation consequence:** moving from the current plain HTML/CSS/vanilla-JS server-rendered-string app to React (Vite bundler, kept as an SPA served by the existing small Node server — no server-rendering framework needed for a single-user LAN tool). See `PRODUCT.md` → Stack for the reasoning.

## Scope and boundaries

- Fidelity: production-ready, not exploration — this replaces the shipped dashboard.
- Breadth: all existing pages (Home, Goals, Job search, Money, Inbox, Cyntraix, Research, Projects, News, Digests, Config) redone together in one pass, per the user's explicit choice, since the app is already migrating framework and a half-migrated app would sit in an inconsistent state.
- Must stay: password-gated LAN-only access model; the "reads live from disk, nothing fabricated" backbone; the standing rule that the dashboard only shows/reviews, never submits or acts on the user's behalf.
- Anti-goal: do not turn this into a public-facing or internet-exposed product; do not add any external API dependency for the chatbot (see below).

## States and ranges

- Applications: currently 13 staged/tracked, will grow daily via the automation.
- Money: 6 accounts, 4 recurring payments, a handful of one-off transactions today, explicitly a partial capture per `finances.json`'s own `_meta` — the UI must not imply completeness it doesn't have.
- Empty states matter: several modules (payments-due-soon, notifications) are legitimately often empty ("nothing due," "all caught up") — these are good news, not broken UI, and should read that way.
- Standard responsive range: desktop (primary today) down to mobile (new requirement) — no tablet-specific layout required beyond what falls out of a mobile-first responsive pass.

## Interaction and layout

- Navigation: sidebar on desktop, bottom tab bar on mobile (thumb-reachable), consistent with the "Command Center" world's confident, big-target feel.
- Drill-down: replaces the current plain markdown modal with a real detail view carrying cross-links to related items in other modules (exact II/routing left to the implementation plan).
- Chat: persistent entry point, rule-based/pattern-matching backend (see Constraints), answers scoped to any module — no restriction to job-search/money only, since the user wants it to match how he actually thinks about his day.
- Motion: purposeful, not decorative — counters, status pulses, and one real celebration moment; respects `prefers-reduced-motion`.

## Constraints and open decisions

- **Chatbot mechanism — confirmed:** rule-based/pattern-matching against the local JSON files, no external LLM API call. No cost, no added privacy exposure (given how much financial/business data lives in `profile/`), but it will read as a smart search box more than a true conversational AI — the user chose this explicitly, trading conversational range for privacy and zero cost.
- **Stack — confirmed:** React + Vite, built and served as a static bundle by the existing Node server; no server-rendering framework.
- **Left to the implementation plan:** exact route/component structure, cross-link data model (how "related items" get computed across modules), specific color values (the world above names the strategy — Full palette, one real color per module — not exact hex tokens), and the mechanical migration path for the 7+ existing pages.
- **Out of scope for this spec:** any change to the underlying automation/data layer (`profile/*.json`, `applications/*`, scheduled tasks) — this is a frontend + a new local-only chatbot backend only.

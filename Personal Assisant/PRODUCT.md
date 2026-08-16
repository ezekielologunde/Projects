# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, built with Vite and React Router, replacing the prior plain HTML/CSS/vanilla-JS server-rendered dashboard. The move to a framework was chosen over staying lightweight to support the redesign's chat panel and cross-linked drill-downs. Vite was chosen over a server-rendering framework (Next.js etc.) because the app is a small Node `http` server serving static files with no build step and no internet exposure (LAN-only, password-gated) — Vite's plain SPA output keeps that "serve a static bundle from the same Node server" model with the least ceremony, and a server-rendering framework has nothing to offer a single-user local tool. `automation/dashboard-server/server.js` serves the built `web/dist` bundle; the React source lives under `automation/dashboard-server/web/` (React 19, react-router-dom 7, Vitest + Testing Library for component tests, oxlint for linting).

## Users

Exactly one user: Ezekiel Ologunde himself. This is his personal "Chief of Staff AI" dashboard — not a multi-tenant product, not for anyone else. He accesses it from any device on his home LAN (password-gated, see `profile/dashboard-auth.json`), typically to check what an AI-automation session (this Claude Code project) has found, staged, or flagged since he last looked, and to drill into the real underlying documents when he wants detail.

## Product Purpose

A single-pane view of everything a long-running, file-based personal-assistant automation system (job search, money/finances, Cyntraix consulting business, doctoral research, side-project portfolio, cyber/AI news digests, inbox review, personal goals) has genuinely found or done — read live off disk, never a manually-maintained status board. Success is: he opens it, immediately sees what actually needs his attention (an application at interview stage, a payment due soon, an open research question), and can drill into the real source document behind any summary without leaving the page.

## Positioning

Everything shown is traceable to a real file the automation actually wrote or a real document it actually read (`profile/*.json`, `applications/*/status.json`, dated digest `.md` files, etc.) — nothing is fabricated or hand-typed status. A generic dashboard/notes tool has no equivalent backing data; a spreadsheet has no live automation writing to it. The chatbot inherits this constraint: it answers strictly from what's actually on disk (see Capabilities and Constraints), never invents an answer.

## Operating Context

Runs as a local Node server (`automation/dashboard-server/server.js`) bound to `0.0.0.0:47832`, reachable from any device on the home LAN, gated by a shared password (session cookie, 30-day TTL). Data sources are entirely local files under the project root: `profile/*.json` (goals, preferences, master résumé profile, Cyntraix business, doctoral research, projects registry, connected email accounts, finances), `applications/<folder>/status.json` + supporting docs, and dated `.md` files in `digests/`, `news/`, `inbox/`. No external API calls today. The server re-reads these on each request (a short in-memory cache was added 2026-08-14 for burst-load protection, not to change the "live" guarantee).

## Capabilities and Constraints

- Current pages: Home (a hero briefing surfacing the single most urgent signal across modules, per-status stat cards with day-over-day trend badges, an application-status activity bar, an applications-found bar chart with a this-week/last-2-weeks/this-month period selector, a color-coded module grid, and a 28-day activity heatmap), Goals, Job search (Applications), Money (accounts/recurring/one-off transactions, payments-due-soon), Inbox, Cyntraix, Research, Projects, News, Digests, Config/Preferences — 11 pages in all, reached via a desktop sidebar or, for the four highest-traffic modules (Home, Job search, Money, Inbox), a mobile bottom tab bar.
- A persistent top header sits above every routed page: a time-of-day greeting, a notification bell tallying staged/interview/open-item/payment-due signals across modules, and an account menu with sign-out. A dark/light theme toggle (defaults to system preference, persisted per-device) lives in the sidebar.
- A persistent chat entry point ("Ask HoWz anything" — a bottom-right bubble on desktop, a full-width sheet on mobile) is the same rule-based chatbot described below, not a separate assistant.
- Chatbot: pattern-matches the question text against a small, fixed rule set (`automation/dashboard-server/lib/chatbot.js`) and answers only from fields already present on the dashboard's own data object — no external LLM API call. Today's rules cover staged-application count, which applications are at interview stage, upcoming minimum-payment due dates, recurring payments, and active-goal count; anything that matches no rule gets an honest "I don't have an answer for that" rather than a guess.
- Opening an item's detail view cross-links it to related items in other modules (`automation/dashboard-server/lib/cross-links.js`, surfaced by the `DetailPanel` overlay) — e.g. opening an application surfaces goals or accounts whose notes/status/category text shares its company, role, or institution. Known limitation: the item itself is resolved by exact string match on title/company/institution rather than a stable ID (there's no relational key between `profile/*.json` and `applications/*/status.json` today), so two goals sharing a title can resolve to the wrong one, and a renamed company or goal can silently drop a real link.
- Hard product rule inherited from the parent automation system: nothing is ever submitted, sent, or applied for without the user's explicit go-ahead — the dashboard is read/review surface, not an action-taking one. The chatbot respects this too: it answers questions about the data, it does not take actions.
- Must keep working as a password-gated LAN-only tool; no requirement (or plan) to expose it to the public internet.

## Brand Commitments

Name: "HoWz — Chief of Staff AI Assistant" (`web/index.html`'s `<title>`, and the Login screen's own branding). Visual identity is the "Command Center" direction (`web/src/theme.css`): one real, saturated color per module — job-search electric blue, money emerald, Cyntraix violet, research amber, and so on — as a full color field rather than an accent dot on neutral glass; big, confident rounded cards with generous padding; and purposeful motion (stat numbers count up, a soft pulse marks anything genuinely live — an interview, an open Cyntraix engagement — cards lift on hover/focus), all disabled under `prefers-reduced-motion`. Dark/light theming (a toggle, defaulting to system preference) runs off the same CSS custom-property token set rather than a separate skin.

## Evidence on Hand

Every data source named under Operating Context is real, live project data, not sample/seed content — `profile/finances.json`, `profile/goals.json`, `applications/*/status.json`, etc. all reflect the user's actual job search, actual finances (balances, minimum payments, recurring payments — partial capture, explicitly marked as such in the file's own `_meta`), and actual business/research state as of 2026-08-14/15. No placeholder or fabricated content exists anywhere in this project's data layer; that must not change with a redesign.

## Product Principles

1. Never fabricate or paraphrase-as-fact — every number and status on screen must trace to a real file.
2. Read-only by default — the dashboard shows and lets the user drill into reality; it does not act on the user's behalf.
3. Private by construction — LAN-only, password-gated, no data leaves the machine (including the chatbot, which is rule-based and makes no external API call).
4. Genuinely useful triage over a dashboard for its own sake — the home page's job is telling him the one thing that most needs his attention today, not just displaying every metric that exists.
5. Built and maintained by iterative, real automation work (this Claude Code project), not a static product spec written once and left behind — PRODUCT.md and DESIGN.md should stay current as the system grows.

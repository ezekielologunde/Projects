# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React (moving from the current plain HTML/CSS/vanilla-JS dashboard). User confirmed 2026-08-15: "move to a framework" over staying lightweight, given the new chat panel and richer drill-downs. Bundler/tooling inferred rather than asked separately (kept the init interview to one question): Vite + React, since the current architecture is a small Node `http` server serving static files with no build step and no internet exposure (LAN-only, password-gated) — Vite's plain SPA output preserves that "serve a static bundle from the same Node server" model with the least ceremony, versus a server-rendering framework (Next.js etc.) this single-user local tool has no reason to need. Flag this inference to the user before locking it in if it turns out wrong.

## Users

Exactly one user: Ezekiel Ologunde himself. This is his personal "Chief of Staff AI" dashboard — not a multi-tenant product, not for anyone else. He accesses it from any device on his home LAN (password-gated, see `profile/dashboard-auth.json`), typically to check what an AI-automation session (this Claude Code project) has found, staged, or flagged since he last looked, and to drill into the real underlying documents when he wants detail.

## Product Purpose

A single-pane view of everything a long-running, file-based personal-assistant automation system (job search, money/finances, Cyntraix consulting business, doctoral research, side-project portfolio, cyber/AI news digests, inbox review, personal goals) has genuinely found or done — read live off disk, never a manually-maintained status board. Success is: he opens it, immediately sees what actually needs his attention (an application at interview stage, a payment due soon, an open research question), and can drill into the real source document behind any summary without leaving the page.

## Positioning

Everything shown is traceable to a real file the automation actually wrote or a real document it actually read (`profile/*.json`, `applications/*/status.json`, dated digest `.md` files, etc.) — nothing is fabricated or hand-typed status. A generic dashboard/notes tool has no equivalent backing data; a spreadsheet has no live automation writing to it. The planned chatbot inherits this constraint: it must answer strictly from what's actually on disk, never invent an answer.

## Operating Context

Runs as a local Node server (`automation/dashboard-server/server.js`) bound to `0.0.0.0:47832`, reachable from any device on the home LAN, gated by a shared password (session cookie, 30-day TTL). Data sources are entirely local files under the project root: `profile/*.json` (goals, preferences, master résumé profile, Cyntraix business, doctoral research, projects registry, connected email accounts, finances), `applications/<folder>/status.json` + supporting docs, and dated `.md` files in `digests/`, `news/`, `inbox/`. No external API calls today. The server re-reads these on each request (a short in-memory cache was added 2026-08-14 for burst-load protection, not to change the "live" guarantee).

## Capabilities and Constraints

- Current pages: Home (briefing, module grid, performance chart, activity heatmap), Goals, Job search (Applications), Money (accounts/recurring/one-off transactions, payments-due-soon), Inbox, Cyntraix, Research, Projects, News, Digests, Config/Preferences.
- Hard product rule inherited from the parent automation system: nothing is ever submitted, sent, or applied for without the user's explicit go-ahead — the dashboard is read/review surface, not an action-taking one. A planned chatbot must respect this too: it can answer questions about the data, not take actions.
- Must keep working as a password-gated LAN-only tool; no requirement (or plan) to expose it to the public internet.
- Undecided: exact chatbot answer scope (which modules it can see) and its underlying mechanism — user confirmed 2026-08-15 it should be rule-based/pattern-matching against the local JSON (no external LLM API call, no added cost, keeps sensitive financial/business data from leaving the machine).

## Brand Commitments

Name: "HoWz — Chief of Staff AI Assistant." Existing visual identity (dark/light theme, glass-morphism cards, an accent-color-per-category system, a bar chart + activity heatmap + segmented "Total Activity" bar on the home page) was a deliberate, fairly recent redesign (AURA-palette pass, 2026-08-14) — this is incumbent visual truth for `new-work` to weigh, not a blank slate, though the user's current request (colors, motion, mobile, organization) signals real appetite to revisit it.

## Evidence on Hand

Every data source named under Operating Context is real, live project data, not sample/seed content — `profile/finances.json`, `profile/goals.json`, `applications/*/status.json`, etc. all reflect the user's actual job search, actual finances (balances, minimum payments, recurring payments — partial capture, explicitly marked as such in the file's own `_meta`), and actual business/research state as of 2026-08-14/15. No placeholder or fabricated content exists anywhere in this project's data layer; that must not change with a redesign.

## Product Principles

1. Never fabricate or paraphrase-as-fact — every number and status on screen must trace to a real file.
2. Read-only by default — the dashboard shows and lets the user drill into reality; it does not act on the user's behalf.
3. Private by construction — LAN-only, password-gated, no data leaves the machine (including in the planned chatbot).
4. Genuinely useful triage over a dashboard for its own sake — the home page's job is telling him the one thing that most needs his attention today, not just displaying every metric that exists.
5. Built and maintained by iterative, real automation work (this Claude Code project), not a static product spec written once and left behind — PRODUCT.md and DESIGN.md should stay current as the system grows.

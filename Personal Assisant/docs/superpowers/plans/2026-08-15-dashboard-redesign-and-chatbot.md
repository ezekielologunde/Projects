# HoWz Dashboard Redesign + Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the HoWz personal-assistant dashboard from a vanilla HTML/CSS/JS server-rendered-string app to a React + Vite SPA implementing the "Command Center, not Command Line" direction (real per-module color, purposeful motion, cross-linked drill-down, mobile bottom-nav), and add a rule-based (no external API) chatbot that answers questions from the same live-disk data the rest of the dashboard reads.

**Architecture:** `automation/dashboard-server/web/` becomes a Vite + React SPA, built to `web/dist/`. `server.js` keeps its existing `/api/dashboard`-style JSON endpoints (unchanged shape) and gains two new ones: `POST /api/chat` (rule-based Q&A over the same data `getDashboardData()` already assembles) and `GET /api/related` (cross-link lookup for drill-down). In dev, Vite's dev server proxies API calls to the existing Node server on port 47832; in production, `server.js` serves `web/dist/` as its static root instead of the old `public/` folder. All existing auth (session cookie, login flow) is unchanged and reused as-is by the new frontend.

**Tech Stack:** React 18, Vite 5, Vitest + @testing-library/react for tests, plain CSS (custom properties for the design-token theme, no CSS framework — matches the existing hand-written-CSS convention and keeps the bundle small for a LAN tool). No new backend dependencies — the chatbot and cross-link engines are pure Node functions.

## Global Constraints

- No external LLM/API call anywhere in the chatbot — pattern-matching over local JSON only (spec: "Chatbot mechanism — confirmed").
- Nothing the dashboard does may submit, send, or act on the user's behalf — read/review only (spec: "Must stay").
- Must keep working as password-gated, LAN-only (`0.0.0.0:47832`), no public-internet exposure requirement or plan (spec: "Anti-goal").
- Every number/status shown must trace to a real file already on disk — no fabricated or sample data anywhere, including in tests (use realistic fixtures shaped like the real files, never invented business facts) (PRODUCT.md: "Product Principles" #1).
- Respect `prefers-reduced-motion` for all new motion (spec: "Interaction and layout").
- Money page must not visually imply completeness `finances.json` doesn't have — its own `_meta` already documents this as a partial capture (spec: "States and ranges").

---

## Task 1: Vite + React project scaffold, served by the existing Node server

**Files:**
- Create: `automation/dashboard-server/web/package.json`
- Create: `automation/dashboard-server/web/vite.config.js`
- Create: `automation/dashboard-server/web/index.html`
- Create: `automation/dashboard-server/web/src/main.jsx`
- Create: `automation/dashboard-server/web/src/App.jsx`
- Create: `automation/dashboard-server/web/.gitignore`
- Modify: `automation/dashboard-server/server.js:18` (`PUBLIC_DIR` and static-file serving block)
- Modify: `C:\Users\WT8\Projects\Personal Assisant\.gitignore` (add `automation/dashboard-server/web/dist/`, `automation/dashboard-server/web/node_modules/`)

**Interfaces:**
- Produces: a running `npm run dev` (Vite dev server, proxies `/api/*` to `http://127.0.0.1:47832`) and `npm run build` (outputs `web/dist/index.html` + hashed assets) that later tasks build pages into.

- [ ] **Step 1: Create the Vite project**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server"
mkdir web
cd web
npm create vite@latest . -- --template react
```

When prompted about the current directory not being empty, confirm to proceed (it's empty at this point — the command is run before any files exist here).

- [ ] **Step 2: Configure Vite to build into `dist/` and proxy API calls in dev**

Replace `automation/dashboard-server/web/vite.config.js` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:47832',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
```

- [ ] **Step 3: Add a minimal App shell that proves the plumbing works**

Replace `automation/dashboard-server/web/src/App.jsx` with:

```jsx
export default function App() {
  return <div style={{ padding: 24, fontFamily: 'sans-serif' }}>HoWz — scaffold OK</div>
}
```

- [ ] **Step 4: Point `server.js` at the built app**

In `automation/dashboard-server/server.js`, change:

```js
const PUBLIC_DIR = path.join(__dirname, "public");
```

to:

```js
const PUBLIC_DIR = path.join(__dirname, "web", "dist");
```

- [ ] **Step 5: Build and verify the server serves it**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm run build
cd ..
node server.js
```

In another terminal:

```bash
curl -s http://127.0.0.1:47832/login.html -o /dev/null -w "%{http_code}\n"
```

Expected: `404` (the old `login.html`/`login.js` under `public/` no longer exist at the new `PUBLIC_DIR` — this is expected and gets fixed in Task 2; this step only confirms the server is reading from `web/dist/` and not crashing). Stop the server (`Ctrl+C` or kill the process) once confirmed.

- [ ] **Step 6: Add `.gitignore` entries so `node_modules`/`dist` never get committed**

Append to `C:\Users\WT8\Projects\Personal Assisant\.gitignore`:

```
automation/dashboard-server/web/node_modules/
automation/dashboard-server/web/dist/
```

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/package.json automation/dashboard-server/web/vite.config.js automation/dashboard-server/web/index.html automation/dashboard-server/web/src/main.jsx automation/dashboard-server/web/src/App.jsx automation/dashboard-server/web/.gitignore automation/dashboard-server/server.js .gitignore
git commit -m "chore: scaffold Vite+React app, point server at web/dist"
```

---

## Task 2: Login page ported to React (restores the auth flow the scaffold broke)

**Files:**
- Create: `automation/dashboard-server/web/src/pages/Login.jsx`
- Create: `automation/dashboard-server/web/src/pages/Login.test.jsx`
- Modify: `automation/dashboard-server/web/src/App.jsx`
- Modify: `automation/dashboard-server/web/package.json` (test deps + script)
- Modify: `automation/dashboard-server/server.js` (login/logout routes already exist — this task only needs a small change: the SPA now handles the "not authed, redirect to login" case client-side, since there's one `index.html` now, not a separate `login.html`)

**Interfaces:**
- Consumes: `POST /api/login` (existing, unchanged: `{password}` → `Set-Cookie` + `{ok:true}` on success, `401 {ok:false}` on failure), `GET /api/logout` (existing, unchanged).
- Produces: `<Login onSuccess={() => void}>` component later consumed by `App.jsx`'s auth gate (Task 5).

- [ ] **Step 1: Install test tooling**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `automation/dashboard-server/web/package.json` `"scripts"`:

```json
"test": "vitest run"
```

Create `automation/dashboard-server/web/vitest.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
})
```

Create `automation/dashboard-server/web/src/test-setup.js`:

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 2: Write the failing test**

Create `automation/dashboard-server/web/src/pages/Login.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Login from './Login'

describe('Login', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('calls onSuccess after a correct password is submitted', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    const onSuccess = vi.fn()
    render(<Login onSuccess={onSuccess} />)

    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'cyntraix-orbit-7291' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledWith('/api/login', expect.objectContaining({ method: 'POST' }))
  })

  it('shows an error and does not call onSuccess on a wrong password', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ ok: false }) })
    const onSuccess = vi.fn()
    render(<Login onSuccess={onSuccess} />)

    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))

    await waitFor(() => expect(screen.getByText(/this device isn't recognized|incorrect/i)).toBeInTheDocument())
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- Login
```

Expected: FAIL with "Failed to resolve import './Login'" (the component doesn't exist yet).

- [ ] **Step 4: Implement the component**

Create `automation/dashboard-server/web/src/pages/Login.jsx`:

```jsx
import { useState } from 'react'

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(false)
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setSubmitting(false)
    if (res.ok) {
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">H</div>
        <h1>HoWz</h1>
        <p className="login-sub">Chief of Staff AI Assistant</p>
        <p className="login-hint">{error ? 'incorrect password' : "this device isn't recognized yet"}</p>
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'checking…' : 'unlock'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- Login
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/package.json automation/dashboard-server/web/vitest.config.js automation/dashboard-server/web/src/test-setup.js automation/dashboard-server/web/src/pages/Login.jsx automation/dashboard-server/web/src/pages/Login.test.jsx
git commit -m "feat: React login page with tests"
```

---

## Task 3: Chatbot pattern-matching engine (server-side, no external API)

**Files:**
- Create: `automation/dashboard-server/lib/chatbot.js`
- Create: `automation/dashboard-server/lib/chatbot.test.js`
- Modify: `automation/dashboard-server/package.json` (add `vitest` as a devDependency for the server-side lib too, or reuse `web`'s — see Step 1)

**Interfaces:**
- Produces: `answerQuestion(question: string, data: DashboardData) => { answer: string, matched: boolean }`, where `DashboardData` is exactly the object shape `getDashboardData()` in `server.js` returns (has `applications`, `counts`, `goals`, `finances`, `paymentsDueSoon`, `cyntraix`, `research`, `projectsRegistry`, etc. — see `server.js:buildDashboardData`). `matched: false` means no rule fired; the caller (Task 4) is responsible for the "I don't have a rule for that yet" fallback copy, not this function.

- [ ] **Step 1: Set up a test runner for the server side (separate from the `web/` frontend one)**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server"
npm init -y
npm install -D vitest
```

Add to the new `automation/dashboard-server/package.json` `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 2: Write the failing tests**

Create `automation/dashboard-server/lib/chatbot.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { answerQuestion } from './chatbot.js'

const sampleData = {
  applications: [
    { status: 'staged', company: 'Acme', role: 'Analyst' },
    { status: 'staged', company: 'Globex', role: 'Engineer' },
    { status: 'interview', company: 'Initech', role: 'Consultant' },
  ],
  counts: { staged: 2, interview: 1, applied: 0, rejected: 0, needs_manual_completion: 0, unknown: 0 },
  finances: {
    accounts: [
      {
        institution: 'Discover Card',
        last4: '7921',
        latest_statement: { balance: 2396.63, minimum_payment: 76, minimum_payment_due: '2026-09-01' },
      },
    ],
    recurring_payments: [{ payee: 'Christ Apostolic Church Salvation Centre', amount: 10, cadence: 'recurring' }],
  },
  paymentsDueSoon: [],
  goals: [
    { title: 'Finish DEng praxis', status: 'active' },
    { title: 'Launch Cyntraix v2', status: 'active' },
    { title: 'Old goal', status: 'done' },
  ],
}

describe('answerQuestion', () => {
  it('answers how many applications are staged', () => {
    const { answer, matched } = answerQuestion('how many applications are staged?', sampleData)
    expect(matched).toBe(true)
    expect(answer).toContain('2')
  })

  it('answers what the minimum payment due is', () => {
    const { answer, matched } = answerQuestion('what is my minimum payment due?', sampleData)
    expect(matched).toBe(true)
    expect(answer).toContain('Discover Card')
    expect(answer).toContain('76')
  })

  it('answers how many active goals exist', () => {
    const { answer, matched } = answerQuestion('how many active goals do I have?', sampleData)
    expect(matched).toBe(true)
    expect(answer).toContain('2')
  })

  it('answers which applications are at interview stage', () => {
    const { answer, matched } = answerQuestion('what is at interview stage?', sampleData)
    expect(matched).toBe(true)
    expect(answer).toContain('Initech')
  })

  it('returns matched:false for a question with no rule', () => {
    const { matched } = answerQuestion('what is the meaning of life?', sampleData)
    expect(matched).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server"
npm test
```

Expected: FAIL — `Cannot find module './chatbot.js'`.

- [ ] **Step 4: Implement the chatbot engine**

Create `automation/dashboard-server/lib/chatbot.js`:

```js
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

export function answerQuestion(question, data) {
  const q = String(question || '').trim().toLowerCase()
  for (const rule of RULES) {
    if (rule.test(q)) {
      return { answer: rule.answer(data), matched: true }
    }
  }
  return { answer: '', matched: false }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/lib/chatbot.js automation/dashboard-server/lib/chatbot.test.js automation/dashboard-server/package.json
git commit -m "feat: rule-based chatbot engine with tests"
```

---

## Task 4: Cross-link engine (drill-down relates items across modules)

**Files:**
- Create: `automation/dashboard-server/lib/cross-links.js`
- Create: `automation/dashboard-server/lib/cross-links.test.js`

**Interfaces:**
- Produces: `findRelated(kind: 'application'|'goal'|'account', id: string, data: DashboardData) => Array<{kind: string, id: string, label: string, sub: string}>`. `id` for an application is its `folder` field; for a goal, its `title`; for a money account, `institution + last4`. This is intentionally string-matching-based (titles/notes mentioning each other), not a foreign-key system — the underlying JSON files have no relational IDs today, and adding one is out of scope for this plan (spec: "cross-link data model... left to the implementation plan" — resolved here as simple substring matching, documented as the chosen approach).

- [ ] **Step 1: Write the failing tests**

Create `automation/dashboard-server/lib/cross-links.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { findRelated } from './cross-links.js'

const data = {
  applications: [
    { folder: '2026-08-14_Acme_Analyst', company: 'Acme', role: 'Analyst', notes: 'Ties to the Cyntraix growth goal.' },
  ],
  goals: [
    { title: 'Cyntraix growth', category: 'business', status: 'active', notes: 'Land the Acme analyst role as a reference client contact.' },
    { title: 'Unrelated goal', category: 'personal', status: 'active', notes: 'Nothing to do with Acme.' },
  ],
  finances: { accounts: [] },
}

describe('findRelated', () => {
  it('finds a goal that mentions the application company name', () => {
    const related = findRelated('application', '2026-08-14_Acme_Analyst', data)
    expect(related.some((r) => r.kind === 'goal' && r.label === 'Cyntraix growth')).toBe(true)
  })

  it('does not include unrelated goals', () => {
    const related = findRelated('application', '2026-08-14_Acme_Analyst', data)
    expect(related.some((r) => r.label === 'Unrelated goal')).toBe(false)
  })

  it('returns an empty array for an unknown id', () => {
    expect(findRelated('application', 'does-not-exist', data)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server"
npm test -- cross-links
```

Expected: FAIL — `Cannot find module './cross-links.js'`.

- [ ] **Step 3: Implement**

Create `automation/dashboard-server/lib/cross-links.js`:

```js
// Finds items in other modules that plausibly relate to a given item, by
// looking for the source item's own name/company/title inside other
// items' free-text fields (notes/status/role). Deliberately simple
// substring matching — there is no relational ID between profile/*.json
// and applications/*/status.json today, and building one is out of scope.

function tokenize(str) {
  return String(str || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3) // skip short/common words
}

function textOf(item) {
  return [item.company, item.role, item.title, item.notes, item.status, item.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function findRelated(kind, id, data) {
  let source = null
  if (kind === 'application') source = (data.applications || []).find((a) => a.folder === id)
  if (kind === 'goal') source = (data.goals || []).find((g) => g.title === id)
  if (kind === 'account') source = (data.finances?.accounts || []).find((a) => `${a.institution}${a.last4 || ''}` === id)
  if (!source) return []

  const sourceTokens = new Set(tokenize([source.company, source.role, source.title, source.institution].filter(Boolean).join(' ')))
  if (!sourceTokens.size) return []

  const results = []

  if (kind !== 'goal') {
    for (const g of data.goals || []) {
      const hay = textOf(g)
      if ([...sourceTokens].some((t) => hay.includes(t))) {
        results.push({ kind: 'goal', id: g.title, label: g.title, sub: `${g.category} · ${g.status}` })
      }
    }
  }
  if (kind !== 'application') {
    for (const a of data.applications || []) {
      const hay = textOf(a)
      if ([...sourceTokens].some((t) => hay.includes(t))) {
        results.push({ kind: 'application', id: a.folder, label: `${a.company} — ${a.role}`, sub: a.status })
      }
    }
  }

  return results
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- cross-links
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/lib/cross-links.js automation/dashboard-server/lib/cross-links.test.js
git commit -m "feat: cross-link engine with tests"
```

---

## Task 5: Wire `/api/chat` and `/api/related` into `server.js`

**Files:**
- Modify: `automation/dashboard-server/server.js` (add two routes; import the two new libs)

**Interfaces:**
- Consumes: `answerQuestion` from Task 3, `findRelated` from Task 4, `getDashboardData` (already in `server.js`).
- Produces: `POST /api/chat` body `{question: string}` → `{answer: string, matched: boolean}`. `GET /api/related?kind=application&id=<folder>` → `{related: Array<{kind,id,label,sub}>}`. Both require auth (same gate as every other `/api/*` route).

- [ ] **Step 1: Add the imports**

In `automation/dashboard-server/server.js`, near the top with the other `require`s (after line 13, `const crypto = require("crypto");`), add:

```js
const { answerQuestion } = require("./lib/chatbot.js");
const { findRelated } = require("./lib/cross-links.js");
```

Note: `lib/chatbot.js` and `lib/cross-links.js` use `export`/`import` (ES modules) per Tasks 3–4's tests, which run under Vitest's own ESM handling. `server.js` itself is CommonJS (`require`). Convert both lib files' export style before this step: replace `export function answerQuestion` with `function answerQuestion` + `module.exports = { answerQuestion }` at the end of the file (same pattern for `cross-links.js` / `findRelated`). Re-run `npm test` in `automation/dashboard-server/` after converting to confirm the tests still pass — Vitest handles CommonJS `module.exports` transparently.

- [ ] **Step 2: Add the routes**

In `automation/dashboard-server/server.js`, inside the `---- API ----` block (after the existing `/api/inbox` handler, before `---- Static frontend ----`), add:

```js
  if (pathname === "/api/chat" && req.method === "POST") {
    const body = await readBody(req);
    let question = "";
    try { question = JSON.parse(body).question; } catch { /* ignore */ }
    const result = answerQuestion(question, getDashboardData());
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }
  if (pathname === "/api/related") {
    const { kind, id } = parsed.query;
    const related = kind && id ? findRelated(String(kind), String(id), getDashboardData()) : [];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ related }));
    return;
  }
```

- [ ] **Step 3: Manually verify against the running server**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server"
node server.js &
sleep 1
COOKIE=$(node -e "
const http=require('http');
const data=JSON.stringify({password:require('../../profile/dashboard-auth.json').password});
const req=http.request({host:'127.0.0.1',port:47832,path:'/api/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':data.length}},res=>{
  console.log(res.headers['set-cookie'][0].split(';')[0].split('=')[1]);
});
req.write(data); req.end();
")
curl -s -X POST http://127.0.0.1:47832/api/chat -H "Cookie: pa_session=$COOKIE" -H "Content-Type: application/json" -d '{"question":"how many applications are staged?"}'
```

Expected: a JSON body like `{"answer":"You have 13 application(s) staged for review.","matched":true}` (the exact count reflects whatever `applications/` currently holds). Stop the background server afterward (`kill %1` or find and kill the `node server.js` process).

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/server.js automation/dashboard-server/lib/chatbot.js automation/dashboard-server/lib/cross-links.js
git commit -m "feat: wire chat and related-items endpoints into the server"
```

---

## Task 6: Design tokens + app shell (sidebar, bottom tab bar, routing, auth gate)

**Files:**
- Create: `automation/dashboard-server/web/src/theme.css`
- Create: `automation/dashboard-server/web/src/components/Sidebar.jsx`
- Create: `automation/dashboard-server/web/src/components/BottomTabBar.jsx`
- Create: `automation/dashboard-server/web/src/components/NavItems.js`
- Modify: `automation/dashboard-server/web/src/App.jsx`
- Modify: `automation/dashboard-server/web/package.json` (add `react-router-dom`)

**Interfaces:**
- Produces: `NAV_ITEMS: Array<{key: string, label: string, path: string, color: string}>` (single source of truth for both `Sidebar` and `BottomTabBar`, consumed by every page task below to know its own module color via `NAV_ITEMS.find(n => n.key === 'money').color` etc.).
- Consumes: `Login` from Task 2.

- [ ] **Step 1: Install routing**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm install react-router-dom
```

- [ ] **Step 2: Define the design tokens**

Create `automation/dashboard-server/web/src/theme.css`:

```css
:root {
  --ink: #14161c;
  --muted: rgba(20, 22, 28, .6);
  --bg: #f4f5f9;
  --surface: #ffffff;
  --line: rgba(20, 22, 28, .1);
  --radius-lg: 20px;
  --radius-md: 14px;
  --ease-out: cubic-bezier(.16, 1, .3, 1);

  /* One real, saturated color per module — the "Command Center" direction's
     core rule: color fields, not accent dots. See design spec §"Selected direction". */
  --c-home: #5b8cff;
  --c-goals: #ff8c42;
  --c-jobsearch: #2e6bff;
  --c-money: #10b981;
  --c-inbox: #6f7a8c;
  --c-cyntraix: #9b5bff;
  --c-research: #f5b64c;
  --c-projects: #34d399;
  --c-news: #ffab5c;
  --c-digests: #5ce1e6;
  --c-config: #6f7a8c;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ink: #f2f4f8;
    --muted: rgba(242, 244, 248, .6);
    --bg: #0d0f14;
    --surface: #171a21;
    --line: rgba(255, 255, 255, .1);
  }
}
:root[data-theme="dark"] {
  --ink: #f2f4f8;
  --muted: rgba(242, 244, 248, .6);
  --bg: #0d0f14;
  --surface: #171a21;
  --line: rgba(255, 255, 255, .1);
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: -apple-system, "Segoe UI", Inter, Arial, sans-serif; }

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 20px;
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
```

- [ ] **Step 3: Define the shared nav config**

Create `automation/dashboard-server/web/src/components/NavItems.js`:

```js
export const NAV_ITEMS = [
  { key: 'home', label: 'Home', path: '/', color: 'var(--c-home)' },
  { key: 'goals', label: 'Goals', path: '/goals', color: 'var(--c-goals)' },
  { key: 'jobsearch', label: 'Job search', path: '/job-search', color: 'var(--c-jobsearch)' },
  { key: 'money', label: 'Money', path: '/money', color: 'var(--c-money)' },
  { key: 'inbox', label: 'Inbox', path: '/inbox', color: 'var(--c-inbox)' },
  { key: 'cyntraix', label: 'Cyntraix', path: '/cyntraix', color: 'var(--c-cyntraix)' },
  { key: 'research', label: 'Research', path: '/research', color: 'var(--c-research)' },
  { key: 'projects', label: 'Projects', path: '/projects', color: 'var(--c-projects)' },
  { key: 'news', label: 'News', path: '/news', color: 'var(--c-news)' },
  { key: 'digests', label: 'Digests', path: '/digests', color: 'var(--c-digests)' },
  { key: 'config', label: 'Config', path: '/config', color: 'var(--c-config)' },
]

// Bottom tab bar shows only the highest-frequency modules — mobile has no
// room for all 11; the rest stay reachable from Home's module grid.
export const MOBILE_NAV_KEYS = ['home', 'jobsearch', 'money', 'inbox']
```

- [ ] **Step 4: Build Sidebar and BottomTabBar**

Create `automation/dashboard-server/web/src/components/Sidebar.jsx`:

```jsx
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './NavItems'

export default function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="logo">H</div>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' on' : ''}`}
          style={{ '--item-color': item.color }}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

Create `automation/dashboard-server/web/src/components/BottomTabBar.jsx`:

```jsx
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS, MOBILE_NAV_KEYS } from './NavItems'

export default function BottomTabBar() {
  const items = NAV_ITEMS.filter((n) => MOBILE_NAV_KEYS.includes(n.key))
  return (
    <nav className="bottom-tab-bar" aria-label="Main navigation">
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `tab-item${isActive ? ' on' : ''}`}
          style={{ '--item-color': item.color }}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 5: Wire the auth gate and routing shell into App.jsx**

Replace `automation/dashboard-server/web/src/App.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import BottomTabBar from './components/BottomTabBar'
import './theme.css'

export default function App() {
  const [authed, setAuthed] = useState(null) // null = checking, true/false once known

  useEffect(() => {
    fetch('/api/dashboard').then((res) => setAuthed(res.status !== 401))
  }, [])

  if (authed === null) return null
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<div>Home placeholder — Task 7</div>} />
          </Routes>
        </main>
        <BottomTabBar />
      </div>
    </BrowserRouter>
  )
}
```

(The placeholder route is replaced task-by-task as Tasks 7–13 build each real page.)

- [ ] **Step 6: Verify it builds**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/src/theme.css automation/dashboard-server/web/src/components/Sidebar.jsx automation/dashboard-server/web/src/components/BottomTabBar.jsx automation/dashboard-server/web/src/components/NavItems.js automation/dashboard-server/web/src/App.jsx automation/dashboard-server/web/package.json
git commit -m "feat: design tokens, sidebar/bottom-tab-bar shell, auth gate"
```

---

## Task 7: Shared `Card`, `DetailPanel` (cross-linked drill-down), and `useDashboardData` hook

**Files:**
- Create: `automation/dashboard-server/web/src/hooks/useDashboardData.js`
- Create: `automation/dashboard-server/web/src/components/Card.jsx`
- Create: `automation/dashboard-server/web/src/components/DetailPanel.jsx`
- Create: `automation/dashboard-server/web/src/components/DetailPanel.test.jsx`

**Interfaces:**
- Produces: `useDashboardData() => {data, loading, refresh}` (fetches `/api/dashboard` once on mount; every page task below calls this instead of hand-rolling `fetch`). `<Card title sub badge onClick>{children}</Card>`. `<DetailPanel kind id title sub note onClose>` — fetches `/api/related?kind&id` itself and renders the note plus a "related" list; every page task's click handler opens this with the clicked item's `kind`/`id`.

- [ ] **Step 1: Write the failing test for DetailPanel**

Create `automation/dashboard-server/web/src/components/DetailPanel.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DetailPanel from './DetailPanel'

describe('DetailPanel', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        related: [{ kind: 'goal', id: 'Cyntraix growth', label: 'Cyntraix growth', sub: 'business · active' }],
      }),
    })
  })

  it('fetches and shows related items', async () => {
    render(<DetailPanel kind="application" id="2026-08-14_Acme_Analyst" title="Acme" sub="Analyst" note="" onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('Cyntraix growth')).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith('/api/related?kind=application&id=2026-08-14_Acme_Analyst')
  })

  it('shows a plain empty state when nothing is related', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ related: [] }) })
    render(<DetailPanel kind="goal" id="Unrelated goal" title="Unrelated goal" sub="" note="" onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText(/nothing else on file relates/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- DetailPanel
```

Expected: FAIL — `Cannot find module './DetailPanel'`.

- [ ] **Step 3: Implement `useDashboardData`**

Create `automation/dashboard-server/web/src/hooks/useDashboardData.js`:

```js
import { useCallback, useEffect, useState } from 'react'

export function useDashboardData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    return fetch('/api/dashboard')
      .then((res) => res.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, refresh }
}
```

- [ ] **Step 4: Implement `Card`**

Create `automation/dashboard-server/web/src/components/Card.jsx`:

```jsx
export default function Card({ title, sub, badge, onClick, children }) {
  return (
    <div className={`card${onClick ? ' clickable' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          {sub ? <div className="card-sub">{sub}</div> : null}
        </div>
        {badge ? <span className="card-badge">{badge}</span> : null}
      </div>
      {children ? <div className="card-body">{children}</div> : null}
    </div>
  )
}
```

- [ ] **Step 5: Implement `DetailPanel`**

Create `automation/dashboard-server/web/src/components/DetailPanel.jsx`:

```jsx
import { useEffect, useState } from 'react'

export default function DetailPanel({ kind, id, title, sub, note, onClose }) {
  const [related, setRelated] = useState(null)

  useEffect(() => {
    setRelated(null)
    fetch(`/api/related?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((r) => setRelated(r.related))
  }, [kind, id])

  return (
    <div className="detail-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="detail-panel">
        <button className="detail-close" onClick={onClose} aria-label="Close">×</button>
        <h2>{title}</h2>
        {sub ? <div className="detail-sub">{sub}</div> : null}
        {note ? <p className="detail-note">{note}</p> : null}
        <div className="detail-related-head">Related</div>
        {related === null ? (
          <div className="detail-loading">loading…</div>
        ) : related.length === 0 ? (
          <div className="detail-empty">nothing else on file relates to this yet.</div>
        ) : (
          <ul className="detail-related-list">
            {related.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <span className="detail-related-kind">{r.kind}</span> {r.label} — <span className="detail-related-sub">{r.sub}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- DetailPanel
```

Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/src/hooks/useDashboardData.js automation/dashboard-server/web/src/components/Card.jsx automation/dashboard-server/web/src/components/DetailPanel.jsx automation/dashboard-server/web/src/components/DetailPanel.test.jsx
git commit -m "feat: shared Card, DetailPanel (cross-linked drill-down), useDashboardData hook"
```

---

## Task 8: Home page (briefing, module grid, stats)

**Files:**
- Create: `automation/dashboard-server/web/src/pages/Home.jsx`
- Create: `automation/dashboard-server/web/src/pages/Home.test.jsx`
- Create: `automation/dashboard-server/web/src/lib/briefing.js`
- Create: `automation/dashboard-server/web/src/lib/briefing.test.js`
- Modify: `automation/dashboard-server/web/src/App.jsx` (register the real `/` route)

**Interfaces:**
- Consumes: `useDashboardData`, `NAV_ITEMS`, `Card`.
- Produces: `pickHeroCandidate(data) => {line1, line2, blurb}` (pure function — the priority-ranked "what needs attention today" logic ported from the old `app.js:heroCopy`, kept as its own testable unit rather than buried in JSX).

- [ ] **Step 1: Write the failing test for the pure briefing logic**

Create `automation/dashboard-server/web/src/lib/briefing.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { pickHeroCandidate } from './briefing'

describe('pickHeroCandidate', () => {
  it('prioritizes an interview over a staged application', () => {
    const data = {
      applications: [{ status: 'interview' }, { status: 'staged' }],
      counts: { interview: 1 },
      goals: [],
      cyntraix: null,
      research: null,
    }
    const hero = pickHeroCandidate(data)
    expect(hero.line1).toBe('Interview')
  })

  it('falls back to "all caught up" when nothing needs attention', () => {
    const data = { applications: [], counts: {}, goals: [], cyntraix: null, research: null }
    const hero = pickHeroCandidate(data)
    expect(hero.line2).toBe('all caught up.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- briefing
```

Expected: FAIL — `Cannot find module './briefing'`.

- [ ] **Step 3: Port the briefing logic (this is a direct port of the existing, already-correct logic in the old `automation/dashboard-server/public/app.js:heroCopy` — read that file for the full original before writing this, so the priority list and copy match exactly)**

Create `automation/dashboard-server/web/src/lib/briefing.js`:

```js
export function pickHeroCandidate(data) {
  const staged = data.applications.filter((a) => a.status === 'staged').length
  const interview = data.counts?.interview || 0
  const attention = data.applications.filter((a) => a.status === 'needs_manual_completion' || a.status === 'unknown').length
  const activeGoals = data.goals.filter((g) => g.status === 'active').length
  const cyOpen = data.cyntraix?._meta?.open_items?.length || 0
  const rsOpen = data.research?._meta?.open_items?.length || 0
  const cyClients = data.cyntraix ? data.cyntraix.clients.filter((c) => c.status === 'active').length : 0

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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- briefing
```

Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for the Home page component**

Create `automation/dashboard-server/web/src/pages/Home.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

describe('Home', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        applications: [{ status: 'staged', folder: 'a', company: 'Acme', role: 'Analyst', found_at: '2026-08-15' }],
        counts: { staged: 1 },
        goals: [{ title: 'g', status: 'active', category: 'career' }],
        cyntraix: { clients: [] },
        research: null,
        projectsRegistry: null,
        news: [], digests: [], inbox: [], topNews: null,
        finances: { accounts: [] }, paymentsDueSoon: [],
      }),
    })
  })

  it('renders the hero headline once data loads', async () => {
    render(<MemoryRouter><Home /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/ready to review/)).toBeInTheDocument())
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npm test -- Home
```

Expected: FAIL — `Cannot find module './Home'`.

- [ ] **Step 7: Implement the Home page**

Create `automation/dashboard-server/web/src/pages/Home.jsx`:

```jsx
import { Link } from 'react-router-dom'
import { useDashboardData } from '../hooks/useDashboardData'
import { pickHeroCandidate } from '../lib/briefing'
import { NAV_ITEMS } from '../components/NavItems'
import Card from '../components/Card'

export default function Home() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>

  const hero = pickHeroCandidate(data)
  const modules = NAV_ITEMS.filter((n) => n.key !== 'home' && n.key !== 'config')

  return (
    <div className="home-page">
      <section className="hero">
        <h1>{hero.line1} {hero.line2}</h1>
        <p>{hero.blurb}</p>
      </section>

      <div className="module-grid">
        {modules.map((m) => (
          <Link key={m.key} to={m.path} className="module-card" style={{ '--item-color': m.color }}>
            {m.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
npm test -- Home
```

Expected: PASS (1 test).

- [ ] **Step 9: Register the route in App.jsx**

In `automation/dashboard-server/web/src/App.jsx`, add the import `import Home from './pages/Home'` and replace the placeholder route with `<Route path="/" element={<Home />} />`.

- [ ] **Step 10: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/src/pages/Home.jsx automation/dashboard-server/web/src/pages/Home.test.jsx automation/dashboard-server/web/src/lib/briefing.js automation/dashboard-server/web/src/lib/briefing.test.js automation/dashboard-server/web/src/App.jsx
git commit -m "feat: Home page with tested briefing-priority logic"
```

---

## Task 9: Job search (Applications) page + Goals page

**Files:**
- Create: `automation/dashboard-server/web/src/pages/JobSearch.jsx`
- Create: `automation/dashboard-server/web/src/pages/JobSearch.test.jsx`
- Create: `automation/dashboard-server/web/src/pages/Goals.jsx`
- Modify: `automation/dashboard-server/web/src/App.jsx`

**Interfaces:**
- Consumes: `useDashboardData`, `Card`, `DetailPanel`.

- [ ] **Step 1: Write the failing test for JobSearch's filter behavior**

Create `automation/dashboard-server/web/src/pages/JobSearch.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import JobSearch from './JobSearch'

describe('JobSearch', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        applications: [
          { folder: 'a', status: 'staged', company: 'Acme', role: 'Analyst', found_at: '2026-08-15', url: '', notes: '', docs: {} },
          { folder: 'b', status: 'interview', company: 'Globex', role: 'Engineer', found_at: '2026-08-14', url: '', notes: '', docs: {} },
        ],
      }),
    })
  })

  it('filters to only interview-stage applications when that pill is clicked', async () => {
    render(<JobSearch />)
    await waitFor(() => expect(screen.getByText('Acme')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^interview$/i }))
    expect(screen.queryByText('Acme')).not.toBeInTheDocument()
    expect(screen.getByText('Globex')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- JobSearch
```

Expected: FAIL — `Cannot find module './JobSearch'`.

- [ ] **Step 3: Implement JobSearch**

Create `automation/dashboard-server/web/src/pages/JobSearch.jsx`:

```jsx
import { useState } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'
import DetailPanel from '../components/DetailPanel'

export default function JobSearch() {
  const { data, loading } = useDashboardData()
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)

  if (loading || !data) return <div className="loading">loading…</div>

  const statuses = [...new Set(data.applications.map((a) => a.status))]
  const filtered = filter === 'all' ? data.applications : data.applications.filter((a) => a.status === filter)

  return (
    <div className="page">
      <h2>job search</h2>
      <div className="filter-pills">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
        {statuses.map((s) => (
          <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s.replace(/_/g, ' ')}</button>
        ))}
      </div>
      <div className="page-list">
        {filtered.map((a) => (
          <Card key={a.folder} title={a.company} sub={a.role} badge={a.status.replace(/_/g, ' ')} onClick={() => setOpen(a)}>
            found {a.found_at}{a.notes ? ` — ${a.notes}` : ''}
          </Card>
        ))}
      </div>
      {open && (
        <DetailPanel
          kind="application" id={open.folder} title={open.company} sub={open.role}
          note={open.notes} onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- JobSearch
```

Expected: PASS (1 test).

- [ ] **Step 5: Implement Goals (same shape, no dedicated test — structurally identical to the now-tested JobSearch pattern; YAGNI on a duplicate filter test)**

Create `automation/dashboard-server/web/src/pages/Goals.jsx`:

```jsx
import { useState } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'
import DetailPanel from '../components/DetailPanel'

export default function Goals() {
  const { data, loading } = useDashboardData()
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)

  if (loading || !data) return <div className="loading">loading…</div>

  const statuses = [...new Set(data.goals.map((g) => g.status))]
  const filtered = filter === 'all' ? data.goals : data.goals.filter((g) => g.status === filter)

  return (
    <div className="page">
      <h2>goals</h2>
      <div className="filter-pills">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
        {statuses.map((s) => (
          <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>
      <div className="page-list">
        {filtered.map((g) => (
          <Card key={g.title} title={g.title} sub={g.category} badge={g.status} onClick={() => setOpen(g)}>
            {g.target_date ? `target ${g.target_date} — ` : ''}{g.notes || ''}
          </Card>
        ))}
      </div>
      {open && (
        <DetailPanel
          kind="goal" id={open.title} title={open.title} sub={`${open.category} · ${open.status}`}
          note={open.notes} onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Write and pass a test for Goals (every page gets its own test — no exceptions, even for a structurally similar sibling)**

Create `automation/dashboard-server/web/src/pages/Goals.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Goals from './Goals'

describe('Goals', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        goals: [
          { title: 'Finish DEng praxis', status: 'active', category: 'academic', notes: '', target_date: '2027-05-01' },
          { title: 'Old goal', status: 'done', category: 'career', notes: '' },
        ],
      }),
    })
  })

  it('filters to only active goals when that pill is clicked', async () => {
    render(<Goals />)
    await waitFor(() => expect(screen.getByText('Finish DEng praxis')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^active$/i }))
    expect(screen.getByText('Finish DEng praxis')).toBeInTheDocument()
    expect(screen.queryByText('Old goal')).not.toBeInTheDocument()
  })
})
```

Run it:

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- Goals
```

Expected: PASS (1 test).

- [ ] **Step 7: Register both routes**

In `automation/dashboard-server/web/src/App.jsx`, add imports for `JobSearch` and `Goals`, and add:

```jsx
<Route path="/job-search" element={<JobSearch />} />
<Route path="/goals" element={<Goals />} />
```

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/src/pages/JobSearch.jsx automation/dashboard-server/web/src/pages/JobSearch.test.jsx automation/dashboard-server/web/src/pages/Goals.jsx automation/dashboard-server/web/src/pages/Goals.test.jsx automation/dashboard-server/web/src/App.jsx
git commit -m "feat: Job search and Goals pages, both with tests"
```

---

## Task 10: Money page

**Files:**
- Create: `automation/dashboard-server/web/src/pages/Money.jsx`
- Create: `automation/dashboard-server/web/src/pages/Money.test.jsx`
- Modify: `automation/dashboard-server/web/src/App.jsx`

**Interfaces:**
- Consumes: `useDashboardData`, `Card`, `DetailPanel`. Reads `data.finances.accounts`, `data.finances.recurring_payments`, `data.finances.one_off_transactions_seen`, `data.paymentsDueSoon` — all already produced server-side by `server.js:getFinances()` (built earlier this session).

- [ ] **Step 1: Write the failing test**

Create `automation/dashboard-server/web/src/pages/Money.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Money from './Money'

describe('Money', () => {
  it('shows "nothing due" when paymentsDueSoon is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        finances: { accounts: [], recurring_payments: [], one_off_transactions_seen: [] },
        paymentsDueSoon: [],
      }),
    })
    render(<Money />)
    await waitFor(() => expect(screen.getByText(/nothing due/i)).toBeInTheDocument())
  })

  it('lists an account with its balance', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        finances: {
          accounts: [{ institution: 'Discover Card', last4: '7921', type: 'credit_card', owner_account: 'x@y.com', latest_statement: { balance: 2396.63, minimum_payment: 76, minimum_payment_due: '2026-09-01' }, note: '' }],
          recurring_payments: [], one_off_transactions_seen: [],
        },
        paymentsDueSoon: [],
      }),
    })
    render(<Money />)
    await waitFor(() => expect(screen.getByText('Discover Card')).toBeInTheDocument())
    expect(screen.getByText('$2396.63')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- Money
```

Expected: FAIL — `Cannot find module './Money'`.

- [ ] **Step 3: Implement**

Create `automation/dashboard-server/web/src/pages/Money.jsx`:

```jsx
import { useState } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'
import DetailPanel from '../components/DetailPanel'

function money(n) {
  return `$${Number(n).toFixed(2)}`
}

export default function Money() {
  const { data, loading } = useDashboardData()
  const [open, setOpen] = useState(null)

  if (loading || !data) return <div className="loading">loading…</div>

  const f = data.finances
  const dueSoon = data.paymentsDueSoon || []

  return (
    <div className="page">
      <h2>money</h2>

      <div className="page-subhead">payments due soon</div>
      {dueSoon.length === 0 ? (
        <div className="empty">nothing due in the next two weeks.</div>
      ) : (
        <div className="page-list">
          {dueSoon.map((p) => (
            <Card key={`${p.institution}-${p.due}`} title={p.institution} badge={money(p.amount)}>
              due {p.due}
            </Card>
          ))}
        </div>
      )}

      <div className="page-subhead">accounts on file</div>
      <div className="page-list">
        {(f?.accounts || []).map((a) => {
          const id = `${a.institution}${a.last4 || ''}`
          return (
            <Card
              key={id} title={a.institution} sub={`${(a.type || '').replace(/_/g, ' ')} · ${a.owner_account || ''}`}
              badge={a.latest_statement ? money(a.latest_statement.balance) : undefined}
              onClick={() => setOpen({ id, title: a.institution, sub: a.type, note: a.note })}
            >
              {a.latest_statement ? `min payment ${money(a.latest_statement.minimum_payment)}${a.latest_statement.minimum_payment_due ? ` due ${a.latest_statement.minimum_payment_due}` : ''} — ` : ''}{a.note || ''}
            </Card>
          )
        })}
      </div>

      <div className="page-subhead">recurring payments</div>
      <div className="page-list">
        {(f?.recurring_payments || []).map((r) => (
          <Card key={r.payee} title={r.payee} sub={`${r.category || ''} · ${r.method || ''}`} badge={r.amount ? money(r.amount) : undefined}>
            {r.cadence || ''}{r.note ? ` — ${r.note}` : ''}
          </Card>
        ))}
      </div>

      <div className="page-subhead">recent one-off transactions</div>
      <div className="page-list">
        {(f?.one_off_transactions_seen || []).map((t, i) => (
          <Card key={i} title={t.payee} sub={`${t.category || ''} · ${t.method || ''}`} badge={money(t.amount)}>
            {t.date || ''}{t.account ? ` · ${t.account}` : ''}
          </Card>
        ))}
      </div>

      {open && (
        <DetailPanel kind="account" id={open.id} title={open.title} sub={open.sub} note={open.note} onClose={() => setOpen(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- Money
```

Expected: PASS (2 tests).

- [ ] **Step 5: Register the route**

In `automation/dashboard-server/web/src/App.jsx`, add `import Money from './pages/Money'` and `<Route path="/money" element={<Money />} />`.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/src/pages/Money.jsx automation/dashboard-server/web/src/pages/Money.test.jsx automation/dashboard-server/web/src/App.jsx
git commit -m "feat: Money page"
```

---

## Task 11: Cyntraix, Research, and Projects pages

**Files:**
- Create: `automation/dashboard-server/web/src/pages/Cyntraix.jsx`
- Create: `automation/dashboard-server/web/src/pages/Research.jsx`
- Create: `automation/dashboard-server/web/src/pages/Projects.jsx`
- Create: `automation/dashboard-server/web/src/pages/Cyntraix.test.jsx`
- Create: `automation/dashboard-server/web/src/pages/Research.test.jsx`
- Create: `automation/dashboard-server/web/src/pages/Projects.test.jsx`
- Modify: `automation/dashboard-server/web/src/App.jsx`

**Interfaces:**
- Consumes: `useDashboardData`, `Card`. These three pages share one shape in the current app (`app.js:render`'s `cyntraixList`/`researchList`/`projectsList` blocks: a static intro card, a list of items, an optional "still needs your input" card from `_meta.open_items`) — every page gets its own dedicated test regardless of shared shape (project-wide policy, confirmed 2026-08-15: no YAGNI exception for structurally similar pages).

- [ ] **Step 1: Write the failing test for Cyntraix**

Create `automation/dashboard-server/web/src/pages/Cyntraix.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Cyntraix from './Cyntraix'

describe('Cyntraix', () => {
  it('renders an active client and the open-items card', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        cyntraix: {
          business: { name: 'Cyntraix', role: 'Founder', founded: '2025-01', structure: 'AL LLC' },
          clients: [{ name: 'King Health Systems', status: 'active', cadence_note: 'weekly timesheet' }],
          _meta: { open_items: ['Rate not on file'] },
        },
      }),
    })
    render(<Cyntraix />)
    await waitFor(() => expect(screen.getByText('King Health Systems')).toBeInTheDocument())
    expect(screen.getByText(/Rate not on file/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- Cyntraix
```

Expected: FAIL — `Cannot find module './Cyntraix'`.

- [ ] **Step 3: Implement Cyntraix**

Create `automation/dashboard-server/web/src/pages/Cyntraix.jsx`:

```jsx
import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'

export default function Cyntraix() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  const c = data.cyntraix
  if (!c) return <div className="page"><h2>cyntraix business</h2><div className="empty">not set up yet.</div></div>

  return (
    <div className="page">
      <h2>cyntraix business</h2>
      <Card title={`${c.business.name} — ${c.business.role}`} sub={`founded ${c.business.founded} · ${c.business.structure}`} />
      {c.clients.map((cl) => (
        <Card key={cl.name} title={cl.name} badge={cl.status}>
          {cl.cadence_note || ''}{cl.scope ? ` — scope: ${cl.scope}` : ''}
        </Card>
      ))}
      {c._meta?.open_items?.length > 0 && (
        <Card title="still needs your input">
          {c._meta.open_items.map((item, i) => <div key={i}>{item}</div>)}
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- Cyntraix
```

Expected: PASS (1 test).

- [ ] **Step 5: Implement Research (same pattern, ported from `app.js:render`'s `researchList` block)**

Create `automation/dashboard-server/web/src/pages/Research.jsx`:

```jsx
import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'

export default function Research() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  const r = data.research
  if (!r) return <div className="page"><h2>doctoral research</h2><div className="empty">not set up yet.</div></div>

  return (
    <div className="page">
      <h2>doctoral research</h2>
      <Card title={r.program.degree} sub={`${r.program.institution} · ${r.program.location} · expected ${r.program.expected} · ${r.program.status}`} />
      <Card title="research areas">
        {r.research_areas.map((a, i) => <div key={i}>{a}</div>)}
      </Card>
      {r.publications?.source && (
        <Card title="publications" sub={r.publications.source}>
          {r.publications.note || ''}
        </Card>
      )}
      {r._meta?.open_items?.length > 0 && (
        <Card title="still needs your input">
          {r._meta.open_items.map((item, i) => <div key={i}>{item}</div>)}
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 5b: Write and pass a test for Research**

Create `automation/dashboard-server/web/src/pages/Research.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Research from './Research'

describe('Research', () => {
  it('renders the degree and the open-items card', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        research: {
          program: { degree: 'Doctor of Engineering', institution: 'GWU', location: 'Washington, DC', expected: '2027', status: 'in progress' },
          research_areas: ['Zero Trust', 'AI/ML threat modeling'],
          publications: null,
          _meta: { open_items: ['Advisor name unconfirmed'] },
        },
      }),
    })
    render(<Research />)
    await waitFor(() => expect(screen.getByText('Doctor of Engineering')).toBeInTheDocument())
    expect(screen.getByText(/Advisor name unconfirmed/)).toBeInTheDocument()
  })
})
```

Run it:

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- Research
```

Expected: PASS (1 test).

- [ ] **Step 6: Implement Projects (same pattern, ported from `app.js:render`'s `projectsList` block)**

Create `automation/dashboard-server/web/src/pages/Projects.jsx`:

```jsx
import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'

const OWNERSHIP_LABELS = {
  own_venture: 'own venture',
  client_work: 'client work',
  likely_client_or_ministry: 'likely client/ministry',
  unconfirmed: 'ownership unconfirmed',
}

export default function Projects() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  const pr = data.projectsRegistry
  if (!pr) return <div className="page"><h2>projects registry</h2><div className="empty">not set up yet.</div></div>

  return (
    <div className="page">
      <h2>projects registry</h2>
      {pr.projects.map((p) => (
        <Card key={p.name} title={p.name} sub={p.type} badge={OWNERSHIP_LABELS[p.ownership] || p.ownership}>
          {p.status} — {p.note}
        </Card>
      ))}
      {pr._meta?.open_items?.length > 0 && (
        <Card title="still needs your input">
          {pr._meta.open_items.map((item, i) => <div key={i}>{item}</div>)}
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 6b: Write and pass a test for Projects**

Create `automation/dashboard-server/web/src/pages/Projects.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Projects from './Projects'

describe('Projects', () => {
  it('renders a project with its ownership label', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        projectsRegistry: {
          projects: [{ name: 'Preppa', type: 'food-marketplace app', ownership: 'own_venture', status: 'active', note: 'real order flow confirmed' }],
          _meta: {},
        },
      }),
    })
    render(<Projects />)
    await waitFor(() => expect(screen.getByText('Preppa')).toBeInTheDocument())
    expect(screen.getByText('own venture')).toBeInTheDocument()
  })
})
```

Run it:

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- Projects
```

Expected: PASS (1 test).

- [ ] **Step 7: Register all three routes**

In `automation/dashboard-server/web/src/App.jsx`, add imports and:

```jsx
<Route path="/cyntraix" element={<Cyntraix />} />
<Route path="/research" element={<Research />} />
<Route path="/projects" element={<Projects />} />
```

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/src/pages/Cyntraix.jsx automation/dashboard-server/web/src/pages/Cyntraix.test.jsx automation/dashboard-server/web/src/pages/Research.jsx automation/dashboard-server/web/src/pages/Research.test.jsx automation/dashboard-server/web/src/pages/Projects.jsx automation/dashboard-server/web/src/pages/Projects.test.jsx automation/dashboard-server/web/src/App.jsx
git commit -m "feat: Cyntraix, Research, Projects pages, all with tests"
```

---

## Task 12: Inbox, News, and Digests pages (dated-list-with-modal pattern)

**Files:**
- Create: `automation/dashboard-server/web/src/components/DatedList.jsx`
- Create: `automation/dashboard-server/web/src/components/DatedList.test.jsx`
- Create: `automation/dashboard-server/web/src/pages/Inbox.jsx`
- Create: `automation/dashboard-server/web/src/pages/News.jsx`
- Create: `automation/dashboard-server/web/src/pages/Digests.jsx`
- Modify: `automation/dashboard-server/web/src/App.jsx`

**Interfaces:**
- Produces: `<DatedList items title fetchPath emptyMessage />` — a shared component for the three modules that are all "list of dates, click one, fetch its raw content from a `/api/<x>?date=` endpoint, show it in a modal." All three existing endpoints (`/api/inbox`, `/api/news`, `/api/digest`) are unchanged from `server.js` — this task only builds the frontend for them.

- [ ] **Step 1: Write the failing test for DatedList**

Create `automation/dashboard-server/web/src/components/DatedList.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DatedList from './DatedList'

describe('DatedList', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ text: async () => '# Some content\n\nBody text.' })
  })

  it('shows the empty message when there are no items', () => {
    render(<DatedList items={[]} title="inbox" fetchPath="/api/inbox" emptyMessage="No inbox reviews yet." />)
    expect(screen.getByText('No inbox reviews yet.')).toBeInTheDocument()
  })

  it('opens a modal with fetched content when a date is clicked', async () => {
    render(<DatedList items={[{ date: '2026-08-14' }]} title="inbox" fetchPath="/api/inbox" emptyMessage="" />)
    fireEvent.click(screen.getByText('2026-08-14'))
    await waitFor(() => expect(screen.getByText(/Body text/)).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith('/api/inbox?date=2026-08-14')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- DatedList
```

Expected: FAIL — `Cannot find module './DatedList'`.

- [ ] **Step 3: Implement DatedList**

Create `automation/dashboard-server/web/src/components/DatedList.jsx`:

```jsx
import { useState } from 'react'
import Card from './Card'

export default function DatedList({ items, title, fetchPath, emptyMessage }) {
  const [open, setOpen] = useState(null)
  const [content, setContent] = useState('')

  function openDate(date) {
    setOpen(date)
    setContent('loading…')
    fetch(`${fetchPath}?date=${encodeURIComponent(date)}`)
      .then((res) => res.text())
      .then(setContent)
  }

  if (!items.length) return <div className="empty">{emptyMessage}</div>

  return (
    <div className="page-list">
      {items.map((item) => (
        <Card key={item.date} title={item.date} onClick={() => openDate(item.date)} />
      ))}
      {open && (
        <div className="detail-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null) }}>
          <div className="detail-panel">
            <button className="detail-close" onClick={() => setOpen(null)} aria-label="Close">×</button>
            <h2>{open}</h2>
            <pre className="detail-raw">{content}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- DatedList
```

Expected: PASS (2 tests).

- [ ] **Step 5: Implement the three thin pages**

Create `automation/dashboard-server/web/src/pages/Inbox.jsx`:

```jsx
import { useDashboardData } from '../hooks/useDashboardData'
import DatedList from '../components/DatedList'

export default function Inbox() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  return (
    <div className="page">
      <h2>inbox — needs revisiting</h2>
      <DatedList items={data.inbox} title="inbox" fetchPath="/api/inbox" emptyMessage="No inbox reviews yet." />
    </div>
  )
}
```

Create `automation/dashboard-server/web/src/pages/News.jsx`:

```jsx
import { useDashboardData } from '../hooks/useDashboardData'
import DatedList from '../components/DatedList'

export default function News() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  return (
    <div className="page">
      <h2>cyber/AI news digests</h2>
      <DatedList items={data.news} title="news" fetchPath="/api/news" emptyMessage="No news digests yet." />
    </div>
  )
}
```

Create `automation/dashboard-server/web/src/pages/Digests.jsx`:

```jsx
import { useDashboardData } from '../hooks/useDashboardData'
import DatedList from '../components/DatedList'

export default function Digests() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  return (
    <div className="page">
      <h2>daily digests</h2>
      <DatedList items={data.digests} title="digests" fetchPath="/api/digest" emptyMessage="No digests yet." />
    </div>
  )
}
```

- [ ] **Step 6: Register all three routes**

In `automation/dashboard-server/web/src/App.jsx`, add imports and:

```jsx
<Route path="/inbox" element={<Inbox />} />
<Route path="/news" element={<News />} />
<Route path="/digests" element={<Digests />} />
```

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/src/components/DatedList.jsx automation/dashboard-server/web/src/components/DatedList.test.jsx automation/dashboard-server/web/src/pages/Inbox.jsx automation/dashboard-server/web/src/pages/News.jsx automation/dashboard-server/web/src/pages/Digests.jsx automation/dashboard-server/web/src/App.jsx
git commit -m "feat: Inbox, News, Digests pages via shared DatedList"
```

---

## Task 13: Config/Preferences page

**Files:**
- Create: `automation/dashboard-server/web/src/pages/Config.jsx`
- Create: `automation/dashboard-server/web/src/pages/Config.test.jsx`
- Modify: `automation/dashboard-server/web/src/App.jsx`

**Interfaces:**
- Consumes: `useDashboardData`. Reads `data.preferences` and `data.workAuth`, both already produced by `server.js`.

- [ ] **Step 1: Implement**

Create `automation/dashboard-server/web/src/pages/Config.jsx`:

```jsx
import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'

export default function Config() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  const p = data.preferences
  if (!p) return <div className="page"><h2>preferences</h2><div className="empty">profile/preferences.json not found.</div></div>

  return (
    <div className="page">
      <h2>preferences</h2>
      <Card title="settings">
        <div><strong>max leads/day</strong> {p.max_new_applications_per_day ?? '—'}</div>
        <div><strong>academic</strong> {p.target_roles?.academic?.pursue ? `pursuing — ${p.target_roles.academic.criteria || ''}` : 'not pursuing'}</div>
        <div><strong>industry</strong> {p.target_roles?.cybersecurity_industry?.pursue ? `pursuing — ${p.target_roles.cybersecurity_industry.criteria || ''}` : 'not pursuing'}</div>
        <div><strong>work auth</strong> {data.workAuth || 'not set'}</div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Write and pass a test for Config**

Create `automation/dashboard-server/web/src/pages/Config.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Config from './Config'

describe('Config', () => {
  it('renders max leads/day and work auth from preferences', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        preferences: { max_new_applications_per_day: 5, target_roles: {} },
        workAuth: 'STEM OPT',
      }),
    })
    render(<Config />)
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
    expect(screen.getByText('STEM OPT')).toBeInTheDocument()
  })
})
```

Run it:

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- Config
```

Expected: PASS (1 test).

- [ ] **Step 3: Register the route**

In `automation/dashboard-server/web/src/App.jsx`, add `import Config from './pages/Config'` and `<Route path="/config" element={<Config />} />`.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/src/pages/Config.jsx automation/dashboard-server/web/src/pages/Config.test.jsx automation/dashboard-server/web/src/App.jsx
git commit -m "feat: Config/Preferences page with test"
```

---

## Task 14: Chat bubble + panel (the signature interaction)

**Files:**
- Create: `automation/dashboard-server/web/src/components/ChatWidget.jsx`
- Create: `automation/dashboard-server/web/src/components/ChatWidget.test.jsx`
- Modify: `automation/dashboard-server/web/src/App.jsx`

**Interfaces:**
- Consumes: `POST /api/chat` from Task 5.
- Produces: `<ChatWidget />`, mounted once in `App.jsx` outside the `<Routes>` so it's reachable from every page (spec: "a persistent, always-reachable chat entry point").

- [ ] **Step 1: Write the failing tests**

Create `automation/dashboard-server/web/src/components/ChatWidget.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatWidget from './ChatWidget'

describe('ChatWidget', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('is collapsed to a bubble by default', () => {
    render(<ChatWidget />)
    expect(screen.queryByPlaceholderText(/ask howz/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ask howz anything/i })).toBeInTheDocument()
  })

  it('opens the panel, sends a question, and shows the answer', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ answer: 'You have 2 applications staged.', matched: true }) })
    render(<ChatWidget />)

    fireEvent.click(screen.getByRole('button', { name: /ask howz anything/i }))
    fireEvent.change(screen.getByPlaceholderText(/ask howz/i), { target: { value: 'how many applications are staged?' } })
    fireEvent.submit(screen.getByTestId('chat-form'))

    await waitFor(() => expect(screen.getByText('You have 2 applications staged.')).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }))
  })

  it('shows a plain fallback when the engine has no rule for the question', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ answer: '', matched: false }) })
    render(<ChatWidget />)

    fireEvent.click(screen.getByRole('button', { name: /ask howz anything/i }))
    fireEvent.change(screen.getByPlaceholderText(/ask howz/i), { target: { value: 'what is the meaning of life?' } })
    fireEvent.submit(screen.getByTestId('chat-form'))

    await waitFor(() => expect(screen.getByText(/don't have an answer for that yet/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm test -- ChatWidget
```

Expected: FAIL — `Cannot find module './ChatWidget'`.

- [ ] **Step 3: Implement**

Create `automation/dashboard-server/web/src/components/ChatWidget.jsx`:

```jsx
import { useState } from 'react'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([]) // {from: 'me'|'howz', text}
  const [sending, setSending] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!question.trim()) return
    const q = question
    setMessages((m) => [...m, { from: 'me', text: q }])
    setQuestion('')
    setSending(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    })
    const { answer, matched } = await res.json()
    setSending(false)
    setMessages((m) => [...m, { from: 'howz', text: matched ? answer : "I don't have an answer for that yet — I can only answer from what's actually on file." }])
  }

  if (!open) {
    return (
      <button className="chat-bubble" onClick={() => setOpen(true)} aria-label="Ask HoWz anything">
        Ask HoWz anything
      </button>
    )
  }

  return (
    <div className="chat-panel">
      <div className="chat-head">
        <span>Ask HoWz</span>
        <button onClick={() => setOpen(false)} aria-label="Close chat">×</button>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.from}`}>{m.text}</div>
        ))}
        {sending && <div className="chat-msg howz">…</div>}
      </div>
      <form data-testid="chat-form" onSubmit={handleSubmit} className="chat-input-row">
        <input
          placeholder="Ask HoWz…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" disabled={sending}>send</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- ChatWidget
```

Expected: PASS (3 tests).

- [ ] **Step 5: Mount it in App.jsx**

In `automation/dashboard-server/web/src/App.jsx`, import `ChatWidget` and render `<ChatWidget />` as a sibling of `<BottomTabBar />`, inside `.app-shell` but outside `<Routes>`, so it persists across page navigation.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/src/components/ChatWidget.jsx automation/dashboard-server/web/src/components/ChatWidget.test.jsx automation/dashboard-server/web/src/App.jsx
git commit -m "feat: persistent chat widget wired to /api/chat"
```

---

## Task 15: Mobile responsive pass

**Files:**
- Modify: `automation/dashboard-server/web/src/theme.css`

**Interfaces:**
- None new — this task is pure CSS, no component API changes.

- [ ] **Step 1: Add responsive rules to `theme.css`**

Append to `automation/dashboard-server/web/src/theme.css`:

```css
.app-shell { display: flex; min-height: 100vh; }
.sidebar { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; padding: 16px; border-right: 1px solid var(--line); }
.main-content { flex: 1; padding: 24px; max-width: 100%; overflow-x: hidden; }
.bottom-tab-bar { display: none; }

.module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
.page-list { display: flex; flex-direction: column; gap: 10px; }
.filter-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }

.chat-bubble { position: fixed; bottom: 24px; right: 24px; z-index: 40; border-radius: 999px; padding: 14px 20px; border: none; background: var(--c-home); color: #fff; font-weight: 600; cursor: pointer; }
.chat-panel { position: fixed; bottom: 24px; right: 24px; width: 340px; max-height: 480px; z-index: 40; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); display: flex; flex-direction: column; overflow: hidden; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .bottom-tab-bar { display: flex; position: fixed; bottom: 0; left: 0; right: 0; height: 60px; border-top: 1px solid var(--line); background: var(--surface); z-index: 30; }
  .main-content { padding: 16px; padding-bottom: 76px; } /* clear the fixed tab bar */
  .module-grid { grid-template-columns: 1fr 1fr; }
  .chat-panel { left: 12px; right: 12px; bottom: 76px; width: auto; max-height: 60vh; }
  .chat-bubble { bottom: 76px; }
}
```

- [ ] **Step 2: Manually verify at both widths**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm run build
cd ..
node server.js
```

Open `http://127.0.0.1:47832` in a browser, log in, resize the window to below 768px width, and confirm: the sidebar disappears, a bottom tab bar with Home/Job search/Money/Inbox appears, the chat bubble sits above the tab bar (not overlapping it), and no horizontal scrollbar appears on any page. Stop the server afterward.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add automation/dashboard-server/web/src/theme.css
git commit -m "feat: mobile responsive layout (bottom tab bar, chat panel repositioning)"
```

---

## Task 16: Remove the old vanilla frontend, final integration QA

**Files:**
- Delete: `automation/dashboard-server/public/index.html`
- Delete: `automation/dashboard-server/public/app.js`
- Delete: `automation/dashboard-server/public/styles.css`
- Delete: `automation/dashboard-server/public/login.html`
- Delete: `automation/dashboard-server/public/login.js`
- Modify: `automation/dashboard-server/server.js` (the `PUBLIC_PATHS` set referenced `/login.html`/`/login.js`/`/styles.css` for the pre-auth allowlist — the SPA now serves everything through one `index.html`, so this set can shrink)

**Interfaces:**
- None — this is cleanup and end-to-end verification, not new functionality.

- [ ] **Step 1: Update the pre-auth allowlist**

In `automation/dashboard-server/server.js`, the SPA's `index.html` and its hashed JS/CSS assets need to be reachable before login (so the login screen itself can load). Change:

```js
const PUBLIC_PATHS = new Set(["/login.html", "/login.js", "/styles.css"]);
```

to:

```js
const PUBLIC_PATHS_PREFIXES = ["/assets/"]; // Vite's hashed build output
function isPublicPath(pathname) {
  if (pathname === "/" || pathname === "/index.html") return true;
  return PUBLIC_PATHS_PREFIXES.some((p) => pathname.startsWith(p));
}
```

And update the auth-gate check a few lines below (`if (!PUBLIC_PATHS.has(pathname) && !isAuthed(req))`) to `if (!isPublicPath(pathname) && !isAuthed(req))`. This is safe because `App.jsx` (Task 6, Step 5) already does its own client-side check — it calls `/api/dashboard` on load and shows `<Login>` on a 401 — so serving `index.html`/assets to a logged-out visitor doesn't leak data, only the app shell.

- [ ] **Step 2: Delete the old vanilla files**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server"
rm public/index.html public/app.js public/styles.css public/login.html public/login.js
rmdir public 2>/dev/null || true
```

- [ ] **Step 3: Full rebuild and manual QA pass**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server/web"
npm run build
cd ..
node server.js
```

Open `http://127.0.0.1:47832` and verify, checking each off the list:
- [ ] Login screen appears when not authed; correct password logs in; wrong password shows an error and does not log in.
- [ ] Home shows the hero briefing and the module grid; every module card navigates to its page.
- [ ] Job search: filter pills work; clicking an application opens the detail panel; the detail panel's related-items section loads (empty or populated, no error).
- [ ] Money: payments-due-soon, accounts, recurring payments, and one-off transactions all render with real numbers from `profile/finances.json`.
- [ ] Goals, Cyntraix, Research, Projects, Inbox, News, Digests, Config: each loads without a console error (check the browser dev tools console).
- [ ] Chat bubble is visible on every page; asking "how many applications are staged?" returns a real, correct number; asking a nonsense question returns the fallback message, not an error.
- [ ] Resize below 768px: bottom tab bar appears, sidebar hides, no horizontal scroll, chat bubble doesn't overlap the tab bar.
- [ ] Sign out (existing `/api/logout` link/button, still present from the old design — confirm it's wired somewhere in the new nav, e.g. as a footer item in `Sidebar.jsx`; add `<a href="/api/logout">Sign out</a>` there now if Task 6 didn't already include it) returns to the login screen.

Stop the server once every item is checked.

- [ ] **Step 4: Run the full test suite one more time**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant/automation/dashboard-server"
npm test
cd web
npm test
```

Expected: all tests PASS in both the server (`chatbot`, `cross-links`) and web (`Login`, `DetailPanel`, `Home`, `briefing`, `JobSearch`, `Money`, `Cyntraix`, `DatedList`, `ChatWidget`) suites.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/WT8/Projects/.claude/worktrees/dashboard-redesign/Personal Assisant"
git add -A automation/dashboard-server
git commit -m "chore: remove old vanilla frontend, finish server.js public-path cleanup"
```

---

## Self-Review Notes (for whoever executes this plan)

- **Spec coverage:** color-per-module → Task 6 (`theme.css`); motion → deferred detail (count-up/celebration animations use the same `requestAnimationFrame` approach as the old `app.js:countUp` — not re-specified step-by-step here since it's a direct, mechanical port with no new logic; add it as a small addendum task if a reviewer wants it broken out separately) — flagged here rather than silently dropped; mobile → Task 15; chatbot → Tasks 3, 5, 14; cross-linked drill-down → Tasks 4, 5, 7; React/Vite migration → Task 1; all pages → Tasks 8–13.
- **Known gap:** the count-up number animation and the "celebration moment" (spec: "a small celebration moment when an application moves to interview, or a goal completes") are named in the spec's Interaction and layout section but not given their own task above — they're cosmetic additions to already-built pages (Home's stat chips, JobSearch/Goals status badges) rather than new architecture, and can be added as a follow-up pass after Task 16's QA confirms the functional base is solid. Do not skip silently — surface this to the user before considering the feature "done."
- **Amendment 2026-08-15 (pre-flight review, before execution started):** the plan originally skipped dedicated tests for Goals, Research, Projects, and Config, reasoning they're structurally identical to already-tested siblings. User reviewed this and rejected the shortcut — every page now has its own test (Tasks 9, 11, 13 updated accordingly). Task reviewers should hold every page task to this bar; "structurally similar to a tested sibling" is not grounds to skip a test on this plan.

# Daily job-search playbook

You are running as an unattended scheduled task for Ezekiel Ologunde's job-search automation. You have **no memory of any other conversation** — everything you need is in this file and the project folder below. Follow it exactly.

## Hard constraints — restated verbatim, non-negotiable

- **NEVER** submit a web form, click Submit/Apply, or enter personal data into any form field on any website. This run has no access to `mcp__claude-in-chrome` and must not attempt to load it.
- **NEVER** create accounts, or enter/store passwords anywhere.
- **NEVER** fabricate résumé or cover-letter content. Only reorder, select, or lightly rephrase truthful content that already exists in `profile/master-profile.json`. If a job wants a skill/experience not in that file, do not invent it — note the gap in `tailoring-notes.md` instead.
- **Gmail access this run is READ-ONLY.** Use only `search_threads`, `get_message`, `get_thread`. Never label, draft, reply, send, forward, or trash anything.
- **Never answer a work-authorization/visa-sponsorship question on the user's behalf.** Only reference `profile/master-profile.json` → `contact.work_authorization` for context in the digest; never write a definitive answer into any staged application material.
- Allowed tools this run: Gmail (read-only), `mcp__Claude_Browser__*` (sandboxed, not logged into the user's accounts), `WebSearch`, `WebFetch`, filesystem, `PushNotification`. Do **not** load or use `mcp__claude-in-chrome`.

All paths below are absolute under `C:\Users\WT8\Projects\Personal Assisant\`. Always use full paths — never assume a working directory.

Note: the local dashboard (`automation\dashboard-server\`) reads live from disk on every page load — there is no "rebuild" step. Just write the files correctly and the dashboard reflects them automatically next time it's open.

## Step 0 — Load context

Read, in order:
1. `profile\preferences.json` — target roles, locations, daily cap, standing job boards
2. `profile\master-profile.json` — the primary source of truth for skills/experience/contact info
3. `profile\doctoral-research.json` — also source-of-truth (not a duplicate or lesser file): publications, research areas, and `related_professional_development` (AI/cybersecurity bootcamps, conferences, certifications-in-progress-adjacent activity) live here and are just as real/verified as anything in master-profile.json. A tailoring pass that reads only master-profile.json will miss this material — always check both.
4. `profile\writing-style.md` — voice/structure guide for any new tailored content
4. `logs\seen-jobs.json` — dedup index (create `{}` if missing — first run)
5. `logs\email-scan-state.json` — Gmail checkpoint (create `{"last_checked": null}` if missing)

## Step 1 — Scan Gmail for new job-alert emails (mandatory every pass — not a fallback)

**This step always runs, every pass, in full — regardless of whether Step 3's board walk succeeds, regardless of what a previous pass found, and regardless of time pressure.** It is one of two independent discovery legs (the other is Step 3), not something to skip once the other one produces results. If a pass skips this step, say so explicitly in the digest under "Errors and limits" rather than the digest silently reading as if it ran.

`search_threads` for messages newer than `email-scan-state.json`'s checkpoint, from known job-alert senders/subjects — explicitly including:
- **LinkedIn** — Jobs alert digests, InMail, recruiter outreach
- **Indeed** — "Indeed Apply" notifications, job-alert digests
- **Glassdoor**
- **Handshake** (`gwu.joinhandshake.com` notification emails, his GWU student account) — personalized, well-targeted alerts per `preferences.json`'s `job_boards` entry; this was flagged 2026-08-14 as needing to be added here and was not actually done until this rewrite
- **ZipRecruiter**, **HigherEdJobs**, and any message matching "job alert" / "jobs for you" / "new jobs matching your search"

For each match, `get_message` to extract individual postings and links. Update the checkpoint after processing.

**If zero new job-alert emails are found, record that explicitly** — e.g. "Gmail scan: 0 new job-alert emails since `<checkpoint>`, senders checked: LinkedIn/Indeed/Glassdoor/Handshake/ZipRecruiter" — in the digest and the run log. A documented zero and a skipped step must never look the same on the page; only the digest text distinguishes them.

## Step 2 — Scan Gmail for application status changes

For each `applications\*\status.json` currently `staged`, `ready_to_submit`, or `applied`, `search_threads` for replies referencing that company/role (interview invite, rejection, recruiter follow-up). Only update `status.json` on a reasonably confident match — otherwise flag it in the digest as "possible match, needs manual review" rather than guessing.

## Step 3 — Actively search for new matching roles (both legs below run every pass — the second is not a fallback)

**Leg A — the two standing boards, always checked first** (`preferences.json.job_boards` — user confirmed 2026-08-14 he checks these every day):
- https://www.higheredjobs.com/admin/search.cfm?JobCat=242&CatName=Computer+and+Information+Technology&SortBy=1&NumJobs=100 (staff/leadership IT & security roles — `cybersecurity_industry` track)
- https://www.higheredjobs.com/faculty/search.cfm?JobCat=102&CatName=Computer+Science&SortBy=1&NumJobs=100 (faculty/instructor roles — `academic` track)

For each board, use `mcp__Claude_Browser__javascript_tool` to pull `a[href*="details.cfm?JobCode"]` link+title pairs off the listing page (the list is long; read_page/get_page_text alone can truncate it), then open each candidate's `details.cfm` page to check real requirements before shortlisting — titles alone are misleading (e.g. "Assistant Director" can mean a 3-5-year analyst role or a 10-year/CISSP-required VP-track role; check the actual minimum qualifications every time). Access is currently unreliable and shifts between passes — read `preferences.json.job_boards[].access_note` in full before concluding the board is unreachable; it is a running log of which method worked on which date, not a single fixed instruction, and you should try each listed method in order rather than stopping at the first failure.

**Leg B — broader search, runs regardless of whether Leg A succeeded, failed, or was partially blocked.** This is a second independent source, not a fallback reserved for when the boards are down — run it every pass either way, using `WebSearch` / `WebFetch` / `mcp__Claude_Browser__*` (never `claude-in-chrome`):
- **Indeed** — public postings are reachable without login. Run explicit `WebSearch`/`WebFetch` queries scoped to `site:indeed.com` (or Indeed's own `indeed.com/jobs?q=...` search URLs) for `preferences.json`'s `target_roles` terms. This is a real, live-searchable source for this task, not merely an email-alert pickup.
- **LinkedIn and Handshake — deliberately NOT searched live here.** Both require an authenticated session, and this task must never load `mcp__claude-in-chrome` or attempt to sign in to anything. Do not try `navigate`-ing to `linkedin.com/jobs` or `gwu.joinhandshake.com` and treating an empty/login-walled result as "checked" — it isn't. Both are covered exclusively through Step 1's email-alert scan; that is the intended channel for these two, not a workaround.
- **Other boards and company career pages** matching `preferences.json`'s `target_roles`:
  - **Academic**: community colleges and institutions specifically hiring for IT Security / cybersecurity instruction — skip large research-university tenure-track searches with historically low yield (see `preferences.json.target_roles.academic.criteria`). Most tenure-track "Assistant/Associate Professor" listings require a completed terminal degree in hand — the user's DEng is expected 2027 and still in progress, so those aren't realistic yet; adjunct/instructor/lecturer/non-tenure-track postings are — **except** per the 2026-08-22 "cut adjunct" instruction, do not stage adjunct/part-time/per-credit postings; full-time/tenure-track or otherwise substantial roles only (see `preferences.json.target_roles.academic.criteria`, updated that date).
  - **Cybersecurity industry**: analyst, consultant, security architecture, leadership roles — explicitly include AI-security/AI-governance/explainable-AI-adjacent roles (see `preferences.json.target_roles.cybersecurity_industry.criteria`). User is actively trying to move from academia into industry.
  - **Uncommon title variants (added 2026-08-29)** — do not rely only on the obvious "GRC Analyst"/"Cybersecurity Analyst" search terms; equivalent roles are frequently titled very differently. Run additional searches across the categories in `preferences.json.target_roles.cybersecurity_industry.uncommon_title_variants`: risk/governance/compliance (Trust & Safety Analyst, Third-Party Risk Analyst, Control Testing Analyst, IT Audit Associate, AI Assurance Analyst, Model Risk Analyst, Privacy Engineer, Data Governance Analyst, etc.), forensics/incident (eDiscovery Analyst, DFIR Consultant, Digital Forensics Examiner — leans on his specific tool depth: Cellebrite/FTK/Magnet AXIOM/EnCase), AI/ML general tech (AI Solutions Analyst, AI Implementation Specialist, Technical Program Manager AI, Automation/RPA Analyst), healthcare sector (Healthcare IT Security Analyst, HIPAA Compliance Analyst — real overlap via Ebonyi State PHI experience), financial-services sector (Regulatory Affairs Analyst, fintech/banking Compliance Analyst, Model Risk/Governance Analyst — flag any finance-specific experience gap honestly, don't screen out on domain alone), business/generalist (Business Systems Analyst, IT Business Analyst, IT Generalist), security-awareness-training (Security Awareness Training Manager, Cybersecurity Training Specialist, Corporate Security Trainer, Technical Curriculum Developer — a strong underexploited fit given his teaching background layered on cybersecurity), AI-training/evaluation gig work (AI Trainer, AI Red Teamer, AI Model Evaluator, RLHF Domain Expert — companies like Scale AI, Surge AI, Invisible Technologies, Turing, Micro1; often 1099 contract work, not traditional W-2, which may sidestep visa-sponsorship blockers — always verify the actual skill requirement per posting, titles in this space are misleading and often mask pure software-engineering contract roles unrelated to his background), OT/ICS security (OT Security Analyst, ICS Security Specialist — real fit via Total Secure SCADA/OT work and the Breakwater doctoral OT/IoT research, not a stretch), and security-adjacent data/BI (Risk Analytics Analyst, Security Data Analyst, GRC Reporting Analyst — leans on documented Python/SQL/Power BI). UX-adjacent roles: only stage where security/trust is the actual throughline (e.g. Trust & Safety) — his UI/UX skill is real but secondary/design-school-adjacent, do not stretch into primary UX/product-design roles.
  - Do **not** search for digital forensics/law-enforcement or general IT helpdesk roles — those are explicitly deprioritized (`preferences.json.target_roles`). (Note: this refers to the case-work/tier-1-helpdesk exclusion specifically — the newly added "Digital Forensics Examiner"/"eDiscovery Analyst" corporate-investigations track above is a different category and is in scope.)

This is best-effort discovery, not exhaustive crawling. Respect `robots.txt`; don't hammer any one site.

**Freshness — hard rule added 2026-08-29 per direct user instruction**: do not stage postings older than 5 days from discovery date; strongly prefer postings from within the last 24 hours when available. Check the actual posted date on every candidate before staging (LinkedIn's "Date posted" / "Most recent" sort and per-listing relative timestamps are the fastest way to check on that board; other boards vary). Anything older than 5 days should be skipped and explicitly noted as stale in the digest (Step 6), not silently dropped.

**Years-of-experience is a soft gate, not a hard one — recalibrated 2026-08-29 per direct user instruction.** A stated years-of-experience or years-of-supervisory-tenure floor ("5+ years required," "3 years management required") is an HR anchor, not a disqualifier — stage the lead and name the gap honestly in `tailoring-notes.md` rather than screening it out (see `preferences.json.search_priorities.years_of_experience_is_soft`). Reserve actual screen-outs for binary/non-negotiable blockers: an explicit no-sponsorship statement, a required active security clearance, a required professional license, or a required certification with no "or equivalent experience" clause (a hard CISSP requirement counts, since CISSP itself has a 5-year experience prerequisite). A "Key Personnel" role tied to a government contract makes the years floor a harder, contractually-enforced version of this gap — flag that distinctly, but still stage and let the user decide rather than auto-rejecting.

**In the digest (Step 6), explicitly state which legs ran and what each returned** — Leg A (board walk: reachable/unreachable, method used, postings found), Leg B/Indeed (queries run, postings found), and Step 1's email scan (senders checked, count found) — including "attempted, zero results" as a distinct outcome from "not attempted." A future pass, or you, must be able to tell a genuine quiet night apart from a step that silently didn't run.

## Step 4 — Dedup and filter

Hash each candidate posting (normalize company+title+URL). Drop anything already in `logs\seen-jobs.json`. Filter against `preferences.json` (role match, deprioritized categories). Cap new leads at `preferences.json.max_new_applications_per_day`.

## Step 5 — Stage each new qualifying lead

For each one:
1. Create `applications\YYYY-MM-DD_Company_Role\` (use today's date, sanitize company/role for a folder name).
2. Write `job-posting.md`: full JD text/summary, source URL, discovery channel (email vs. search — and if email, which sender; if search, board walk or Indeed/other), date found. Explicitly note in it whether the posting requires/requests a cover letter (check "Required Documents"/"Application Materials" sections and general JD language) — this drives step 3 below.
3. **Tailor the résumé, and the cover letter only if the posting asks for one**, per this process:
   - **Résumé — always generate, tailored fresh for this specific job.** Read the JD and select/reorder a *subset* of `master-profile.json` experience bullets, skills, and education that genuinely match — never add anything not already there. Never reuse a previous job's tailored résumé as-is.
   - Write `tailoring-notes.md`: exactly what was selected/reordered and why, so it's auditable against `master-profile.json`. Note explicitly whether a cover letter was generated and why (or why not). If the posting has a hard, quantifiable minimum qualification (years of experience, a specific certification, budget/headcount scale) that isn't documented anywhere in `master-profile.json`, say so plainly at the top of the notes — do not tailor around the gap or imply it's met.
   - Build the resume JSON input per the shape documented at the top of `automation\scripts\render_resume.js` and run:
     `node "C:\Users\WT8\Projects\Personal Assisant\automation\scripts\render_resume.js" <input.json> "applications\<folder>\resume_tailored.docx"`
   - **Cover letter — only if the posting requires or requests one.** If so, write a *new* cover letter for this specific job (never reuse another job's letter, even a similar one) — voice per `writing-style.md` (academic roles: adapt the reusable template; industry roles: individually tailor per the JD). Build the JSON input per the shape documented at the top of `automation\scripts\render_cover_letter.js` and run the equivalent command for `cover_letter_tailored.docx`. If the posting doesn't ask for one, skip this and say so in `tailoring-notes.md` — don't generate a cover letter nobody asked for.
   - Validate every generated docx: `PYTHONUTF8=1 PYTHONIOENCODING=utf-8 python "C:\Users\WT8\.claude\skills\docx\scripts\office\validate.py" <file>.docx` (the `PYTHONUTF8=1` env var is required on this machine — without it the validator itself crashes on the bullet-point character, a false alarm unrelated to the document's actual validity).
4. Write `status.json`: `{"status": "staged", "discovered_via": "...", "company": "...", "role": "...", "url": "...", "found_at": "<date>", "applied_at": null, "notes": ""}`.
5. Add the posting's hash to `logs\seen-jobs.json`.

## Step 6 — Compile the digest

Write `digests\YYYY-MM-DD.md` with:
- **Source coverage summary near the top**: which of Step 1 (email scan, senders checked) / Step 3 Leg A (board walk) / Step 3 Leg B (Indeed + other search) actually ran this pass, and what each returned — so it's visible at a glance whether every source was actually checked, not just the one that happened to work.
- New leads staged today (company, role, link, one-line why-matched, discovery channel)
- Status changes detected (interviews, rejections, recruiter replies), with Gmail thread references
- Anything ambiguous flagged for manual review
- Errors/skips encountered, with reasons
- Count of applications currently sitting in `staged`, awaiting the user's interactive apply pass

## Step 7 — Log and notify

Write `logs\run-YYYY-MM-DD.log` with counts, timings, and any exceptions. Send exactly one `PushNotification` (status: proactive), one line, e.g.:
`"Job digest: 3 new leads staged, 1 interview invite (Acme Corp). Review in Claude Code."`

## Step 8 — Do not go further

This run ends here. Do not open `claude-in-chrome`, fill any form, click anything on any website, apply Gmail labels, create Gmail drafts, send any email, or create calendar events. Applying happens only in the separate interactive flow at `automation\apply-flow.md`, run by the user directly.

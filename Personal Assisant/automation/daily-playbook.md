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

Note: the local dashboard (`automation\dashboard-server\`) reads its data live from disk on every page load — there is no rebuild step for data changes. Just write the files correctly and the dashboard reflects them automatically next time it's open. (This is about the data only — the dashboard's own frontend code is a separate React app that needs `npm run build` when its own code changes, handled automatically by `open-dashboard.bat` if `web\dist\` is missing.)

## Step 0 — Load context

Read, in order:
1. `profile\preferences.json` — target roles, locations, daily cap
2. `profile\master-profile.json` — the primary source of truth for skills/experience/contact info
3. `profile\doctoral-research.json` — also source-of-truth (not a duplicate or lesser file): publications, research areas, and `related_professional_development` (AI/cybersecurity bootcamps, conferences, certifications-in-progress-adjacent activity) live here and are just as real/verified as anything in master-profile.json. A tailoring pass that reads only master-profile.json will miss this material — always check both.
4. `profile\writing-style.md` — voice/structure guide for any new tailored content
4. `logs\seen-jobs.json` — dedup index (create `{}` if missing — first run)
5. `logs\email-scan-state.json` — Gmail checkpoint (create `{"last_checked": null}` if missing)

## Step 1 — Scan Gmail for new job-alert emails

`search_threads` for messages newer than `email-scan-state.json`'s checkpoint, from known job-alert senders/subjects (LinkedIn Jobs, Indeed, ZipRecruiter, Glassdoor, HigherEdJobs, "job alert", "jobs for you", etc.). For each match, `get_message` to extract individual postings and links. Update the checkpoint after processing.

## Step 2 — Scan Gmail for application status changes

For each `applications\*\status.json` currently `staged`, `ready_to_submit`, or `applied`, `search_threads` for replies referencing that company/role (interview invite, rejection, recruiter follow-up). Only update `status.json` on a reasonably confident match — otherwise flag it in the digest as "possible match, needs manual review" rather than guessing.

## Step 3 — Actively search for new matching roles

**Always check both standing boards first** (`preferences.json.job_boards` — user confirmed 2026-08-14 he checks these every day):
- https://www.higheredjobs.com/admin/search.cfm?JobCat=242&CatName=Computer+and+Information+Technology&SortBy=1&NumJobs=100 (staff/leadership IT & security roles — `cybersecurity_industry` track)
- https://www.higheredjobs.com/faculty/search.cfm?JobCat=102&CatName=Computer+Science&SortBy=1&NumJobs=100 (faculty/instructor roles — `academic` track)

For each board, use `mcp__Claude_Browser__javascript_tool` to pull `a[href*="details.cfm?JobCode"]` link+title pairs off the listing page (the list is long; read_page/get_page_text alone can truncate it), then open each candidate's `details.cfm` page to check real requirements before shortlisting — titles alone are misleading (e.g. "Assistant Director" can mean a 3-5-year analyst role or a 10-year/CISSP-required VP-track role; check the actual minimum qualifications every time).

Then, using `WebSearch` / `WebFetch` / `mcp__Claude_Browser__*` (never `claude-in-chrome`) as needed, search further for roles matching `preferences.json`'s `target_roles`:
- **Academic**: community colleges and institutions specifically hiring for IT Security / cybersecurity instruction — skip large research-university tenure-track searches with historically low yield (see `preferences.json.target_roles.academic.criteria`). Most tenure-track "Assistant/Associate Professor" listings require a completed terminal degree in hand — the user's DEng is expected 2027 and still in progress, so those aren't realistic yet; adjunct/instructor/lecturer/non-tenure-track postings are.
- **Cybersecurity industry**: analyst, consultant, security architecture, leadership roles — explicitly include AI-security/AI-governance/explainable-AI-adjacent roles (see `preferences.json.target_roles.cybersecurity_industry.criteria`). User is actively trying to move from academia into industry.
- Do **not** search for digital forensics/law-enforcement or general IT helpdesk roles — those are explicitly deprioritized (`preferences.json.target_roles`).

This is best-effort discovery, not exhaustive crawling. Respect `robots.txt`; don't hammer any one site.

## Step 4 — Dedup and filter

Hash each candidate posting (normalize company+title+URL). Drop anything already in `logs\seen-jobs.json`. Filter against `preferences.json` (role match, deprioritized categories). Cap new leads at `preferences.json.max_new_applications_per_day`.

## Step 5 — Stage each new qualifying lead

For each one:
1. Create `applications\YYYY-MM-DD_Company_Role\` (use today's date, sanitize company/role for a folder name).
2. Write `job-posting.md`: full JD text/summary, source URL, discovery channel (email vs. search), date found. Explicitly note in it whether the posting requires/requests a cover letter (check "Required Documents"/"Application Materials" sections and general JD language) — this drives step 3 below.
3. **Tailor the résumé, and the cover letter only if the posting asks for one**, per this process:
   - **Résumé — always generate, tailored fresh for this specific job.** Read the JD and select/reorder a *subset* of `master-profile.json` experience bullets, skills, and education that genuinely match — never add anything not already there. Never reuse a previous job's tailored résumé as-is.
   - Write `tailoring-notes.md`: exactly what was selected/reordered and why, so it's auditable against `master-profile.json`. Note explicitly whether a cover letter was generated and why (or why not).
   - Build the resume JSON input per the shape documented at the top of `automation\scripts\render_resume.js` and run:
     `node "C:\Users\WT8\Projects\Personal Assisant\automation\scripts\render_resume.js" <input.json> "applications\<folder>\resume_tailored.docx"`
   - **Cover letter — only if the posting requires or requests one.** If so, write a *new* cover letter for this specific job (never reuse another job's letter, even a similar one) — voice per `writing-style.md` (academic roles: adapt the reusable template; industry roles: individually tailor per the JD). Build the JSON input per the shape documented at the top of `automation\scripts\render_cover_letter.js` and run the equivalent command for `cover_letter_tailored.docx`. If the posting doesn't ask for one, skip this and say so in `tailoring-notes.md` — don't generate a cover letter nobody asked for.
   - Validate every generated docx: `PYTHONUTF8=1 PYTHONIOENCODING=utf-8 python "C:\Users\WT8\.claude\skills\docx\scripts\office\validate.py" <file>.docx` (the `PYTHONUTF8=1` env var is required on this machine — without it the validator itself crashes on the bullet-point character, a false alarm unrelated to the document's actual validity).
4. Write `status.json`: `{"status": "staged", "discovered_via": "...", "company": "...", "role": "...", "url": "...", "found_at": "<date>", "applied_at": null, "notes": ""}`.
5. Add the posting's hash to `logs\seen-jobs.json`.

## Step 6 — Compile the digest

Write `digests\YYYY-MM-DD.md` with:
- New leads staged today (company, role, link, one-line why-matched)
- Status changes detected (interviews, rejections, recruiter replies), with Gmail thread references
- Anything ambiguous flagged for manual review
- Errors/skips encountered, with reasons
- Count of applications currently sitting in `staged`, awaiting the user's interactive apply pass

## Step 7 — Log and notify

Write `logs\run-YYYY-MM-DD.log` with counts, timings, and any exceptions. Send exactly one `PushNotification` (status: proactive), one line, e.g.:
`"Job digest: 3 new leads staged, 1 interview invite (Acme Corp). Review in Claude Code."`

## Step 8 — Do not go further

This run ends here. Do not open `claude-in-chrome`, fill any form, click anything on any website, apply Gmail labels, create Gmail drafts, send any email, or create calendar events. Applying happens only in the separate interactive flow at `automation\apply-flow.md`, run by the user directly.

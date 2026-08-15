# Interactive apply flow

Run this only in an interactive session, with the user present — never unattended. This is the **only** flow allowed to load `mcp__claude-in-chrome` (the user's real, logged-in Chrome), because it's the only flow with the user right there to give explicit go-aheads.

All paths below are absolute under `C:\Users\WT8\Projects\Personal Assisant\`.

## Hard constraints — restated verbatim, non-negotiable

- **NEVER** click a final Submit/Apply button, or enter personal data into a form field, without the user's explicit go-ahead for that specific action/batch, given in this conversation (not assumed from a prior session).
- **NEVER** create accounts on job sites or enter/store passwords. If a site requires signing up or logging in and the user isn't already authenticated in their browser, stop that job and mark it `needs_manual_completion`.
- **NEVER** attempt to bypass a CAPTCHA.
- **NEVER** answer a work-authorization/visa-sponsorship question, salary-expectation question, or voluntary EEO/self-identification field on the user's behalf — leave blank and flag it. These are judgment calls only the user makes, even when `master-profile.json` has a work-authorization note on file.
- **NEVER** fabricate an answer to a screening question not answerable from `profile/master-profile.json`.

## Step 1 — Load the batch

Read every `applications\*\status.json` with `status == "staged"`. For each, read the matching `job-posting.md`, `resume_tailored.docx`, and `cover_letter_tailored.docx`.

## Checkpoint A — before touching the real browser

Present the staged batch to the user: company, role, link, and ATS type if guessable from the URL (Greenhouse, Lever, Workday, iCIMS, LinkedIn Easy Apply, custom company form). Say plainly:

> "I'll open these N applications in your Chrome and fill in your contact info and tailored résumé/cover letter from your profile. I will NOT submit anything without asking again after. Proceed with this batch?"

Only on an explicit "yes" (or explicit approval of a named subset) do you load `mcp__claude-in-chrome` tools and continue. If the user says no, or doesn't answer clearly, stop here.

## Step 2 — Per job, for each confirmed application

1. `tabs_create_mcp` / `navigate` to the application URL.
2. `read_page` / `find` to identify the ATS type and form structure.
3. **If login is required and the user isn't already authenticated**: stop this job immediately. Set `status.json.status = "needs_manual_completion"`, note `"reason": "requires login"`. Move to the next job. Never enter credentials, never create an account.
4. Walk the form using `form_input`, sourcing values strictly from `profile\master-profile.json` (`contact`, and selected `experience`/`education` as needed) and `profile\links.json` if present.
5. Use `file_upload` for `resume_tailored.docx` / `cover_letter_tailored.docx` at the appropriate fields.
6. For screening questions:
   - If truthfully answerable from `master-profile.json`, answer it.
   - If it's a judgment call (salary expectation, start date, work authorization/sponsorship, voluntary EEO/self-ID disclosure) — **leave it blank and flag it** in `apply-log.md`. Never guess.
7. **If a CAPTCHA appears, the flow requires creating a new account, or a required field can't be answered from known data**: stop this job immediately. Set `status.json.status = "needs_manual_completion"` with the specific reason and the current URL. Log it in `apply-log.md`. Move to the next job — never retry-loop, never attempt a workaround.
8. Stop at the fully-filled, pre-submit state. **Do not click Submit/Apply.** Record exactly what was filled (and what was left blank/flagged) in `apply-log.md`.

## Checkpoint B — after the whole batch is filled

Summarize for the user: "Ready to submit: [Job A, Job B]. Needs manual completion: [Job C — reason, Job D — reason]." Ask for one explicit go-ahead covering the ready ones, or let the user approve/decline individually by name.

Only on explicit confirmation, for each approved job:
- Click the final Submit.
- Verify the confirmation page/text (screenshot or read_page).
- Set `status.json.status = "applied"`, `applied_at = <timestamp>`.
- Record the confirmation evidence in `apply-log.md`.

Jobs left as `needs_manual_completion` are left exactly as-is (the browser tab can stay open) with a clear note in `apply-log.md` for the user to finish by hand. Never guess-submit these.

The local dashboard (`automation\dashboard-server\`) reads its data live from disk on every page load — no rebuild step needed for data; the updated `status.json` files are reflected automatically next time the dashboard is open or refreshed. (The dashboard's own frontend code is separate — `open-dashboard.bat` only builds it once, if `web\dist\` is missing; it does not rebuild automatically after later frontend code changes.)

## Notes

- A job with judgment-call fields left blank can still proceed to Checkpoint B for the fields that ARE complete — flag the blanks clearly so the user can decide whether to fill them in themselves before you submit, or submit as-is if the field wasn't required.
- If the user declines at either checkpoint, nothing further happens for that batch — do not retry automatically on a later run. The daily playbook will simply keep the job in `staged` until the user next runs this flow.

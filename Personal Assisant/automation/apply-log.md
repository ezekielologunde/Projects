# Apply log

Log of the interactive apply-flow batch started 2026-09-02, per `automation/apply-flow.md`. User confirmed proceeding with all 24 staged applications at Checkpoint A.

## 1. Georgia Gwinnett College — Security Operations Center (SOC) Lead
- **Result: needs_manual_completion — requires login.**
- HigherEdJobs listing links to the real apply URL on USG's PeopleSoft/OneHCM system (careers.hprod.onehcm.usg.edu). Clicking "Apply for Job" opened a Sign In modal. Chrome had an autofilled username and a saved password for the site, but there was no active authenticated session.
- Per the hard constraint (never sign in / create an account on the user's behalf unless already authenticated), stopped here without entering the modal. Left exactly as-is for the user to sign in and continue themselves.
- Apply URL: https://careers.hprod.onehcm.usg.edu/psp/careers/CAREERS/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_JBPST_FL&Action=U&FOCUS=Applicant&SiteId=1&JobOpeningId=301310&PostingSeq=1

## 2. Sallie Mae — Senior Associate, Technology Audit
- **Result: needs_manual_completion — requires creating a Workday account.**
- Workday's apply flow ("Autofill with Resume") led straight to a "Create Account/Sign In" step with no existing session. Noticed the user's "Simplify" browser extension had already auto-generated a password and pre-filled the email field on that step, and separately flagged the resume on file there as a "Low Resume Match" (42, 5/12 keywords) — that's Simplify's own stored resume, not the tailored one from this session.
- Stopped before clicking "Create Account" / "Create Account & Autofill" — never create accounts on the user's behalf, regardless of what a third-party extension pre-fills.
- Apply URL: https://sallie-mae.wd5.myworkdayjobs.com/en-US/Careers/job/Sterling-VA/Senior-Associate--Technology-Audit_R26_000558

## 2b. Sallie Mae — Senior Associate, Technology Audit (resumed, applied together with user)
- **Result: APPLIED.** User created the Workday account themselves; from there we filled the application together interactively.
- Swapped the auto-uploaded resume (Simplify had defaulted to the general "Revamped" master resume) for the correct job-tailored `resume_tailored.docx`.
- Fixed several Simplify autofill artifacts: ALL-CAPS legal name fields, a swapped job-title/company pair on the Adrian College entry, a missing "From" date, blank locations, and a duplicate country-code prefix in the phone number causing a format error.
- Removed the auto-added "Doctoral Researcher — Breakwater" work-experience entry (not part of this job's tailored resume) rather than fight its illegal-character validation error on a giant auto-pasted description.
- Screening questions: 18+ = Yes; legally eligible to work = Yes; immigration sponsorship now/future = No; non-compete = No; current/former KPMG (Sallie Mae engagement team) = No; family member of KPMG (Sallie Mae engagement team) = No; background check/fingerprints consent = I agree; willing to relocate = Yes. Start date and compensation expectations left blank (optional, not required).
- Sponsorship and work-eligibility answers were given directly by the user in this conversation (AskUserQuestion), not decided by me.
- User completed and submitted the final step directly in their own browser. Confirmed via Candidate Home: "My Applications" shows Senior Associate, Technology Audit (R26_000558), status **Resume Under Review**, submitted **September 2, 2026**.

## 3. Southern New Hampshire University — IAM Engineer
- **Result: needs_manual_completion — requires a new Workday account.**
- Same pattern as Sallie Mae/Allina: separate Workday tenant (snhu.wd503.myworkdayjobs.com), Create Account/Sign In step, no existing session.
- Apply URL: https://snhu.wd503.myworkdayjobs.com/en-US/External_Career_Site/job/Remote/IAM-Engineer_R0014633-1

## 4. Allina Health — Manager Information Security
- **Result: needs_manual_completion — requires a new Workday account.**
- Posting explicitly states in "Application Instructions": "You will need to either create an account or sign into your account to submit an application." (allina.wd5.myworkdayjobs.com)
- Apply URL: https://allina.wd5.myworkdayjobs.com/External/job/Allina-Commons/Manager-Information-Technology-Security_R-0073817

## 5. BNSF Railway — Cybersecurity Engineer I/II (Vulnerability & Patch Management)
- **Result: applied_unverified — ⚠️ auto-submitted mid-flow by the Simplify browser extension, not by me or the user.**
- Reached BNSF's own careers site (jobs.bnsf.com) via Handshake's "Apply externally" (had to hook `window.open` via JS to find the real destination, since the click opened a background tab outside the tracked group). No account required — guest apply flow.
- Uploaded the tailored resume, fixed ALL-CAPS name fields and phone-format errors, and answered step-2 background questions (relatives at BNSF, military service, prior BNSF/railroad employment, recent BNSF interviews, termination/discipline history — all factually "No").
- On step 3 (Final Steps), found the critical sponsorship question — "would you require BNSF's assistance to obtain/maintain/extend employment authorization (H-1B, STEM OPT/CPT, TN)?" — and a "2+ years cybersecurity engineering experience" self-certification, both meant for the user to answer. Also found EEO disability/veteran fields pre-filled with definitive "No" answers by Simplify (should be "decline to answer").
- **While reading the page to locate the right form elements (no click on Submit was made by me), the page navigated to BNSF's confirmation screen**: "Thank you for applying," jobApplicationId **2347273**, status=success. The Simplify extension's "Autofill This Page" apparently completed and submitted the form autonomously.
- **What's unverified**: the actual answer given for the sponsorship question, the 2-yr-experience self-cert, and the EEO fields. Disclosed to the user immediately and flagged status as `applied_unverified` rather than `applied`.
- **Recommended next step for the user**: log into the BNSF candidate account (My Profile) to review exactly what was submitted, and contact BNSF directly to correct the sponsorship answer if needed — this posting was staged specifically because of its rare, explicit STEM OPT sponsorship language, so getting that answer right matters.

## 6. HPE — Cybersecurity Operations & Enablement (Reston, VA / Houston, TX)
- **Result: needs_manual_completion — HPE's Phenom-based apply form (careers.hpe.com/applySubmit) is not automatable.**
- No login required (guest apply). Successfully filled all "My information" fields via the Chrome extension (name, address, Birmingham AL 35209, email, phone, "How did you hear about us" = HPE Career site / HPE Careers webpage, required data-processing consent checkbox) and confirmed every value via direct DOM inspection — all valid.
- **Uploading the tailored resume (docx) via the file input reliably froze the entire page renderer** (CDP `Runtime.evaluate` timed out, `document_idle` never resolved) — reproduced twice. The only recovery was a hard `navigate()` reload, which wipes the whole form.
- **Without a resume uploaded, clicking "Next" silently resets the form** back to a blank step 1 — the correctly-filled fields vanish and the URL stays on step 1. Reproduced 3 times across fresh page loads, including a version with native-setter-based field population (bypassing the extension's `form_input`) to rule out a synthetic-event issue. The `applySubmit` POST returns HTTP 200 both with and without upload, so the server is rejecting/resetting silently rather than erroring.
- Concluded this is a genuine technical blocker in HPE's apply widget (not a judgment-call or login issue) and stopped per the "never retry-loop" rule rather than continuing indefinitely.
- **Recommended next step for the user**: apply directly at https://careers.hpe.com/us/en/apply?jobSeqNo=HPE1US1211088EXTERNALENUS&step=1&stepname=personalInformation from your own browser/device (a different browser or disabling extensions may avoid whatever triggers the freeze). Fields to re-enter: name/contact/address as above, tailored resume at `applications/2026-09-01_HPE_Cybersecurity-Operations-Enablement/resume_tailored.docx` (upload it *first*, before other fields, in case order matters), "How did you hear about us" → HPE Career site → HPE Careers webpage.


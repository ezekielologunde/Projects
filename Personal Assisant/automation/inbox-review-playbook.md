# Daily inbox review playbook

You are running as an unattended scheduled task for Ezekiel Ologunde's personal-assistant system. You have **no memory of any other conversation** — everything you need is in this file and the project folder below. Follow it exactly.

## Hard constraints — restated verbatim, non-negotiable

- **Gmail access this run is READ-ONLY.** Use only `search_threads` and `get_message`/`get_thread`. Never label, archive, draft, reply, send, forward, or trash anything, no matter how routine it looks.
- **Every non-Gmail account is file-based, read-only, and passive.** There is no live API connection to any of them (Microsoft tenants block self-service app registration; there's no way to link more than one Gmail account to this session — both confirmed 2026-08-14). This run only reads export files the user has already manually produced and moves them to an archive subfolder after processing. Never open a browser to any of these accounts, never attempt to sign in anywhere, never touch a live mailbox other than the connected Gmail.
- Never guess at or fabricate what a thread or exported email contains — only report what the content actually shows.
- This is about the user's own inboxes only — never touch Drive or any other account type unless a future version of this file explicitly says so.

All paths are absolute under `C:\Users\WT8\Projects\Personal Assisant\`.

## Step 0 — Load context

Read `profile\inbox-preferences.json` for the exact search queries and categorization rules, and `profile\connected-accounts.json` for the full list of known accounts and how each one gets read.

## Step 1 — Run the Gmail searches

Run each query in `inbox-preferences.json.searches` via `search_threads` against the one `oauth_live` account in `connected-accounts.json` (`ologundeomotola@gmail.com`). For any thread whose category is ambiguous from the snippet alone, `get_thread` to check whether a reply from that address already exists in that thread.

## Step 1b — Check for new exports from every other connected account

For each account in `connected-accounts.json` whose `connection` is `manual_export_pdf`, `manual_export_pst`, or `pending_export_mbox`:

1. List `C:\Users\WT8\Downloads\` (and, for accounts with an explicit `export_path`, that exact path) for a new export matching that account's platform:
   - PDF exports: filenames containing `Outlook` (typo'd variants are common and still count).
   - PST exports: `*.pst` files, ideally named after the account address.
   - Google Takeout mbox exports: look for a `takeout-*` folder under `Downloads\` containing `Takeout\Mail\*.mbox`, or a loose `*.mbox` file. Match it to an account by asking the user if the filename doesn't make it obvious, rather than guessing.
2. For a **PDF**: read it directly (the Read tool handles PDF natively) — genuine full-content read, not a guess from the filename.
   For a **PST**: run `node automation\scripts\pst_index.js` (edit the hardcoded path inside it first to point at the new file) to get a lightweight header index, then read specific messages in full only where the subject/sender suggests something in `likely_still_open` territory — don't dump the whole mailbox into the digest.
   For an **mbox**: run `node automation\scripts\mbox_index.js <path> <output.json> --label=<account-address>` the same way — index first, then selectively deep-read only what looks actionable.
3. Categorize each one using the exact same rules as Step 2 below.
4. Move processed export files into an `_exports-processed\` subfolder next to where they were found (create it if missing) so nothing is re-scanned. Never delete — move only.
5. Update that account's `status` field in `connected-accounts.json` to reflect what was found (message count, date range) so the next run knows the account is now active rather than pending.
6. If no new files are found for a `pending_*` account, don't re-mention it every single day — only surface it in the digest once a week, or the day it first goes from pending to received.

## Step 2 — Categorize

Sort every thread/email found, across every account, into exactly one of `inbox-preferences.json.categories`: `likely_still_open`, `handled`, `old_context`, or `noise`. Follow the definitions in that file precisely — a thread only counts as `handled` if a reply from the user is actually visible in the same thread, not assumed.

## Step 3 — Write the digest

Write `inbox\YYYY-MM-DD.md` following this shape (see `inbox\2026-08-14.md` for the first real example). Tag each item with its account label from `connected-accounts.json` (e.g. `[Gmail]`, `[Lawson State]`, `[UAGC]`) since there are several now:
```
# Inbox review — YYYY-MM-DD

## Likely still open — needs a decision
- **[Account] Subject/sender** — one-line why it's unresolved.

## Handled (surfaced once for the record)
- **[Account] Subject/sender** — one-line what happened.

## Old context (no action, just interesting)
- brief notes, only if genuinely notable.

## Noise
- one-line summary of volume, not itemized.

## New exports processed today
- Per account, N new file(s) found and processed, or "none found." Only mention `pending_*` accounts with nothing new once a week, not daily.
```
Per `inbox-preferences.json.output`: only `likely_still_open` items are the headline list. Don't re-surface a `handled` item that's already appeared in a previous day's digest unless something about it changed.

## Step 4 — Notify only if genuinely urgent

Most days: no notification, the digest is just there on the dashboard. Only send a `PushNotification` if something in `likely_still_open` is time-sensitive (e.g., a deadline within 48 hours) — one line, naming the specific thing.

## Step 5 — Do not go further

This run ends here. Read-only for every account. Never label, draft, reply, send, or trash anything in Gmail. Never sign into or browse to any other account directly — only read export files the user already produced themselves, and only ever move them (to a processed subfolder), never delete or edit them.

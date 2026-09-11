# Production email: Resend setup runbook

Status: decided, not yet executed. Owner: project owner (this doc's steps need
a live Resend account and DNS access that no automated assistant has).
Related: spec section 15 ("Decisions deferred"), revision history 0.24.

## Why

Supabase's built-in SMTP is development-only: 2 messages/hour, no delivery
SLA, and it's what the local stack already uses today (Inbucket/Mailpit,
the same mechanism this project's manual testing and the Playwright smoke
test both read OTP codes from). It cannot carry real signups.

Resend is one of Supabase's own listed compatible SMTP providers, offers a
native Supabase integration, and gives delivery/bounce/complaint visibility
Supabase's default sender doesn't. Confirmed directly against both vendors'
current docs (not assumed):

- Supabase default rate limit: 2 messages/hour. Custom SMTP: 30/hour to
  start, adjustable afterward in Supabase's Auth rate-limit settings.
  (`supabase.com/docs/guides/auth/auth-smtp`)
- Resend SMTP relay: host `smtp.resend.com`, ports 25 / 465 / 587 / 2465 /
  2587 (465 and 2465 are implicit TLS; the rest are STARTTLS), username
  literally `resend`, password is the Resend API key. A verified sending
  domain is required before SMTP sending works at all.
  (`resend.com/docs/send-with-smtp`)
- Supabase's own guidance: use a dedicated subdomain for auth email,
  separate from any marketing sending domain, and configure SPF, DKIM, and
  DMARC on it.

## Architecture

```
auth.<yourdomain>              -- OTP / transactional only, via Resend
        |
        v
  Supabase Auth SMTP settings
        |
        v
  Supabase sends the sign-in code email

marketing.<yourdomain>         -- anything else, later, on its own
                                   sending reputation -- not built yet,
                                   not needed until there's marketing email
                                   to send
```

Keeping auth and marketing on separate subdomains means a marketing
sender's reputation (opens, spam complaints, unsubscribes) never affects
whether a real user's sign-in code actually lands in their inbox.

## Setup steps (project owner only)

These need a live Resend account and DNS control this assistant does not
have. Each step names exactly what to do so it can be executed without
guessing.

1. **Create a Resend account** at resend.com (prohibited for an assistant
   to do on your behalf under any circumstance — this needs your own
   signup).
2. **Add and verify a domain**: `auth.<yourdomain>` (pick the real domain
   once section 15's "product name and domain" decision lands; this
   subdomain choice doesn't need to wait for that, since it's just a
   label under whatever domain is chosen).
3. Resend will generate the exact DNS records to add (SPF via a `TXT`
   record, DKIM via one or more `CNAME`/`TXT` records, and it's worth
   adding a `DMARC` `TXT` record at the domain's policy level too, even
   though Resend won't generate that one for you — a starting policy of
   `p=none` while monitoring is the usual safe default before tightening
   it). Add all of them at your DNS provider. These records don't exist
   until step 2 creates the domain in Resend, so they can't be pre-filled
   here.
4. Wait for Resend to show the domain as **verified** (DNS propagation is
   usually minutes, occasionally longer).
5. **Create a Resend API key** scoped to sending only.
6. In the **Supabase dashboard** for the production project: Authentication
   → Emails → SMTP Settings (the exact menu path Supabase currently uses;
   confirm against the live dashboard if it's moved). Enter:
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: the API key from step 5
   - Sender email: `noreply@auth.<yourdomain>` (or similar, on the
     verified subdomain)
   - Sender name: `Focus`
7. In the same dashboard area, raise the Auth email rate limit from the
   custom-SMTP default (30/hour) to whatever launch volume actually needs,
   once real numbers exist.
8. Confirm the sign-in email template is still the numeric-code override
   (spec section 9.1 / `supabase/config.toml`'s `[auth.email.template.magic_link]`
   block) — the dashboard's own template editor is a separate copy from
   local config and needs the same override applied by hand.

## Acceptance criteria

- [ ] `auth.<yourdomain>` shows verified in Resend
- [ ] SPF, DKIM, and DMARC all pass (check via Resend's own domain status
      page, and independently via a header inspection of a real received
      email)
- [ ] A real OTP email is received and correctly rendered at Gmail,
      Outlook/Hotmail, iCloud, and Yahoo test addresses
- [ ] Expired-code and wrong-code behavior still shows the right error
      (this is app-level behavior, already covered — this step is just
      confirming the switch to Resend didn't change it)
- [ ] Resend-code throttling still works as designed
- [ ] Bounce and complaint events are visible in Resend's dashboard
- [ ] Auth rate limit is raised to a real launch-appropriate number, not
      left at the 30/hour custom-SMTP default
- [ ] No marketing traffic is ever sent from the `auth.` subdomain

## What this assistant can help with once the above is done

Once a domain is verified and DNS records exist, DNS propagation and
header verification are both checkable remotely (e.g., confirming SPF/DKIM
alignment on a real received message, or that a domain resolves the
expected records) — ask, and that can be verified rather than assumed, the
same way every other claim in this project has been checked against a
primary source this session. Account creation, domain verification itself,
and entering values into the Supabase dashboard remain steps only you can
take.

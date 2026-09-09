# iOS Safari / installed-PWA camera verification test plan

Status: written, not yet executed. Owner: a human tester with a real
physical iPhone — this assistant has no access to one and cannot run any
part of this plan itself. Related: spec section 15 ("Decisions deferred"),
revision history 0.24.

## Why this needs two separate test matrices, not one

This app has two different camera-touching flows in onboarding, and they
have genuinely different risk profiles. Confirmed by reading the actual
component code (`app/src/app/onboarding/wizard.tsx`), not assumed from
what a "verification selfie" and "video prompt" usually mean elsewhere:

- **`SelfieStep`** (required — Phase 1 can't be submitted without it) uses
  a plain `<input type="file" accept="image/*" capture="user">`. This
  hands the whole capture UI off to iOS's native camera sheet; the page
  itself never opens a live camera stream. Lower risk, but `capture`'s
  behavior inside an installed Home Screen PWA specifically (versus a
  Safari tab) has its own history of platform quirks, so it still needs a
  real-device check.
- **`VideoPromptStep`** (optional) calls
  `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`
  directly and renders a live in-page `<video>` preview during recording.
  This is the flow that the well-documented WebKit bugs around camera
  access in standalone/Home-Screen-mode PWAs actually apply to (see
  "Background" below). It was verified working end to end earlier this
  session using a synthetic canvas-based fake camera in a desktop browser
  automation tool — real, but not evidence about real iOS Safari, and
  certainly not about installed-PWA mode specifically.

Neither component has a front/back camera switch control in the current
UI — there's no `facingMode` constraint or switch button in either one.
If a prior version of this test plan assumed one, that assumption didn't
match the real code and has been dropped here.

## Background: why this is a real, pre-existing concern

This exact risk was already named in this spec (section 15) before any
outside research raised it: "whether iOS Safari's PWA camera access is
reliable enough for selfie capture, to be tested in Phase 1 on a real
phone." That's still accurate. WebKit's own bug tracker has long-running,
well-documented issues in this area — `getUserMedia` returning no devices
or failing outright in Home-Screen/standalone mode, and permission state
not persisting the way it does in a normal Safari tab — confirmed by
searching WebKit's bug tracker directly rather than trusting a single
citation. Whether any specific one of those bugs is still open on current
iOS is exactly what this test plan exists to find out; don't treat any
particular bug number as gospel, treat the matrix results as gospel.

## Test matrix A — `SelfieStep` (required, native capture handoff)

| # | Test | Safari tab | Installed (Home Screen) |
|---|------|:---:|:---:|
| A1 | First-time camera permission prompt appears and works | ☐ | ☐ |
| A2 | Deny permission, then retry — app shows a sane message, not a silent stall | ☐ | ☐ |
| A3 | Captured photo actually uploads and `SelfieStep` shows "Selfie received" | ☐ | ☐ |
| A4 | Re-tapping "Take or choose a photo" lets you pick a different shot before continuing | ☐ | ☐ |
| A5 | Backgrounding the app mid-capture (e.g. a notification) and returning doesn't lose the in-progress upload silently | ☐ | ☐ |
| A6 | Poor/interrupted network during upload shows an error, not a stuck spinner forever | ☐ | ☐ |
| A7 | Camera permission already denied at the iOS Settings level (not just in-app) — app's error path, not a crash | ☐ | ☐ |
| A8 | Confirm which UI actually appears: native camera capture, or does it ever fall back to the photo library picker instead | ☐ | ☐ |

## Test matrix B — `VideoPromptStep` (optional, live `getUserMedia` stream)

| # | Test | Safari tab | Installed (Home Screen) |
|---|------|:---:|:---:|
| B1 | Camera **and microphone** permission prompt appears together and both grant correctly | ☐ | ☐ |
| B2 | Live preview (`<video>` during recording) actually shows a real image, not a black/frozen frame | ☐ | ☐ |
| B3 | Recording starts, the 0:00 counter advances, and it auto-stops at 0:30 | ☐ | ☐ |
| B4 | Manual "Stop" before 30s works and moves to the review phase | ☐ | ☐ |
| B5 | Review playback (`<video controls>`) actually plays the just-recorded clip | ☐ | ☐ |
| B6 | "Redo" correctly discards and lets you re-record (unlimited retakes, per the UI's own copy) | ☐ | ☐ |
| B7 | "Use this take" succeeds: uploads, and the wizard shows "Saved: ..." | ☐ | ☐ |
| B8 | Deny permission — the friendly "Focus needs camera and microphone access..." message appears, not a silent hang. **This is the specific case worth watching closely**: some WebKit bugs in this area manifest as the `getUserMedia` promise never resolving at all, which this app's own `catch` block cannot help with, since nothing ever throws | ☐ | ☐ |
| B9 | Lock/unlock the phone mid-recording, then check whether the stream/recorder survived or the app recovered sanely | ☐ | ☐ |
| B10 | Browser reports no `mediaDevices`/`MediaRecorder` at all (older iOS or a locked-down configuration) — confirm the "isn't supported... you can skip this" message actually appears instead of a broken record button | ☐ | ☐ |
| B11 | Backgrounding mid-recording (e.g. a phone call) and returning | ☐ | ☐ |

## Device coverage

Use at least two physical iPhone generations if more than one is
available — WebKit's own history in this area has included
device-specific behavior, not just OS-version-specific. Run both matrices
on the current public iOS release. If a second iOS version is easy to
reach (e.g. a device not yet updated), a second data point is worth
having but not worth delaying on.

## What to do with the results

- **Matrix A fails only in installed-PWA mode**: since this flow already
  degrades to the OS's native camera/photo-library UI, the likely fix is
  small (e.g. an `accept`/`capture` attribute adjustment) — bring the
  specific failure back before designing anything.
- **Matrix B fails in installed-PWA mode but works in a Safari tab**: this
  is the scenario the "continue verification in Safari" handoff idea was
  meant for. That handoff is **not built**, on purpose — designing it now,
  before real testing shows it's actually needed, would be building
  against a hypothetical instead of a finding (this project's own standing
  rule: don't invent features testing hasn't shown a real gap for). If B
  fails for real, come back with the exact failure mode and a fallback
  gets designed against that, including the session-binding threat-model
  question a Safari handoff would raise (the pose challenge and the
  resulting selfie/video need to stay bound to the same user and the same
  attempt across the handoff).
- **Everything passes**: close the section 15 bullet outright; no code
  change needed, this was a documentation gap, not a product one.

## Reporting format

For each failing row: device model, iOS version, Safari tab vs. installed,
exact behavior observed (a screen recording is worth more than a
description here, especially for anything involving a hang or a silent
failure), and whether retrying the same step ever succeeds.

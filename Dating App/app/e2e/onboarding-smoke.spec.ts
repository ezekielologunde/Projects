import { test, expect, type Page } from "@playwright/test";

/**
 * Playwright smoke test (spec sections 11.3, 11.4 step 6): sign up with
 * OTP (local Mailpit), complete onboarding, submit for review. Stops at
 * "pending" rather than continuing through admin approval -- that half
 * needs a real aal2/TOTP session, which stays a manual test-plan item
 * until a seeded test-admin TOTP secret exists to automate it against
 * (see playwright.config.ts's own header comment).
 *
 * Runs against the real local Supabase stack (not the CI job's separate,
 * canary-value Build/headers-check steps, which deliberately don't need
 * a working backend at all) -- MAILPIT_URL must point at it.
 */

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

async function getSignInCode(email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const body = (await res.json()) as { messages: { Snippet: string }[] };
    const latest = body.messages[0];
    if (latest) {
      const match = latest.Snippet.match(/\b(\d{6})\b/);
      if (match) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No sign-in code arrived for ${email} within 10 seconds`);
}

// A 1x1 white pixel, real enough for Sharp to decode as a genuine image
// (spec section 9.4: byte-sniffed, not trusted from a filename/extension).
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function uploadTinyImage(page: Page, locator: ReturnType<Page["locator"]>, filename: string) {
  await locator.setInputFiles({ name: filename, mimeType: "image/png", buffer: TINY_PNG });
}

test("sign up, complete onboarding, and submit for review", async ({ page }) => {
  test.setTimeout(90_000);
  const email = `pw-smoke-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.test`;

  // ===== Sign in with OTP =====
  await page.goto("/");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();

  const code = await getSignInCode(email);
  await page.getByLabel("Code").fill(code);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  // ===== Age gate =====
  await expect(page.getByRole("heading", { name: "When were you born?" })).toBeVisible();
  await page.locator('input[type="date"]').fill("1995-05-15");
  await page.getByRole("button", { name: "Continue" }).click();

  // ===== Consent =====
  await expect(page.getByRole("heading", { name: "Before we continue" })).toBeVisible();
  await page.getByLabel("I agree to the Terms of Service.").check();
  await page.getByLabel("I agree to the Privacy Policy.").check();
  await page.getByLabel("I consent to Focus collecting sensitive information for matching.").check();
  await page.getByRole("button", { name: "Continue" }).click();

  // ===== Basics =====
  await expect(page.getByRole("heading", { name: "The basics" })).toBeVisible();
  await page.getByLabel("First name").fill("Playwright");
  await page.getByLabel("City").fill("Test City");
  await page.getByRole("button", { name: "Continue" }).click();

  // ===== Prompts: one required answer per category =====
  await expect(page.getByRole("heading", { name: "A few prompts" })).toBeVisible();
  const promptAnswers = page.locator('input[required][maxlength="200"]');
  await expect(promptAnswers).toHaveCount(3);
  await promptAnswers.nth(0).fill("Slow mornings and long walks.");
  await promptAnswers.nth(1).fill("I try to listen first.");
  await promptAnswers.nth(2).fill("Steady, warm, a little chaotic.");
  await page.getByRole("button", { name: "Continue" }).click();

  // ===== Capacity: default (1) is already valid =====
  await expect(page.getByRole("heading", { name: /how many people/i })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // ===== Non-negotiables: every field has a usable default =====
  await expect(page.getByRole("heading", { name: "What matters most" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // ===== Heritage (optional): every field defaults to empty/off, so
  // Continue alone is a valid submission -- there's no separate Skip
  // control, just the same StepButtons every other step uses =====
  await expect(page.getByRole("heading", { name: "Heritage (optional)" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // ===== Genetic compatibility (optional): same shape, no separate Skip =====
  await expect(page.getByRole("heading", { name: "Genetic compatibility" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // ===== Photos: only the required position-1 photo; video prompt (needs
  // real camera/mic) is optional and left untouched =====
  await expect(page.getByRole("heading", { name: "Photos" })).toBeVisible();
  await uploadTinyImage(page, page.locator('input[type="file"]').first(), "slot1.png");
  await expect(page.getByText("Uploaded").first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  // ===== Selfie: a plain file upload, not a camera capture =====
  await expect(page.getByRole("heading", { name: "Quick verification" })).toBeVisible();
  await page.getByRole("button", { name: "Start verification" }).click();
  await uploadTinyImage(page, page.locator('input[type="file"]'), "selfie.png");
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  // ===== Review and submit =====
  await expect(page.getByRole("heading", { name: "Ready to submit" })).toBeVisible();
  await page.getByRole("button", { name: "Submit for review" }).click();

  await expect(page).toHaveURL(/\/onboarding\/pending/);
});

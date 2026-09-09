import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright smoke config (spec sections 11.3, 11.4 step 6). Scoped to the
 * Phase 1 half of the journey the spec describes -- sign up with OTP,
 * complete onboarding, submit for review -- not the admin-approval half,
 * which needs a real aal2/TOTP session and stays a manual test-plan item
 * until a seeded test-admin TOTP secret exists to automate it against.
 *
 * webServer runs `pnpm dev`, not a production build: this needs the real
 * local Supabase stack's env vars (Playwright's own job step exports them
 * from `supabase status -o env` in CI), unlike the CI job's separate
 * Build/headers-check steps, which deliberately use canary values and
 * don't need a working backend at all.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

import { defineConfig, configDefaults } from "vitest/config";

// Without this, Vitest's default file discovery also picks up
// e2e/onboarding-smoke.spec.ts (any *.spec.ts matches), and fails
// importing it: @playwright/test's test() throws outside Playwright's
// own runner. Confirmed by reproducing the failure locally before
// adding this. Playwright's own config already scopes to `./e2e` only,
// so this is the same exclusion from the other direction.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});

import { defineConfig, configDefaults } from 'vitest/config'

// Scopes the server-side test run to this package's own tests (lib/**) and
// excludes web/, which has its own independent vitest config (jsdom env,
// etc.) and its own `npm test` invoked separately from within web/.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'web/**'],
  },
})

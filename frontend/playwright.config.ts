import { defineConfig, devices } from '@playwright/test'

const PORTA_E2E = Number(process.env.E2E_PORTA ?? 5180)
const URL_BASE = `http://localhost:${PORTA_E2E}`
const URL_API = process.env.API_PROXY_ALVO ?? 'http://localhost:5280'
const LENTIDAO_MS = Number(process.env.E2E_LENTIDAO_MS ?? 0)
const EM_CI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: EM_CI,
  retries: EM_CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: URL_BASE,
    testIdAttribute: 'data-teste',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { slowMo: LENTIDAO_MS },
  },
  projects: [
    {
      name: 'simulado',
      testMatch: '*.e2e.ts',
      testIgnore: 'integrado/**',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'preparacao',
      testMatch: 'integrado/preparacao.setup.ts',
    },
    {
      name: 'integrado',
      testMatch: 'integrado/**/*.e2e.ts',
      dependencies: ['preparacao'],
      timeout: 90_000,
      expect: { timeout: 10_000 },
      use: { ...devices['Desktop Chrome'], launchOptions: { slowMo: LENTIDAO_MS } },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORTA_E2E} --strictPort --host localhost`,
    url: URL_BASE,
    reuseExistingServer: !EM_CI,
    timeout: 120_000,
    env: { API_PROXY_ALVO: URL_API },
  },
})

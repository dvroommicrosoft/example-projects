import { defineConfig } from '@playwright/test'

const url = 'http://127.0.0.1:4176/example-projects/place-de-la-concorde/'

// Tests run against the production preview: run `npm run build` first.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  timeout: 60_000,
  use: {
    baseURL: url,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
      ],
    },
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4176 --strictPort',
    url,
    reuseExistingServer: !process.env.CI,
  },
})

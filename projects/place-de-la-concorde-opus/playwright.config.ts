import { defineConfig } from '@playwright/test'

const url = 'http://127.0.0.1:4176/example-projects/place-de-la-concorde-opus/'

export default defineConfig({
  testDir: './tests/browser',
  use: {
    baseURL: url,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4176 --strictPort',
    url,
    reuseExistingServer: !process.env.CI,
  },
})

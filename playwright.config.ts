import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright/tests',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4200',
    viewport: { width: 1440, height: 1100 },
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 4200',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120 * 1000,
  },
});

/**
 * Playwright configuration for isolated OmniMentor guided-flow browser verification.
 */
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const webPort = 10091;
const { defineConfig, devices } = require(path.join(rootDir, 'workspace/node_modules/@playwright/test'));

module.exports = defineConfig({
  testDir: path.join(__dirname, 'e2e'),
  outputDir: path.join(rootDir, 'workspace', 'test-results'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: path.join(rootDir, 'workspace', 'playwright-report') }]],
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
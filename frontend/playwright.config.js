import { defineConfig } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(frontend);
// Workers inherit this path; config reloads must not create a second mailbox.
if (!process.env.E2E_DATA_DIR) {
  process.env.E2E_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'smartcourt-e2e-'));
  writeFileSync(path.join(process.env.E2E_DATA_DIR, '.smartcourt-e2e'), 'isolated test run');
}
const python = process.env.E2E_PYTHON || path.join(root, 'backend', 'venv', 'Scripts', 'python.exe');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: [['list'], ['html', { outputFolder: '../docs/e2e-report', open: 'never' }],
    ['json', { outputFile: '../docs/e2e-results.json' }]],
  outputDir: './test-results',
  use: {
    baseURL: 'http://127.0.0.1:5199',
    browserName: 'chromium',
    launchOptions: process.env.E2E_BROWSER_EXECUTABLE
      ? { executablePath: process.env.E2E_BROWSER_EXECUTABLE } : {},
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15000,
  },
  webServer: [
    {
      command: `"${python}" "${path.join(root, 'scripts', 'start_e2e_backend.py')}"`,
      url: 'http://127.0.0.1:8099/api/courts/status/',
      env: { E2E_DATA_DIR: process.env.E2E_DATA_DIR },
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: `"${process.execPath}" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5199 --strictPort`,
      url: 'http://127.0.0.1:5199',
      env: { VITE_API_BASE_URL: 'http://127.0.0.1:8099/api' },
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});

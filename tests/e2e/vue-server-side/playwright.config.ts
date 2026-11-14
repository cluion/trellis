import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    testMatch: '*.spec.ts',
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    failOnFlakyTests: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    timeout: 30_000,
    reporter: [
        ['list'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
    ],
    use: {
        baseURL: 'http://127.0.0.1:4176',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    webServer: {
        command: 'node server.mjs',
        url: 'http://127.0.0.1:4176/__test/health',
        reuseExistingServer: false,
        gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ],
});

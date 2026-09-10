import { defineConfig } from '@playwright/test';

/**
 * Screenshot review (SPEC §12.4): the renderer is verified by looking at it,
 * not by unit tests.
 *
 * Headless Chromium has no GPU here, so WebGL runs on SwiftShader. Without
 * these flags the canvas silently renders nothing at all — the page loads, the
 * test passes, and every screenshot is a flat background.
 */
export default defineConfig({
  testDir: 'tests-e2e',
  outputDir: 'test-results',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      /*
       * This image ships Chromium 1194; the pinned @playwright/test wants a
       * newer build and would try to download one. Point at what is here.
       * Full Chromium rather than headless_shell: the shell build has no
       * working WebGL path under SwiftShader.
       */
      executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--disable-gpu-sandbox',
      ],
    },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});

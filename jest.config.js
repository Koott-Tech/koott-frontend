/** @type {import('jest').Config} */
const config = {
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',           // Playwright e2e tests — run with: npx playwright test
    '/.next/',
    '/test-results/',
  ],
};

module.exports = config;

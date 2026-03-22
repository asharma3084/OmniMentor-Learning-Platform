# Tests Directory

This directory is reserved for cross-application automation assets.

What belongs here:
- Playwright end-to-end specs
- shared browser-test fixtures and helpers
- automation-only test data
- test-runner configuration for cross-app flows

What does not belong here:
- package-level unit tests
- service-level unit tests
- code-adjacent tests that are easier to maintain next to the implementation

Current structure:
- `tests/e2e` — Playwright specs for guided browser flows
- `tests/playwright.config.js` — Playwright configuration for the isolated GUI stack

Repo-level process scripts stay in `scripts/`.
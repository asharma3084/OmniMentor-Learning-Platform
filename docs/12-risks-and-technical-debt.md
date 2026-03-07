# 12. Risks And Technical Debt

## Current Risks

1. Runtime dependency sensitivity (`better-sqlite3`) can fail on environment mismatch.
2. Smoke and eval require API runtime and can fail if service startup is skipped.
3. Retrieval modes are still early and need deeper benchmark coverage.

## Mitigations

1. Keep native module verification command in runbook.
2. Keep health-check step as mandatory before smoke/eval.
3. Expand benchmark matrix and regression checks per retrieval mode.

## Technical Debt

1. Limited scenario volume for evaluation breadth.
2. Minimal API contract examples in docs.
3. Early-stage ops automation for release packaging.

## Debt Paydown Plan

1. Add more scenarios and gold labels incrementally.
2. Expand API examples in `03-api-contract.md`.
3. Add release automation tasks under CI and deployment docs.

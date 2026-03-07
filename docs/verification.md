# Verification Playbook

This document defines reproducible checks for Week 1 and later phases.

## Standard Gate Set

Run from repo root:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm smoke
pnpm eval
pnpm audit
```

## Runtime Prerequisite

`pnpm smoke` and `pnpm eval` require API to be running:

```bash
pnpm --filter @omnimentor/api dev
```

Health probe:

```bash
curl -s http://localhost:3001/health
```

## Expected Artifacts

- Smoke report:
  - `reports/week1/smoke-<timestamp>.json`
- Ablation report:
  - `services/api/reports/week1/ablation-run-<timestamp>.json`
- Ablation summary:
  - `services/api/reports/week1/ablation-summary.csv`

## How To Interpret Smoke Output

- `Smoke test PASSED` means runtime flow completed successfully.
- `Gate: FAIL` may still appear if sample submission does not fully pass evidence gating.
- These are different signals and should be interpreted separately.

## Repeatability Rule

For high-confidence checkpoints, run the full gate set multiple times.
Example 5x loop:

```bash
set -e
for i in 1 2 3 4 5; do
  pnpm lint
  pnpm test
  pnpm typecheck
  pnpm build
  pnpm audit
  pnpm smoke
  pnpm eval
done
```

## Logging Requirement

After each session, retain command outcomes in local session notes and preserve generated report artifacts for reproducibility.

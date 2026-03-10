# Verification Playbook

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


This document defines reproducible verification checks for development and check-in phases.

## Standard Gate Set

Run from repo root:

```bash
pnpm --dir workspace lint
pnpm --dir workspace test
pnpm --dir workspace typecheck
pnpm --dir workspace build
pnpm --dir workspace smoke
pnpm --dir workspace eval
pnpm --dir workspace audit
```

## Runtime Prerequisite

`pnpm --dir workspace smoke` and `pnpm --dir workspace eval` require API to be running:

```bash
pnpm --dir workspace --filter @omnimentor/api dev
```

Health probe:

```bash
curl -s http://localhost:9992/health
curl -s http://localhost:9992/surveys/status
```

## Expected Artifacts

- Smoke reports:
  - `reports/week1/smoke-<timestamp>.json` (baseline)
  - `reports/week2/smoke-<timestamp>.json` (corpus-backed retrieval)
- Ablation reports:
  - `reports/week2/ablation-run-<timestamp>.json`
- Ablation summary:
  - `reports/week2/ablation-summary.csv`

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
  pnpm --dir workspace lint
  pnpm --dir workspace test
  pnpm --dir workspace typecheck
  pnpm --dir workspace build
  pnpm --dir workspace audit
  pnpm --dir workspace smoke
  pnpm --dir workspace eval
done
```

## Logging Requirement

After each session, retain command outcomes in local session notes and preserve generated report artifacts for reproducibility.

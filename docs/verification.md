# Verification Playbook

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)

![Proposal Aligned](https://img.shields.io/badge/Proposal-Aligned-f59e0b?style=flat-square) ![CS6460 Gate Discipline](https://img.shields.io/badge/CS6460-Gate%20Discipline-2563eb?style=flat-square) ![Synthetic Only](https://img.shields.io/badge/Data-Synthetic%20Only-16a34a?style=flat-square)

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

# 12. Risks And Technical Debt

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)

![Proposal Aligned](https://img.shields.io/badge/Proposal-Aligned-f59e0b?style=flat-square) ![CS6460 Gate Discipline](https://img.shields.io/badge/CS6460-Gate%20Discipline-2563eb?style=flat-square) ![Synthetic Only](https://img.shields.io/badge/Data-Synthetic%20Only-16a34a?style=flat-square)

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

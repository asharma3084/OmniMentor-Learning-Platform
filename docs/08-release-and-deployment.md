# 08. Release And Deployment

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)

![Proposal Aligned](https://img.shields.io/badge/Proposal-Aligned-f59e0b?style=flat-square) ![CS6460 Gate Discipline](https://img.shields.io/badge/CS6460-Gate%20Discipline-2563eb?style=flat-square) ![Synthetic Only](https://img.shields.io/badge/Data-Synthetic%20Only-16a34a?style=flat-square)

## Pre-Release Checklist

- Quality gates pass.
- Smoke and eval outputs generated.
- README and docs updated for user-facing changes.
- No secrets or sensitive data in staged files.

## Release Notes Minimum

- Summary of what changed.
- Risk/impact statement.
- Verification commands and outcomes.

## Deployment Notes

- Local deployment assets live under `deploy/local`.
- Additional platform deployment assets can be added under `deploy/` as the project expands.

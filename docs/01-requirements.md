# 01. Requirements

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)

![Proposal Aligned](https://img.shields.io/badge/Proposal-Aligned-f59e0b?style=flat-square) ![CS6460 Gate Discipline](https://img.shields.io/badge/CS6460-Gate%20Discipline-2563eb?style=flat-square) ![Synthetic Only](https://img.shields.io/badge/Data-Synthetic%20Only-16a34a?style=flat-square)

## Functional Requirements

- The system must list and serve learning scenarios.
- The system must expose evidence artifacts per scenario.
- The system must accept learner submissions with structured fields.
- The system must score submissions using evidence gating and rubric metrics.
- The system must return feedback payloads suitable for UI display.
- The system must run ablation/evaluation modes and produce reports.

## Non-Functional Requirements

- Reproducible local setup with documented commands.
- Type-safe codebase with clean typecheck gate.
- Deterministic unit tests for core scoring behavior.
- Synthetic-only data usage in repository artifacts.
- Baseline dependency hygiene via audit checks.
- Single-user local operation as default runtime mode.
- Open-source distribution only (no paid feature tiers).
- No telemetry or external user-data collection.

## Acceptance Criteria (Phase 1)

- `pnpm lint` passes.
- `pnpm test` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes.
- `pnpm smoke` passes with API running.
- `pnpm eval` generates JSON/CSV outputs.
- `pnpm audit` reports no known vulnerabilities.

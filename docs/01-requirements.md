# 01. Requirements

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

## Acceptance Criteria (Phase 1)

- `pnpm lint` passes.
- `pnpm test` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes.
- `pnpm smoke` passes with API running.
- `pnpm eval` generates JSON/CSV outputs.
- `pnpm audit` reports no known vulnerabilities.

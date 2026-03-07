# ADR (Architecture Decision Records)

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](../README.md) [![OmniMentor](https://img.shields.io/badge/OmniMentor-6366f1?style=for-the-badge&labelColor=1e1b4b)](../../README.md) [![Decisions Log](https://img.shields.io/badge/Decisions%20Log-a855f7?style=for-the-badge&labelColor=3b0764)](../11-decisions-log.md)


Use this directory for decision records that matter to long-term architecture and delivery.

## Why ADRs

ADRs capture the why behind important decisions so future contributors can understand context, trade-offs, and consequences.

## Naming Convention

Use lowercase kebab-case with date prefix:

- `2026-03-07-monorepo-with-pnpm-workspaces.md`
- `2026-03-07-synthetic-only-data-policy.md`

## Recommended Template

```md
# ADR: <Decision Title>

- Date: YYYY-MM-DD
- Status: Proposed | Accepted | Superseded

## Context
What problem or constraint requires this decision?

## Decision
What was decided?

## Consequences
What are the expected benefits, costs, and follow-up actions?
```

## Lifecycle

1. Propose
2. Review
3. Accept
4. Revisit when constraints change

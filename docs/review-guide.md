# Review Guide

This guide helps reviewers and instructors quickly evaluate progress quality and reproducibility.

## What To Look For

- Is the project aligned with proposal goals?
- Are claims backed by reproducible command evidence?
- Are outputs generated from synthetic-only data?
- Is verification discipline consistent across sessions?

## Fast Review Checklist

1. Open `README.md` for mission, run path, and verification commands.
2. Open `docs/architecture.md` for module boundaries and data flow.
3. Confirm latest artifacts exist in `reports/week1/` and `services/api/reports/week1/`.

## Minimum Week 1 Signals

- `pnpm lint` passes
- `pnpm test` passes
- `pnpm typecheck` passes
- `pnpm smoke` passes
- `pnpm eval` passes
- Artifact files are present and timestamped

## Academic Integrity Signals

- No personal data in repository artifacts
- No company/internal datasets
- No secrets in source control
- Synthetic benchmark/evidence usage only

## Suggested Review Questions

- Which blockers were encountered, and how were they resolved?
- What evidence shows reproducibility beyond a single run?
- How does current implementation map to proposal outcomes?
- What is the highest-priority risk for the next phase?

## Suggested Grading Confidence Indicators

- High confidence: repeated green gates with clear logs and artifact trail.
- Medium confidence: single green run but weak continuity notes.
- Low confidence: unverifiable claims, missing artifacts, or inconsistent logs.

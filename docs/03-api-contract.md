# 03. API Contract

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)

![Proposal Aligned](https://img.shields.io/badge/Proposal-Aligned-f59e0b?style=flat-square) ![CS6460 Gate Discipline](https://img.shields.io/badge/CS6460-Gate%20Discipline-2563eb?style=flat-square) ![Synthetic Only](https://img.shields.io/badge/Data-Synthetic%20Only-16a34a?style=flat-square)

Base URL (local): `http://localhost:3001`

## Endpoints

- `GET /` service metadata
- `GET /health` health status
- `GET /scenarios` list scenarios
- `GET /scenarios/:id` scenario details
- `GET /evidence?scenarioId=:id` scenario evidence
- `POST /submissions` create submission
- `POST /score` score submission
- `POST /ablation/run` run evaluation modes

## Core Response Expectations

- Errors use JSON payloads with message-level detail.
- Health route returns an `ok` status and timestamp.
- Score route returns gating + rubric/metric outputs.

## Versioning Guidance

- Add route versioning (`/v1`) when backward-incompatible changes begin.
- Keep request/response examples updated with any contract changes.

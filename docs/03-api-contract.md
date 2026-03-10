# 03. API Contract

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


Base URL (local): `http://localhost:9992`

## Endpoints

- `GET /` service metadata
- `GET /health` health status
- `GET /scenarios` list scenarios
- `GET /scenarios/:id` scenario details
- `GET /evidence?scenarioId=:id` scenario evidence
- `POST /submissions` create submission
- `POST /score` score submission
- `POST /ablation/run` run evaluation modes

## Session Tracking

- `POST /sessions/start` — Create a new learning session.
  - Body: `{ scenarioId: string }`
  - Response: `{ sessionId: string, startedAt: string }`

- `POST /sessions/event` — Log a behavioral event within a session.
  - Body: `{ sessionId: string, event: "first_evidence" | "first_submit" | "completed" }`
  - Response: `{ success: true }`

- `GET /analytics/sessions` — Retrieve session timing and attempt data.
  - Query: optional `scenarioId`
  - Response: array of `{ id, scenarioId, startedAt, firstEvidenceAt, firstSubmitAt, completedAt, durationSec, attemptNumber }`

## Pre/Post Surveys

- `POST /surveys` — Submit a pre or post survey.
  - Body: `{ type: "pre" | "post", q1Confidence: 1-5, q2Comfort: 1-5, q3Clarity: 1-5, q4Readiness: 1-5, q5Anxiety: 1-5 }`
  - Response: `{ id: number }`

- `GET /surveys` — Retrieve submitted survey responses.
  - Query: optional `type` (pre | post)
  - Response: array of survey response objects

- `GET /surveys/status` — Check pre/post survey completion state.
  - Response: `{ preCompleted: boolean, postCompleted: boolean }`

## Core Response Expectations

- Errors use JSON payloads with message-level detail.
- Health route returns an `ok` status and timestamp.
- Score route returns gating + rubric/metric outputs.
- Session/survey endpoints use Zod-validated request schemas.

## Versioning Guidance

- Add route versioning (`/v1`) when backward-incompatible changes begin.
- Keep request/response examples updated with any contract changes.

# 03. API Contract

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

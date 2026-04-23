# API Contract


Base URL (local): `http://localhost:9992`

## Endpoints

- `GET /` service metadata
- `GET /health` health status
- `GET /scenarios` list scenarios
- `GET /scenarios/:id` scenario details
- `GET /scenarios/:id/example-answer` scenario-specific strong example answer with coaching
- `GET /evidence?scenarioId=:id` scenario evidence
- `POST /submissions` create submission
- `POST /score` score submission
- `POST /ablation/run` run evaluation modes
- `POST /assist` AI assistant coaching (streaming SSE)

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
  - Body: `{ surveyType: "pre" | "post", q1Confidence: 1-5, q2Comfort: 1-5, q3Clarity: 1-5, q4Readiness: 1-5, q5Anxiety: 1-5 }`
  - Response: `{ id: string, surveyType: "pre" | "post", createdAt: string }`

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
- Submission and score endpoints reject evidence that is not part of the active scenario.
- Submission and score endpoints require at least one `primary` and one `corroborating` artifact.

## Scenario Example Answer

- `GET /scenarios/:id/example-answer`
  - Purpose: provide a strong scenario-specific answer that a new TPM can study or apply into the form.
  - Response includes:
    - `ownerRouting`
    - `dependencyTrace`
    - `actionPlan`
    - `blastRadius`
    - `evidenceNotes`
    - `selectedEvidenceIds`
    - `selectedEvidence`
    - `whyItWorks`
    - `fieldGuidance`

## Versioning Guidance

- Add route versioning (`/v1`) when backward-incompatible changes begin.
- Keep request/response examples updated with any contract changes.

## AI Assistant (Streaming)

- `POST /assist` — Send a learner question for context-aware coaching.
  - Body: `{ scenarioId: string, step: "brief" | "investigate" | "decide" | "feedback", selectedEvidence: string[], question: string (1+ chars) }`
  - Response: `text/event-stream` (Server-Sent Events)
  - Each event: `data: { "token": "..." }` or `data: { "done": true }`
  - Requires Ollama running locally (`OLLAMA_URL`, default `http://127.0.0.1:11434`)
  - Model: `OLLAMA_MODEL` env var, default `llama3.2`
  - The assistant is stateless — each request is independent with no conversation history on the server. The system prompt is rebuilt per request from scenario context in SQLite.
  - Guardrails enforced in the system prompt: scope-limited to scenario, no gold answers, no hallucination, concise responses (2-3 sentences), off-topic rejection.

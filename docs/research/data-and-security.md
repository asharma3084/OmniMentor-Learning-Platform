# Data And Security


## Data Handling

- Use synthetic-only datasets in repository workflows.
- Do not commit personal or company-internal data.
- Do not send learner data to external services.
- Do not include telemetry or analytics tracking.
- Learning session data (timing, behavioral events) and survey responses are stored locally in SQLite only — no external transmission.
- Survey responses contain no PII; Likert scores are anonymous self-assessment data.

## Secret Management

- Keep secrets in local `.env` only.
- Commit `config/.env.example` placeholders only.

## Dependency Hygiene

- Run `pnpm audit` in verification gates.
- Upgrade vulnerable dependencies promptly.

## Baseline Controls

- Input validation for API request payloads.
- Zod schema validation on session, survey, and AI assistant endpoints.
- Centralized error handling.
- Localhost-scoped CORS and rate limiting for local runtime.
- AI Assistant (`POST /assist`) uses Ollama running locally — no learner questions or responses leave the machine.
- Assistant chat messages are not persisted; each request is stateless with no server-side conversation history.
- AI assistant responses are sanitized via DOMPurify before rendering in the browser (prevents XSS from model output).

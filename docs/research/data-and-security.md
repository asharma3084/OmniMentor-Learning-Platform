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
- Zod schema validation on session and survey endpoints.
- Centralized error handling.
- Localhost-scoped CORS and rate limiting for local runtime.

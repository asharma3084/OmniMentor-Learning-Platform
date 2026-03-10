# 10. Security And Compliance

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


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

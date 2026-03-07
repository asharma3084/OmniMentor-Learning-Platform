# 10. Security And Compliance

## Data Handling

- Use synthetic-only datasets in repository workflows.
- Do not commit personal or company-internal data.

## Secret Management

- Keep secrets in local `.env` only.
- Commit `.env.example` placeholders only.

## Dependency Hygiene

- Run `pnpm audit` in verification gates.
- Upgrade vulnerable dependencies promptly.

## Baseline Controls

- Input validation for API request payloads.
- Centralized error handling.
- Localhost-scoped CORS and rate limiting for local runtime.

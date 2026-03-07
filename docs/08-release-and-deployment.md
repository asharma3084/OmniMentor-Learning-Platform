# 08. Release And Deployment

## Pre-Release Checklist

- Quality gates pass.
- Smoke and eval outputs generated.
- README and docs updated for user-facing changes.
- No secrets or sensitive data in staged files.

## Release Notes Minimum

- Summary of what changed.
- Risk/impact statement.
- Verification commands and outcomes.

## Deployment Notes

- Local deployment assets live under `deploy/local`.
- Enterprise overlays live under `deploy/enterprise`.

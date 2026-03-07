# 06. Testing Strategy

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


## Test Layers

- Unit tests: core scoring and gating behavior.
- Runtime smoke test: end-to-end scenario to scored output.
- Evaluation run: retrieval-mode and report generation checks.

## Commands

```bash
pnpm test
pnpm smoke
pnpm eval
```

## Quality Gates

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm audit
```

## Exit Criteria For Merge

- All quality gates are green.
- Smoke and eval execute successfully with API running.
- New behavior includes test updates when required.

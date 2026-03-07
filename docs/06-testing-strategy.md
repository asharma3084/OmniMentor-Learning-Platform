# 06. Testing Strategy

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

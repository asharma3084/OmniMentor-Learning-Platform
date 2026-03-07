# 07. Verification And Quality Gates

## Standard Verification Commands

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm smoke
pnpm eval
pnpm audit
```

## Runtime Requirement

`pnpm smoke` and `pnpm eval` require API runtime:

```bash
pnpm --filter @omnimentor/api dev
```

## Repeatability Rule

For high-confidence checkpoints, run full gates multiple times and preserve generated artifact outputs.

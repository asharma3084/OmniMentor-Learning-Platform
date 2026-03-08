# 07. Verification And Quality Gates

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


## Standard Verification Commands

```bash
pnpm --dir workspace lint
pnpm --dir workspace test
pnpm --dir workspace typecheck
pnpm --dir workspace build
pnpm --dir workspace smoke
pnpm --dir workspace eval
pnpm --dir workspace audit
```

## Runtime Requirement

`pnpm --dir workspace smoke` and `pnpm --dir workspace eval` require API runtime:

```bash
pnpm --dir workspace --filter @omnimentor/api dev
```

## Repeatability Rule

For high-confidence checkpoints, run full gates multiple times and preserve generated artifact outputs.

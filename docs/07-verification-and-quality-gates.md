# 07. Verification And Quality Gates

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


## Purpose

Quality gates serve dual purposes for this research:

1. **Engineering discipline**: catch bugs, enforce type safety, and maintain codebase health across development cycles.
2. **Research validity**: reproducible command artifacts and gate executions provide evidence that evaluation results are independent of runtime environment and operator choice. Design-Based Research methodology (Barab & Squire, 2004) requires transparent, repeatable validation — every gate run produces timestamped artifacts that can be independently reproduced.

This distinction matters: a passing smoke test is not just a health check — it is evidence that the scoring pipeline produces consistent results across the full benchmark set.

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

Reproducibility is a research requirement, not just engineering convenience. Each gate run generates timestamped output in `reports/` that serves as evidence for DBR cycle evaluation. If a gate that previously passed begins failing, the timestamped artifact trail enables root-cause analysis — distinguishing implementation regressions from environment changes.

## Research Artifact Chain

| Gate | Engineering Signal | Research Signal |
|---|---|---|
| `lint` | Code hygiene | Consistent codebase state across iterations |
| `test` | Regression safety | Scoring logic stability across DBR cycles |
| `typecheck` | Type correctness | Contract integrity between system components |
| `build` | Deployability | Reproducible build for evaluation |
| `smoke` | End-to-end health | Full pipeline produces consistent results against benchmark |
| `eval` | Ablation metrics | Quantitative evidence for mode comparison (RQ1) |
| `audit` | Dependency safety | Supply-chain integrity for research tool |
| session/survey endpoints | Instrumentation health | Learning analytics data collection readiness for RQ1/RQ2/RQ3 |

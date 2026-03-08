# 09. Operations Runbook

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


## Service Health

```bash
curl -s http://localhost:3001/health
```

Expected: JSON response with `status: ok`.

## Common Runtime Issue

Problem: `pnpm --dir workspace smoke` fails with fetch/connect errors.

Resolution:
1. Start API service.
2. Recheck `/health`.
3. Rerun smoke/eval.

## Native Module Check (SQLite)

```bash
pnpm --dir workspace --filter @omnimentor/api exec node -e "const Database=require('better-sqlite3'); const db=new Database(':memory:'); db.prepare('select 1').get(); db.close(); console.log('ok');"
```

# 09. Operations Runbook

## Service Health

```bash
curl -s http://localhost:3001/health
```

Expected: JSON response with `status: ok`.

## Common Runtime Issue

Problem: `pnpm smoke` fails with fetch/connect errors.

Resolution:
1. Start API service.
2. Recheck `/health`.
3. Rerun smoke/eval.

## Native Module Check (SQLite)

```bash
pnpm --filter @omnimentor/api exec node -e "const Database=require('better-sqlite3'); const db=new Database(':memory:'); db.prepare('select 1').get(); db.close(); console.log('ok');"
```

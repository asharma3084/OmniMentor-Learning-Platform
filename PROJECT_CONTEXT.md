# PROJECT_CONTEXT.md — OmniMentor Phase 1

**Last Updated**: 2026-03-07 (Initial Phase 1 Setup)

## Current Phase
**Phase 1 (Week 1)**: Repo scaffold, Flow A spine, evidence gating v1, benchmark scaffold, smoke/eval scripts.

## Session 1 Summary (2026-03-07)
- ✅ Proxy unset (Walmart sysproxy.wal-mart.com:8080)
- ✅ Packages installed: git 2.50.1, node v24.8.0, pnpm 10.30.3, sqlite 3.51.0
- ✅ Local git initialized (no remote yet; ready to push to GitHub when ready)
- ✅ Phase 1 scaffold complete (directories + key files)

## Next 3 Immediate Tasks
1. Run `pnpm install` to validate monorepo structure
2. Implement Flow A spine (API + UI + 1 scenario)
3. Create unit tests (gating, scoring) + smoke script

## Key Constraints
- **Academic-only repo**: NO Walmart data, NO personal info, NO secrets in commits
- **Stack**: TypeScript/Node + React (Vite) + sqlite
- **.gitignore rule**: Exclude `.env`, `*.db`, logs, raw reports, and Walmart/personal data
- **Verification gates**: `pnpm lint`, `test`, `typecheck`, `smoke` must pass before "done"

## Files & Scripts to Create (Phase 1 Checklist)
- [x] `README.md` — run instructions + smoke/eval commands
- [x] `docs/architecture.md` — Mermaid diagram + layer explanation
- [x] `.env.example` — defaults/placeholders only
- [x] `.gitignore` — db, env, logs, reports, Walmart-sensitive files
- [x] `.github/workflows/ci.yml` — lint/test/typecheck/build + `pnpm audit`
- [x] `VERIFICATION_LOG.md` — session tracking (append each time)
- [x] Repo structure (all directories created)
- [x] `package.json` (root monorepo + workspace)
- [ ] Flow A implementation (1 scenario end-to-end)
- [ ] Evidence gating v1 + scoring unit tests
- [ ] Benchmark scaffold (1 scenario + gold labels)
- [ ] `scripts/smoke.ts` — end-to-end verification
- [ ] `scripts/eval_run.ts` — benchmark runner (scaffold Phase 1)

`./data/omnimentor.db` — created on first API run (sqlite schema per architecture.md)
Environment var: `DATABASE_URL=./data/omnimentor.db` (in .env)*
Likely: `./data/omnimentor.db` (add to .gitignore)

## How to Verify
```bash
pnpm lint        # Lint all packages
pnpm test        # Run unit tests
pnpm typecheck   # TypeScript check
pnpm smoke       # End-to-end smoke test (Phase 1 gate)
```

## Open Issues / Risks
- [ ] GitHub repo URL not yet provided
- [ ] .gitignore policy strict re: Walmart/personal data (needs team review)
- [ ] CI pipeline (.github/workflows/ci.yml) on hold pending repo scan

## Evidence & Session Artifacts
*(Will be populated as phases complete)*
- Smoke report: `reports/week1/smoke-*.json`
- Verification log: `VERIFICATION_LOG.md`

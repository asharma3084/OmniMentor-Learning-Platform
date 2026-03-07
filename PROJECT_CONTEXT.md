# PROJECT_CONTEXT.md — OmniMentor Phase 1

**Last Updated**: 2026-03-07 (Week 1 handoff snapshot saved)

## Current Phase
**Phase 1 (Week 1)**: Repo scaffold, Flow A spine, evidence gating v1, benchmark scaffold, smoke/eval scripts.

## Current Summary (2026-03-07)
- ✅ Environment ready on macOS (git/node/pnpm/sqlite present)
- ✅ Phase 1 scaffold and core Flow A implementation are in place
- ✅ Full verification executed: lint, test, typecheck, smoke, eval
- ✅ Native runtime dependency (`better-sqlite3`) verified and loading
- ✅ Week 1 reports generated in `reports/week1` and `services/api/reports/week1`
- ✅ Week 1 check-in updated and synced in `personal/WEEK1_CHECKIN.md` and `personal/WEEK1_CHECKIN.docx`

## Next 3 Immediate Tasks
1. Resume with latest context and re-run final verification gates only if new code changes are made
2. Finalize Week 1 submission candidate file set (exclude `personal/` from commit review)
3. Commit and push only after explicit user approval

## Key Constraints
- **Academic-only repo**: NO company-internal data, NO personal info, NO secrets in commits
- **Stack**: TypeScript/Node + React (Vite) + sqlite
- **.gitignore rule**: Exclude `.env`, `*.db`, logs, raw reports, and company/personal data
- **Verification gates**: `pnpm lint`, `test`, `typecheck`, `smoke` must pass before "done"

## Files & Scripts to Create (Phase 1 Checklist)
- [x] `README.md` — run instructions + smoke/eval commands
- [x] `docs/architecture.md` — Mermaid diagram + layer explanation
- [x] `.env.example` — defaults/placeholders only
- [x] `.gitignore` — db, env, logs, reports, sensitive files
- [x] `.github/workflows/ci.yml` — lint/test/typecheck/build + `pnpm audit`
- [x] `VERIFICATION_LOG.md` — session tracking (append each time)
- [x] Repo structure (all directories created)
- [x] `package.json` (root monorepo + workspace)
- [x] Flow A implementation (1 scenario end-to-end)
- [x] Evidence gating v1 + scoring unit tests
- [x] Benchmark scaffold (1 scenario + gold labels)
- [x] `scripts/smoke.ts` — end-to-end verification
- [x] `scripts/eval_run.ts` — benchmark runner (scaffold Phase 1)

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
- [ ] Confirm final commit candidate set when user returns
- [ ] Keep `personal/WEEK1_CHECKIN.docx` synced if `personal/WEEK1_CHECKIN.md` changes again

## Evidence & Session Artifacts
*(Updated this session)*
- Smoke report: `reports/week1/smoke-2026-03-07T18-20-08-788Z.json`
- Smoke report: `reports/week1/smoke-2026-03-07T18-25-07-269Z.json`
- Eval report: `services/api/reports/week1/ablation-run-2026-03-07T18-20-11-583Z.json`
- Eval report: `services/api/reports/week1/ablation-run-2026-03-07T18-20-15-476Z.json`
- Eval report: `services/api/reports/week1/ablation-run-2026-03-07T18-25-10-331Z.json`
- Eval report: `services/api/reports/week1/ablation-run-2026-03-07T18-25-13-445Z.json`
- Eval summary CSV: `services/api/reports/week1/ablation-summary.csv`
- Verification log: `VERIFICATION_LOG.md`
- Weekly check-in (markdown): `personal/WEEK1_CHECKIN.md`
- Weekly check-in (docx): `personal/WEEK1_CHECKIN.docx`

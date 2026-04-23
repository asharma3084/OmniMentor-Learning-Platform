# Final Project — Pending Work Tracker

**Due:** May 4, 2026, 8:00 AM  
**Deliverables:** Final Project (10 pts) + Project Presentation (10 pts) + Project Paper (10 pts)  
**Policy:** No resubmission. No late work without advance agreement. All external links must be GT-accessible (verify in incognito).

---

## What's Already Strong

These areas are engineering-complete and tested:

- Full codebase: guided 4-step flow, 12 scenarios across 4 domains, structured scoring with gating
- AI coaching assistant: Ollama-powered context-aware chat with behavioral guardrails, step-specific prompts, streaming SSE, and markdown rendering
- Three IM2 visualization features (SVG graph, evaluation forensics, evidence provenance badges)
- Full E2E test coverage: 61 Playwright tests across 4 spec files
- Ablation validation: consistent scoring progression from vector through graphrag_gating
- Architecture documentation: system design, API contract, data model, requirements, decisions log (including ADR-005 for AI assistant)
- UI documentation: tab-based flow, feedback mockups, AI assistant chat panel mockup, scenario guide
- KPI framework defined across three research questions (RQ1/RQ2/RQ3)
- Synthetic corpus (Omni-Mart) — no real data, no PII, no security concerns

---

## Deliverable 1: Final Project (10 pts)

**Format:** `.zip` archive containing full codebase + `Catalog.pdf`

### Done

- [x] Full codebase with build system (pnpm monorepo, Vite, TypeScript)
- [x] Working application (API on port 9992, Web on port 9991)
- [x] Architecture documentation suite (7 docs in `docs/architecture/`)
- [x] User-facing documentation (overview, quickstart, user guide, scenario guide)
- [x] Research documentation (testing strategy, evaluation/KPIs, data/security)
- [x] Comprehensive E2E tests with Playwright covering all scenarios
- [x] 6 complete scenario domains with synthetic evidence sets
- [x] Ablation results in `reports/week2/`

### Pending

- [ ] **`Catalog.pdf`** — Archive contents description, reviewer quick-path, how to build/run/test
  - Should cover: project overview, directory structure, build commands, test commands, what to look at first
  - Target: 2–3 pages, practical rather than academic
- [ ] **Zip packaging** — Clean archive with only necessary files (exclude `personal/`, `node_modules/`, `.DS_Store`)
  - Verify archive extracts cleanly on a fresh machine
  - Include `pnpm-lock.yaml` so dependencies are reproducible
- [ ] **Link verification** — Open every external link in incognito; confirm GT accessibility
  - GitHub repo must be accessible
  - Any hosted demo link must work without VPN

---

## Deliverable 2: Project Presentation (10 pts)

**Format:** JDF PDF + Narrated video (~10 min)

### Done

- [x] Slide deck exists (`MASTER_OMNIMENTOR_DECK_FINAL.pptx`)
- [x] Talk track structure written
- [x] All demo-able features are functional and tested
- [x] Screenshots available for all surfaces

### Pending

The final presentation follows an academic-talk arc rather than a demo-first format.

- [ ] **Problem Statement slide** (~1 min) — Architecture Blindness framed as a learning science problem
  - New TPMs face cognitive overload when interpreting service maps for the first time
  - No safe practice environment exists for incident decision-making
- [ ] **Related Work slide(s)** (~2 min) — With proper academic citations
  - Cognitive load theory (Sweller; Paas & van Merriënboer)
  - Situated cognition / legitimate peripheral participation (Lave & Wenger)
  - Intelligent tutoring systems and non-judgmental AI tutoring
  - Incident management training in industry
  - Must explain how OmniMentor relates to each area of prior work
- [ ] **Gap slide** (~30 sec) — What existing solutions don't address
  - Existing ITS lack domain-specific incident context
  - Industry training lacks structured, scaffolded practice with feedback
- [ ] **Solution / System Design slide(s)** (~1 min) — OmniMentor's approach to filling the gap
  - Guided 4-step flow, graph-augmented retrieval, structured scoring with gating
- [ ] **Live demo segment** (~3–4 min) — Walk through 1–2 scenarios in the actual application
  - Guided flow: Brief → Investigate → Decide → Feedback
  - Show AI Assistant coaching chat in action (ask a question, show guardrail behavior)
  - Show connected learning summary, TPM next-actions, evidence gate
  - Show System Graph and Evaluation Forensics for IM2 features
- [ ] **Results slide** (~1 min) — Ablation numbers, test coverage, KPI framework
  - vector → graph → graphrag → graphrag_gating progression
  - Full E2E coverage, all scenarios, complete ablation sweep
- [ ] **Conclusion + Future Work slide** (~1 min) — Formal academic closing
  - Key contributions: guided scaffolding, graph-augmented retrieval, AI coaching assistant, connected learning feedback
  - Future: expanded scenario domains, real user studies, anxiety measurement, multi-role support
- [ ] **References slide** — Proper citations for all related work mentioned
- [ ] **Narrated video** — Record with revised talk track, ~10 minutes total
  - Use QuickTime or OBS for screen recording with voiceover
  - Export as MP4, verify file plays correctly
- [ ] **GT-accessible hosting** — Upload to GT-approved platform (Canvas, GT MediaSpace, or similar)
- [ ] **JDF PDF** — Export presentation document in JDF format, embed video link

---

## Deliverable 3: Project Paper (10 pts)

**Format:** JDF PDF, 10–12 pages (references don't count toward limit)

### Done (content exists, needs academic writing)

- [x] Research questions defined: RQ1 (orientation time), RQ2 (anxiety reduction), RQ3 (participation transition)
- [x] Methodology established: Design-Based Research + Contract-First TDD
- [x] System design documented across architecture docs
- [x] Ablation results collected and validated
- [x] KPI framework: 9 metrics mapped to 3 research questions
- [x] Evaluation dimensions: 5 rubric criteria with gating logic

### Pending (writing required)

- [ ] **Related Work** (⭐ PRIORITY) — Literature review covering:
  - Cognitive load theory (Sweller, 1988; Paas & van Merriënboer, 1994)
  - Situated cognition and legitimate peripheral participation (Lave & Wenger, 1991)
  - Design-Based Research methodology (Barab & Squire, 2004; The Design-Based Research Collective, 2003)
  - Non-judgmental AI tutoring and intelligent tutoring systems (VanLehn, 2011)
  - Incident management training in industry
  - Must clearly explain how OmniMentor positions against each area and what gap it fills
  - Write this section first — it feeds both the paper and the presentation
- [ ] **Abstract** — ~250 words, problem → approach → results → contribution
- [ ] **Introduction** — Architecture Blindness problem, OmniMentor as non-judgmental practice environment, contribution statement
- [ ] **Problem Statement** — Formal RQ1, RQ2, RQ3 with operational definitions
- [ ] **Methodology** — DBR iteration cycles, contract-first TDD, synthetic corpus design decisions
- [ ] **System Design** — Condense architecture docs into paper-appropriate format (component diagram, data flow, scoring pipeline)
- [ ] **Evaluation** — Ablation study design, KPI framework, session tracking instrumentation
- [ ] **Results and Discussion** — Ablation findings, what the numbers mean for learning design, comparison against baseline
- [ ] **Limitations** — Synthetic-only data, no live user study yet, single-domain evaluation
- [ ] **References** — Formatted to JDF spec

### Writing Strategy

Revised priority order:
1. Start with **Related Work** — writing it first feeds both the paper and the presentation
2. Write **Methodology** and **System Design** — closest to work already done
3. Write **Evaluation** and **Results** — ablation data is already collected
4. Write **Introduction** and **Abstract** last — easier once the body exists
5. **Limitations** can be written at any point

---

## Remaining Weekly Status Checks

| Check | Due | Points | Notes |
|-------|-----|--------|-------|
| WSC 7 | April 20 | Completion grade | Related work + paper planning underway |
| WSC 8 | April 27 | Completion grade | AI assistant integrated; paper writing and presentation restructuring underway |

Status checks are completion grades — honest, concise updates. 1–2 sentences per question. Q4 (team) is N/A for individual projects.

---

## Risk Areas

| Risk | Mitigation |
|------|------------|
| Related work / citations take longer than expected | Start immediately — it feeds both paper and presentation |
| Paper takes longer than expected | Start with sections closest to existing docs; don't write linearly |
| Presentation restructuring scope | Follow the academic-talk arc; don't over-design slides |
| Video recording quality | Practice with revised talk track first; re-record individual segments if needed |
| Link accessibility | Test in incognito on a different device before submission |
| Zip archive issues | Test extraction on a clean directory; verify build works from scratch |
| Scope creep on new features | Feature-freeze after IM2; remaining time is for writing and packaging |

---

## Cross-References

- [IM1 Summary](intermediate-milestone-1.md) — What was delivered at Milestone 1
- [IM2 Summary](intermediate-milestone-2.md) — What was delivered at Milestone 2
- [Requirements](../architecture/requirements.md) — Research questions and functional requirements
- [Evaluation and KPIs](../research/evaluation-and-kpis.md) — KPI framework details
- [Testing Strategy](../research/testing-strategy.md) — Test coverage and methodology
- [Project Overview](../start-here/overview.md) — Vision and current state

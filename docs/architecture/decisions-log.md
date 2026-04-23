# Decisions Log


Use this file to record key technical and process decisions.
For new decisions, prefer creating ADR files in `decisions/`.

## Entry Template

- Date:
- Status: Proposed | Accepted | Superseded
- Context:
- Decision:
- Consequences:

## Initial Decisions

- Monorepo with pnpm workspaces for web/api/core/retrieval consistency.
- Evidence-first gating and rubric scoring as core evaluation model.
- Synthetic-only data policy for learning and verification artifacts.

---

## ADR-001: SQLite as Phase 1 Runtime Database

- **Date:** 2026-03-07
- **Status:** Accepted
- **Context:** The full stack targets Qdrant (vector) + Neo4j (graph) as the retrieval data layer. A lightweight local database is needed to run the end-to-end scoring and reporting pipeline in Phase 1.
- **Decision:** Use SQLite for Phase 1 runtime. Requires no infrastructure, satisfies the single-user local target, and keeps all scoring logic fully testable.
- **Consequences:** Query interfaces are kept abstract so the data layer can be extended in Phase 2 without changing business logic. Additionally, SQLite enables comprehensive unit testing of the entire scoring pipeline independent of external infrastructure, aligning with DBR requirements for transparent, reproducible evaluation logic.

---

## ADR-002: Synthetic-Only Omni-Mart Corpus

- **Date:** 2026-03-07
- **Status:** Accepted
- **Context:** Research requires realistic operational scenarios for evaluation. Using real enterprise data would violate data policy and prevent open-source distribution.
- **Decision:** Build a fully synthetic corpus representing a fictional enterprise (Omni-Mart — a fictional organization, not any real company). All ownership records, dependency maps, runbook content, and incident notes are generated for research purposes only.
- **Consequences:** No data-access restrictions. Repository can be shared publicly. Corpus can be extended without approval workflows.

---

## ADR-003: Design-Based Research + Contract-First TDD as Development Methodology

- **Date:** 2026-03-09
- **Status:** Accepted
- **Context:** The project requires both research rigor (CS6460 educational technology) and engineering discipline. A methodology that bridges both is needed for reproducibility, traceability, and academic defensibility.
- **Decision:** Adopt Design-Based Research (Barab & Squire, 2004; Wang & Hannafin, 2005) as the research methodology, with Contract-First TDD (Beck, 2002) as the engineering discipline within each DBR cycle. Each iteration follows: analyze learning gap → design scenarios/rubrics → implement via red-green-refactor from API contracts → evaluate via ablation study → reflect and refine.
- **Consequences:** Stronger academic narrative for write-ups. Tests document intent before implementation. Ablation results provide quantitative evidence across DBR cycles. Slightly more upfront time per feature, offset by fewer integration surprises and clearer research traceability.

---

## ADR-004: Learning Session Tracking And Pre/Post Survey Instrumentation

- **Date:** 2026-03-09
- **Status:** Accepted
- **Context:** The KPI gap analysis revealed that RQ1 (orientation time), RQ2 (anxiety reduction), and RQ3 (participation transition) had no quantitative instrumentation built into the system. Without session timing, surveys, and behavioral proxy data, there is no way to evaluate whether the tool achieves its research objectives.
- **Decision:** Add three instrumentation layers: (1) Learning session tracking with per-scenario timing (start, first_evidence, first_submit, completed, duration_sec, attempt_number) stored in a `learning_sessions` table; (2) Pre/post 5-item Likert survey (`survey_responses` table) administered before the first scenario and after all scenarios are completed; (3) Behavioral proxy logging (hesitation time, first evidence selection) as part of the session event stream.
- **Consequences:** 9 KPIs can now be measured quantitatively. RQ1 has time-to-competent-submission and duration-per-attempt data. RQ2 has matched pre/post survey delta data. RQ3 has hesitation time and attempt count data. Six new API endpoints added. Two new database tables added. Survey is anonymous and contains no PII. See `../research/evaluation-and-kpis.md` for full KPI framework.

---

## ADR-005: Ollama-Powered AI Coaching Assistant

- **Date:** 2026-04-22
- **Status:** Accepted
- **Context:** RQ2 calls for a non-judgmental automated assistant that reduces self-reported anxiety. The proposal listed Ollama as a target-stack component. Implementing a context-aware coaching chat directly addresses the "non-judgmental relational tutor" vision described in the project overview — not as a future goal, but as a working feature.
- **Decision:** Integrate Ollama (llama3.2, 3B parameters) as a local LLM powering a streaming AI Assistant accessible from every step of the guided flow. The assistant is stateless (no server-side conversation history), builds a structured system prompt per request from scenario context in SQLite, and streams responses via SSE. Eight behavioral guardrails are enforced in the system prompt: scope restriction, off-topic rejection, no hallucination, no gold-answer leakage, evidence redirect, platform help only on explicit request, conciseness (2-3 sentences max), and evidence reference limits. Few-shot examples anchor the model's behavior for common input patterns.
- **Consequences:** Ollama moves from "target" to "active" in the tech stack. The assistant addresses RQ2 directly by providing always-available, private, non-judgmental coaching. No data leaves the local machine. Ollama is a soft dependency — the rest of the platform works without it; only the chat feature is unavailable. Guardrail tuning requires iterative testing because the 3B model can be unpredictable with novel inputs. The `POST /assist` endpoint and `AiAssistant.tsx` component are the primary surfaces. Markdown rendering uses `marked` + `DOMPurify` for safe HTML output.


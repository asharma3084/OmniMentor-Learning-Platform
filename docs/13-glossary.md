# 13. Glossary

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


## Core Concepts

**Architecture Blindness**
The inability of a new engineer or program manager to navigate a complex enterprise system — overwhelmed by the technical trees, unable to see the functional forest. It operates across three dimensions: cognitive load (too many systems, no mental model), emotional anxiety (fear of asking "obvious" questions), and social isolation (peripheral participation without knowing enough to contribute). OmniMentor is designed specifically to address Architecture Blindness.

**Omni-Mart**
The fictional enterprise used as the evaluation and scenario context for OmniMentor. Omni-Mart represents a mid-to-large retail and e-commerce organization with complex system ownership, dependency structures, and operational runbooks. All corpus content is fully synthetic — Omni-Mart is not a real organization and does not represent any real company.

**Nancy (Learner Persona)**
The canonical primary persona. Nancy is a new Technical Program Manager at Omni-Mart — technically capable, genuinely motivated, but unable to independently navigate the ownership graph. She needs to sit in a meeting, explain key dependencies, and predict how a change might ripple through the system. OmniMentor's success condition: Nancy can do this, reliably and without asking a senior engineer, after practicing with the platform.

**Institutional Memory**
The accumulated operational knowledge of an organization — who owns what, how systems connect, what happened in past incidents, why certain decisions were made. Currently stored in the heads of a few senior engineers. OmniMentor's mission: transform institutional memory from a human bottleneck into a shared asset that grows with every new hire's inquiry.

**Tribal Knowledge**
A subset of institutional memory: tacit knowledge that is informally held, rarely written down, and transmitted only through direct human interaction. A primary source of Architecture Blindness and a direct target of OmniMentor's design.

**Information Scent**
The degree to which visible metadata about an evidence artifact (title, type, description) accurately predicts whether the artifact contains the answer to a learner's question. High information scent reduces cognitive load; low information scent causes learners to open and discard many artifacts without finding what they need. Measured in evaluation as evidence relevance score.

---

## Technical Terms

**Evidence gating**
Validation step that checks whether a claim in a learner submission is supported by at least one opened evidence artifact. Unsupported claims are flagged explicitly, not silently dropped.

**Rubric scoring**
Structured scoring model evaluating submission quality across five dimensions: owner-routing accuracy, dependency-trace accuracy, blast-radius completeness, evidence relevance score, and unsupported-claim rate.

**Blast radius**
Estimated scope of impact caused by a change or failure — which downstream systems will be affected, in what order, under what conditions.

**Dependency trace**
Mapped relationship path between systems or components that are affected upstream and downstream from a change. Direction matters: upstream → downstream is evaluated separately from downstream → upstream.

**Flow A**
Primary end-to-end learning workflow: select scenario → inspect evidence → submit analysis → receive rubric feedback. This is the core learning loop implemented in Phase 1.

**Ablation run**
Comparative evaluation across retrieval modes. An ablation run processes all benchmark scenarios under each mode (`vector`, `graph`, `graphrag`, `graphrag_gating`) and reports metrics per mode side-by-side.

**GraphRAG**
Graph-Retrieval-Augmented Generation. A retrieval pattern that traverses a knowledge graph (ownership → dependency → policy edges) to assemble a structured context before sending it to an LLM. Produces more grounded, traceable responses than pure embedding-based retrieval.

**Qdrant**
Vector database used for semantic similarity retrieval. Stores dense embeddings of corpus documents; supports top-k search by cosine similarity. Integrated in Week 3.

**Neo4j**
Graph database used to store the Omni-Mart ownership and dependency graph. Supports multi-hop traversal via Cypher and APOC procedures. Integrated in Week 4.

**Ollama**
Local LLM runtime. Runs open-weight models (e.g., Llama 3, Mistral) entirely on-device, with no external API calls. Preserves data privacy; no corpus content leaves the machine.

**Knowledge graph**
A structured representation of entities (systems, services, teams, owners) and their relationships (depends-on, owns, escalates-to, documented-in). The OmniMentor knowledge graph encodes Omni-Mart's system topology as a traversable graph.

**Smoke test**
End-to-end runtime validation of the critical path. Confirms that the API is healthy, scenarios are reachable, and the scoring pipeline returns a non-error response.

**Learning Session**
A tracked time-bounded interaction where a learner works on a single scenario. Captures start time, first evidence selection, first submission, and completion — providing duration and hesitation-time data for RQ1 evaluation.

**Survey Response**
A structured 5-item Likert-scale self-report submitted before (pre) and after (post) the scenario run. Measures self-reported confidence, comfort, clarity, readiness, and anxiety to support RQ2 evaluation.

**Behavioral Proxy**
An automatically logged user action used as an indirect measure of learning engagement or hesitation. In OmniMentor, the primary behavioral proxy is the time between session start and first evidence selection (hesitation time).

**Hesitation Time**
The duration (in seconds) between session start and first evidence selection. Used as a behavioral proxy for learner uncertainty — shorter hesitation time after practice suggests increased confidence and reduced Architecture Blindness.

**Likert Scale**
A psychometric scale commonly used in survey research, where respondents rate agreement on a symmetric agree/disagree scale (e.g., 1 = Strongly Disagree to 5 = Strongly Agree). Used in OmniMentor pre/post surveys.

**KPI (Key Performance Indicator)**
A quantifiable measure used to evaluate success against research objectives. OmniMentor defines 9 KPIs across 3 research questions; see `docs/16-evaluation-and-kpis.md`.

**Time-to-Competent-Submission**
The duration from session start to the first submission that passes evidence gating. Used as a primary metric for RQ1 (orientation time reduction).

**Pre/Post Survey**
A matched pair of identical 5-item Likert surveys administered before the first scenario (pre) and after all scenarios are completed (post). The delta between pre and post scores measures self-reported change in architecture confidence and anxiety (RQ2).

**Synthetic-only**
Data policy: all repository datasets are generated for research purposes. No personal, internal, proprietary, or company-confidential data is used in any artifact.


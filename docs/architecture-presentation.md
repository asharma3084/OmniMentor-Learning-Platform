# OmniMentor Architecture (Presentation Version)

Version: 1.0
Audience: class presentation, live demo, quick technical review

## 1. One-Slide Summary

OmniMentor is a proposal-aligned learning system where users solve scenarios, cite evidence, submit structured reasoning, and receive transparent rubric feedback.

Core value:
- Evidence-first decision making
- Measurable rubric scoring
- Reproducible evaluation artifacts

## 2. System Map

```mermaid
flowchart LR
  U["User"] --> W["Web App\nReact + Vite"]
  W -->|REST| A["API\nNode + Express"]
  A --> C["Core\nGating + Scoring"]
  A --> R["Retrieval\nMode Abstraction"]
  A --> DB[("SQLite")]
  C --> DB
  C --> REP["Reports\nJSON + CSV"]

  classDef c1 fill:#E3F2FD,stroke:#1565C0,color:#0D47A1;
  classDef c2 fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20;
  classDef c3 fill:#F3E5F5,stroke:#6A1B9A,color:#4A148C;
  classDef c4 fill:#FFF3E0,stroke:#EF6C00,color:#4E342E;

  class U,W c1;
  class A c2;
  class C,R c3;
  class DB,REP c4;
```

## 3. Flow A (Demo Narrative)

```mermaid
sequenceDiagram
  participant User
  participant Web
  participant API
  participant Core
  participant DB

  User->>Web: Open scenario
  Web->>API: GET /scenarios/:id
  API->>DB: Load scenario + evidence
  DB-->>API: Data
  API-->>Web: Scenario payload

  User->>Web: Submit response
  Web->>API: POST /submissions
  API->>DB: Save submission

  Web->>API: POST /score
  API->>Core: Run gating + scoring
  Core-->>API: Metrics + rubric
  API->>DB: Save score report
  API-->>Web: Feedback
```

## 4. Evaluation Modes (Ablation)

- `vector`
- `graph`
- `graphrag`
- `graphrag_gating`

Each run outputs:
- JSON report (`ablation-run-*.json`)
- CSV summary row (`ablation-summary.csv`)

## 5. Live Demo Script (60-90 seconds)

1. Show API root and health:
   - `GET /`
   - `GET /health`
2. Open scenario in web app and explain evidence panel.
3. Submit structured response.
4. Show scoring feedback and gating outcome.
5. Show generated smoke/eval artifacts.

## 6. Quality Proof Slide

Run these commands:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm smoke
pnpm eval
pnpm audit
```

What this proves:
- code quality
- test correctness
- runtime success
- reproducible evaluation
- dependency hygiene

## 7. Proposal Alignment Statement

This implementation follows proposal scope as baseline.
If any scope deviation occurs, it is:
1. logged in local session notes
2. evidenced in generated report artifacts
3. disclosed in the weekly status check

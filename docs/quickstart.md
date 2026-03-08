# Quickstart

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


This guide gets OmniMentor running locally with a verified end-to-end pass.

## Prerequisites

- Git
- Node.js 20+
- pnpm --dir workspace - sqlite3

macOS setup:

```bash
brew update
brew install git node pnpm --dir workspace sqlite
```

## Install

```bash
git clone https://github.com/asharma3084/OmniMentor-Learning-Solution.git
cd OmniMentor-Learning-Solution
pnpm --dir workspace install
cp config/.env.example .env
```

## Run

Start API:

```bash
pnpm --dir workspace --filter @omnimentor/api dev
```

Start Web (new terminal):

```bash
pnpm --dir workspace --filter @omnimentor/web dev
```

## Verify API

```bash
curl -s http://localhost:3001/
curl -s http://localhost:3001/health
```

Expected:
- `GET /` returns JSON with service metadata.
- `GET /health` returns `status: ok`.

## Run Week 1 Validation

With API running:

```bash
pnpm --dir workspace smoke
pnpm --dir workspace eval
```

Optional full gate run:

```bash
pnpm --dir workspace lint
pnpm --dir workspace test
pnpm --dir workspace typecheck
pnpm --dir workspace build
pnpm --dir workspace audit
```

## Common Gotcha

If `pnpm --dir workspace smoke` fails with `fetch failed`, the API is not running.
Start API first, then rerun smoke/eval.

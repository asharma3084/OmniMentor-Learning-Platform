# Quickstart

This guide gets OmniMentor running locally with a verified end-to-end pass.

## Prerequisites

- Git
- Node.js 20+
- pnpm
- sqlite3

macOS setup:

```bash
brew update
brew install git node pnpm sqlite
```

## Install

```bash
git clone https://github.com/asharma3084/OmniMentor-Learning-Solution.git
cd OmniMentor-Learning-Solution
pnpm install
cp .env.example .env
```

## Run

Start API:

```bash
pnpm --filter @omnimentor/api dev
```

Start Web (new terminal):

```bash
pnpm --filter @omnimentor/web dev
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
pnpm smoke
pnpm eval
```

Optional full gate run:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm audit
```

## Common Gotcha

If `pnpm smoke` fails with `fetch failed`, the API is not running.
Start API first, then rerun smoke/eval.

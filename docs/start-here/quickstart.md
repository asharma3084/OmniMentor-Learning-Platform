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
git clone https://github.com/asharma3084/OmniMentor-Learning-Platform.git
cd OmniMentor-Learning-Platform
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
curl -s http://localhost:9992/
curl -s http://localhost:9992/health
curl -s http://localhost:9992/surveys/status
```

Expected:
- `GET /` returns JSON with service metadata.
- `GET /health` returns `status: ok`.
- `GET /surveys/status` returns `{"preCompleted": false, "postCompleted": false}`.

## Run Validation

With API running:

```bash
pnpm --dir workspace smoke
pnpm --dir workspace eval
pnpm --dir workspace test:e2e
```

`pnpm --dir workspace test:e2e` starts an isolated API (`10092`) and web app (`10091`) automatically, runs the guided GUI automation suite, and cleans up both processes.

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

If `pnpm --dir workspace test:e2e` fails, inspect the Playwright output first. The command already manages its own isolated services and should not depend on the default API process on `9992`.

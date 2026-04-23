# Quickstart


This guide gets OmniMentor running locally with a verified end-to-end pass.

## Prerequisites

- Git
- Node.js 20+
- pnpm
- sqlite3
- Ollama (for AI Assistant)

macOS setup:

```bash
brew update
brew install git node pnpm sqlite
brew install ollama
```

## Install Ollama Model

```bash
ollama serve &       # start the Ollama daemon (runs on port 11434)
ollama pull llama3.2  # download the model (~2 GB)
```

Verify Ollama is running:

```bash
curl -s http://localhost:11434/api/tags | head -1
```

The AI Assistant will work when Ollama is running. If Ollama is not running, the rest of the platform still functions normally — only the chat coaching feature is unavailable.

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

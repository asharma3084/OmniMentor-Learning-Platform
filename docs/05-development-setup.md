# 05. Development Setup

## Prerequisites

- Git
- Node.js 20+
- pnpm
- sqlite3

macOS install:

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

## Run Services

```bash
pnpm --filter @omnimentor/api dev
pnpm --filter @omnimentor/web dev
```

## Health Check

```bash
curl -s http://localhost:3001/
curl -s http://localhost:3001/health
```

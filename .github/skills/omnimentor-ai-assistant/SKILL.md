---
name: omnimentor-ai-assistant
description: "Domain knowledge and guardrail tuning for OmniMentor's Ollama-powered AI Assistant. Use when: modifying the /assist endpoint system prompt, tuning chat guardrails, adjusting step-specific coaching behavior, adding new guided-flow steps, or debugging assistant response quality. Covers: platform context, step skills, evidence artifacts, off-topic handling, conciseness rules."
metadata:
  author: omnimentor
sample-prompts:
  - 'fix the AI assistant responses'
  - 'tune AI assistant guardrails'
  - 'add a new step to the AI assistant'
  - 'improve AI assistant coaching quality'
---

# OmniMentor AI Assistant Skill

## Architecture

```
[Browser: AiAssistant.tsx] --POST /assist--> [API: index.ts] --/api/generate--> [Ollama llama3.2]
                           <---SSE tokens---                  <---NDJSON stream--
```

- **Frontend**: `apps/web/src/AiAssistant.tsx` — floating chat panel, SSE streaming, markdown rendering via `marked` + `DOMPurify`
- **Backend**: `services/api/src/index.ts` — `POST /assist` endpoint, `buildAssistantPrompt()` function
- **LLM**: Ollama with `llama3.2` (3B params, 2GB) on `http://127.0.0.1:11434`

## System Prompt Structure

The `buildAssistantPrompt()` function builds context in sections:

1. **Identity** — who the assistant is (supportive learning coach)
2. **Platform Context** — 12 scenarios, 4 domains, 4-step guided flow
3. **Current Scenario** — title, domain, description, artifact list
4. **Current Step** — step-specific skills (what UI shows, what learner can do)
5. **Rules** — guardrails (scope, off-topic, no hallucination, no answers, conciseness)

## Step Skills Reference

Each step has a skill block describing what the learner sees and can do.

### Brief
- Sees: scenario description, 4 mission deliverable cards, scenario stakes
- Can do: read scenario, understand stakes, click "Start With Evidence"
- Coach goal: orient the learner, explain what to look for

### Investigate
- Sees: evidence artifact cards (clickable), Primary/Corroborating role badges
- Can do: click cards to select, assign Primary + Corroborating roles, "Build My Starter Draft"
- Coach goal: help evaluate evidence relevance, point to specific artifacts

### Decide
- Sees: 5 text fields (Owner Routing, Dependency Trace, Action Plan, Blast-Radius Plan, Evidence Notes), Submit & Score, Show Good Answer
- Can do: write answers, use Fill Template, view example answer, submit for scoring
- Coach goal: guide structured, evidence-backed writing without revealing gold answers

### Feedback
- Sees: score ring, rubric breakdown, sub-tabs (Score & Coaching, System Graph, Evidence Explorer, Check-in Export)
- Can do: review scores, explore dependency graph, export check-in summary, switch scenarios
- Coach goal: interpret scores, suggest improvements, encourage next scenario

## Guardrail Rules

1. **Scope**: Only scenario, platform, evidence, incident response, TPM skills
2. **Off-topic**: Short one-sentence friendly nudge — never dump actions/artifacts
3. **No hallucination**: Only facts from provided context — ask to rephrase if unclear
4. **No gold answers**: Never reveal owner, dependency path, blast radius, or safe actions
5. **Platform help**: Detailed step guidance ONLY on explicit "help"/"what can I do" requests
6. **Conciseness**: 2-3 sentences max, name 1-2 artifacts at most
7. **Redirect**: On direct answer requests, suggest which evidence to examine

## Tuning Guidelines

### When responses are too verbose
- Check rule 7 (CONCISE) wording — model may ignore soft limits
- Reduce `num_predict` in Ollama options (currently 256)
- Add explicit negative examples to the rules section

### When off-topic handling is wrong
- Off-topic = personal questions, trivia, jokes, names, coding, gibberish
- Response should be ONE short sentence with a gentle nudge back to the scenario
- Never list all artifacts or all actions — that's for explicit help requests only

### When on-topic answers are too shallow
- Check if `scenario.prompt` and `artifactList` are populated
- Consider increasing `num_predict` for complex questions
- Ensure step-specific skill block is detailed enough

### When the model reveals gold answers
- Strengthen rule 4 wording — add emphatic phrasing
- Add explicit examples of what NOT to say
- Consider reducing `temperature` (currently 0.7)

## Environment Variables

| Var | Default | Purpose |
|-----|---------|---------|
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3.2` | Model to use for chat |

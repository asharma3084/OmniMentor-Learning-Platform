# User Guide

This guide is for TPMs who want to use OmniMentor without reading the rest of the project documentation first.

If you are opening OmniMentor for the first time, start here.

## What OmniMentor Helps You Practice

OmniMentor helps you practice how to:

- identify the right owner or team
- trace upstream and downstream system dependencies
- estimate blast radius
- support your decision with evidence
- write a safer action plan instead of making unsupported guesses

This is not a passive reading tool. It is a practice environment designed for TPMs onboarding onto new teams inside large-scale distributed systems.

## The Main Flow

The app uses four tabs visible at the top of the screen:

1. `1. Brief` — read the incident scenario and understand your mission
2. `2. Investigate` — review evidence artifacts and select the ones that matter
3. `3. Decide` — write your structured answer backed by the evidence you found
4. `4. Feedback` — see your score, understand what you learned, and plan next actions

Under Feedback, four sub-tabs give you deeper review tools:
- `Score & Coaching` — rubric score, metric breakdown, connected learning summary, TPM next-actions
- `System Graph` — interactive dependency map showing how services connect
- `Evidence Explorer` — full list of artifacts you selected and what each one supports
- `Check-in Export` — structured summary for your weekly mentor check-in

## Before You Start

When you first open the app:

1. Complete the pre-survey if it appears.
2. Read the walkthrough if it opens (click "How It Works").
3. Pick one scenario and finish it fully before jumping to another one.
4. Use the `?` help icon in the header if you need guidance at any point.
5. Use the **AI Assistant** (floating chat bubble in the bottom-right corner) anytime you have a question about the scenario, the evidence, or your next step.

## The AI Assistant

A floating chat button appears in the bottom-right corner of every step. Click it to open a coaching chat powered by a local LLM (Ollama).

What to use it for:
- Ask about the current scenario: "help me understand the scenario", "what should I focus on?"
- Get step-specific guidance: "what should I look for in the evidence?", "how do I structure my dependency trace?"
- Check your thinking: "is my response complete?", "why is this evidence relevant?"

What it will not do:
- It will not give you the correct answer (owner, dependencies, blast radius). That is what you are here to figure out.
- It will not help with coding, trivia, or anything outside the scenario.
- It will not make up information — if it does not know, it says so.

Quick prompts appear below the chat input as shortcut buttons that change based on your current step (Brief, Investigate, Decide, Feedback).

You can save the chat to a text file or clear it at any time using the icons in the chat header.

## Quick Rule

Do not try to be fast on your first run.

Try to be clear, evidence-based, and complete.

## Step-By-Step Walkthrough

### Step 1: Brief

In `Brief`, read the scenario carefully.

Focus on:

- the problem you are being asked to solve
- the decision you need to make
- any constraints or risks mentioned in the prompt
- what a good answer should include

Do not jump straight to a solution yet.

Your job in this step is to understand the situation clearly enough to investigate it.

### Step 2: Investigate

In `Investigate`, review the evidence artifacts.

Your goal is to find:

- one `primary` artifact that directly supports your decision
- one `corroborating` artifact that strengthens or confirms it

This matters because the app is designed to train evidence-backed TPM reasoning, not intuition-only answers.

While investigating:

- read artifact titles and content carefully
- compare evidence instead of stopping at the first plausible answer
- note the systems, teams, and dependencies that keep appearing
- use `Show Me A Good Answer` only if you are stuck or want to study what a strong answer looks like

Use the key facts panel on the right to see what the app has extracted from the evidence so far.

### Step 3: Decide

In `Decide`, complete the structured answer.

You will usually fill in these parts:

- `Who Should Own This?`
- `What Should Happen Next?`
- `Which Systems Are Connected?`
- `What Could Break?`
- `Why Do You Believe This?`

What good answers usually look like:

- owner routing is specific, not vague
- dependency trace names real systems and direction of impact
- action plan is safe and sequenced
- blast radius is broader than just the first broken service
- evidence notes cite what you actually saw in the artifacts

What weak answers usually look like:

- guessing the owner without evidence
- listing systems without showing how they connect
- proposing risky action without validation
- giving a shallow blast radius
- writing generic evidence notes like "based on the docs"

### Step 4: Feedback

After you submit, the Feedback tab shows several layers of insight:

**Score & Coaching** — pay attention to:
- overall score and whether Evidence Gate passed
- per-metric breakdown (Owner Match, System Connections, Blast Radius, Evidence Support)
- **The Challenge** — what this scenario tested and why it matters
- **Evidence You Used** — the artifacts you selected, with role badges and body preview
- **Your Decision Chain** — for each rubric dimension, shows which evidence you read, what you decided, and the score
- **What This Taught You** — the specific architectural insight and TPM skill you just practiced
- **What a TPM Does Next** — 5 real-world actions (notify teams, coordinate, staged rollout, post-incident review)
- **Your Next Step** — jump to the next uncompleted scenario or generate a mentor check-in

**System Graph** — explore the live dependency map to verify the paths you traced.

**Evidence Explorer** — review every artifact and check which claims each supports.

**Check-in Export** — generate a structured summary for your weekly mentor check-in.

Do not treat the score as the only result. The real value is understanding the full chain: scenario → evidence → your decision → what it means for real-world TPM work.

## How Different TPM Levels Should Use OmniMentor

### New TPM

If you are new to the team, domain, or product area:

- follow the four tabs in order: Brief → Investigate → Decide → Feedback
- use the walkthrough (click "How It Works")
- use the example answer when you are blocked
- do not worry about being fast; focus on being evidence-based
- finish one full scenario before trying to optimize your workflow
- after scoring, read the full learning summary — especially "What a TPM Does Next"

Best habit for new TPMs:

Ask, "What evidence proves this?" before you ask, "What do I think is happening?"

Tip: use the AI Assistant freely during Brief and Investigate. Ask it to explain the stakes or highlight what to look for. It coaches without giving away answers.

### Intermediate TPM

If you already understand TPM basics but are still learning the domain:

- try to solve the scenario without the example answer first
- after scoring, study the Decision Chain to see which rubric dimensions need work
- use the System Graph to validate your dependency reasoning
- compare your submission to the feedback and look for recurring mistakes
- pay special attention to dependency direction and blast radius quality

Best habit for intermediate TPMs:

Use the app to refine judgment, not just to get a higher score.

### Advanced TPM

If you are experienced and want deeper practice:

- move quickly through Brief and Investigate if the scenario is clear
- challenge your own assumptions before submitting
- after scoring, focus on the "What This Taught You" section for architectural insights
- use the System Graph to find dependency paths you missed
- treat the Connected Learning Summary as a discipline check: can you defend every claim?

Best habit for advanced TPMs:

Treat the tool as a discipline check: can you defend the decision clearly, safely, and with evidence?

## When To Use The Feedback Sub-Tabs

Use the Feedback sub-tabs when:

- **Score & Coaching**: you want to understand why your score is what it is and what next actions a TPM would take
- **System Graph**: you want to visually verify the dependency paths in your answer
- **Evidence Explorer**: you want to review which artifacts backed which claims
- **Check-in Export**: you have completed scenarios and need to generate your mentor summary

## A Good First Session

For your first real session in OmniMentor:

1. Open the app and complete the pre-survey if shown.
2. Pick one scenario only.
3. Read the Brief carefully — understand the mission and deliverables.
4. In Investigate, select one primary and one corroborating artifact.
5. In Decide, write a complete answer in all required fields.
6. Submit and study the full Feedback — score, learning summary, and TPM next-actions.
7. If your answer was weak, review the example answer and try again.

Throughout the session, use the AI Assistant chat bubble in the bottom-right corner whenever you want coaching on what to focus on, what evidence means, or how to structure your response.
8. When ready, click the next-scenario button to continue practicing.

That is enough for a strong first run.

## If You Get Stuck

If you are not sure what to do next:

1. Go back to `Brief` and restate the decision in one sentence.
2. Re-open the evidence and look for the artifact most directly tied to ownership or dependency direction.
3. Make sure you selected one `primary` and one `corroborating` artifact.
4. Use `Show Me A Good Answer` to learn the structure of a strong response.
5. Try again with a simpler, safer answer instead of a longer one.

## Common Mistakes

- jumping to an answer before reading the evidence
- selecting evidence that sounds relevant but does not directly support the decision
- naming teams or systems without showing the dependency path
- proposing action without explaining safety or order
- ignoring blast radius outside the most obvious component
- using the example answer as a shortcut instead of as a learning tool

## What Success Looks Like

You are using OmniMentor well if you are getting better at:

- making defensible ownership calls
- tracing dependencies more accurately
- identifying wider downstream impact
- citing better evidence
- avoiding unsupported claims
- explaining your decision more clearly after feedback

## Short Version

If you remember only five things, remember these:

1. Follow the four tabs: Brief → Investigate → Decide → Feedback.
2. Always choose one primary and one corroborating artifact.
3. Use feedback to understand the full learning chain, not just the score number.
4. Read "What a TPM Does Next" to connect practice to real-world action.
5. Use the Feedback sub-tabs (System Graph, Evidence Explorer, Check-in Export) to deepen your understanding.
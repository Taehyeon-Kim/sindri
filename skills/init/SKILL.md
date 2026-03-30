---
name: init
description: Set up an autonomous improvement loop — explore project, design evaluate function, scaffold .sindri/
---

# /sindri:init

Set up an autonomous improvement loop in the current project.
The most critical output is a well-designed evaluate function.

Communicate with the user in their language. Detect from their messages or system locale.

## Phase 1: Explore

Understand the project before asking anything.
Use Bash, Glob, Grep, Read — not AskUserQuestion.

Build a mental model of:
- Language, framework, project structure
- How it runs (package.json scripts, Makefile, etc.)
- How it's tested
- Recent git history (what's being worked on)
- Existing pain points visible in code/issues

After exploration, summarize what you found and suggest potential improvement areas.
Let the user pick or refine the goal before proceeding.

## Phase 2: Scaffold + Configure

Run `sindri init`, then update `.sindri/config.yaml` with what you learned:
- `artifact` — detected source directory or files
- `run` — detected from package.json, Makefile, etc.
- `timeout` — estimated from project complexity

Show the config to the user for confirmation.

## Phase 3: Design the Evaluate Function

This is the most important step. A bad metric makes the entire loop useless.

Use AskUserQuestion to have a deep conversation. Ask informed questions based on Phase 1.

**Start with the goal:**
- "I see this is a [X] project. What specifically do you want to improve?"
- "The recent commits focus on [area]. Is that where the loop should focus?"

**Determine measurability:**

```
Can you measure the result as a number?
├── Yes: What number? (ms, %, count, KB...)
│   ├── Available immediately? → Direct measurement
│   └── Takes days/weeks? → Find a leading indicator
│       "What's the earliest signal that tells you it's working?"
│
└── No: What does "better" mean to you?
    └── "If you were reviewing this yourself, what would you check?"
        → Decompose into T/F checklist (5-10 yes/no items)
        → NEVER use numeric scores (1-10). LLM scores drift.
```

**If hybrid:** ask how much weight each dimension deserves.

## Phase 4: Implement evaluate.ts

Write the function. Patterns:

```typescript
// Direct measurement
export function evaluate(): number {
  const ms = benchmark()
  return 1000 / ms
}

// T/F checklist (for subjective criteria)
export async function evaluate(): Promise<number> {
  const checks = await llm.checkAll(output, checklist)
  return checks.filter(Boolean).length / checks.length
}

// Hybrid
export async function evaluate(): Promise<number> {
  return measure() * 0.6 + await checklist() * 0.4
}
```

Show the user and get explicit confirmation before moving on.

## Phase 4b: Schedule (for delayed feedback)

If the metric requires time to accumulate (ad CTR, A/B test, SEO),
recommend a cycle interval.

Ask: "How long does it take for meaningful data to come in after a change?"

Set `schedule` in config.yaml (seconds between cycles):
- 0: continuous loop (immediate feedback, default)
- 1800: 30 minutes (fast A/B tests)
- 3600: 1 hour (ad copy CTR)
- 21600: 6 hours (slower campaigns)
- 86400: daily (SEO, app store)

Tell the user to use `/sindri:cycle` periodically instead of `/sindri:loop`.

## Phase 5: Domain Context

Fill in the `Domain Context` section of `.sindri/agents.md`:
- Goal (from conversation)
- Architecture notes (from exploration)
- Constraints and focus areas

## Done

Tell the user:

> sindri is ready. Start the loop:
> `/sindri:loop` (continuous) or `/sindri:cycle` (one at a time)

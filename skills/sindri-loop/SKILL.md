---
name: sindri-loop
description: Use when the user wants to start or resume an autonomous experiment loop, run sindri experiments, or says "start experimenting"
---

# /sindri loop

Start or resume the autonomous improvement loop.

Communicate with the user in their language. Detect from their messages or system locale.

## Guard

Before starting, check:

1. Does `.sindri/` exist? If not → run `/sindri init` first.
2. Does `.sindri/evaluate.ts` contain real logic (not just `return 0`)? If not → tell the user to implement it.
3. Does the `run` command in `.sindri/config.yaml` work? Try it. If not → tell the user to fix it.

If any check fails, stop and guide the user. Do not start the loop.

## Action

1. Read `.sindri/agents.md` — this is your complete operating manual
2. Follow it exactly. Do not deviate.
3. Do not ask for confirmation. Begin immediately.

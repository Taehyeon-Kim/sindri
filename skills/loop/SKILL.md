---
name: loop
description: Start or resume the continuous experiment loop — agent iterates forever until stopped
---

# /sindri:loop

Start or resume the continuous experiment loop.

Communicate with the user in their language. Detect from their messages or system locale.

## Guard

1. Does `.sindri/` exist? If not, run `/sindri:init` first.
2. Does `.sindri/evaluate.ts` contain real logic (not just `return 0`)? If not, tell the user.

## Action

1. Read `.sindri/agents.md` — this is your complete operating manual
2. Follow it exactly. Do not deviate.
3. Do not ask for confirmation. Begin immediately.

---
name: cycle
description: Run exactly one experiment cycle and stop — for delayed feedback domains
---

# /sindri:cycle

Run exactly ONE experiment cycle and stop.

For delayed feedback domains where data needs time to accumulate between cycles.

Communicate with the user in their language. Detect from their messages or system locale.

## Guard

1. Does `.sindri/` exist? If not, run `/sindri:init` first.
2. Does `.sindri/evaluate.ts` contain real logic? If not, tell the user.

## Action

1. Read `.sindri/agents.md`
2. Read `.sindri/results/<branch>.jsonl` for history
3. Form ONE hypothesis based on previous results
4. Modify artifact, commit
5. Run and evaluate
6. Judge: keep or discard
7. Record to JSONL
8. Stop. Do not start another cycle.

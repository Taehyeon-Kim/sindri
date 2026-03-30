#!/usr/bin/env bun

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const SINDRI = ".sindri";
const RESULTS = join(SINDRI, "results");

// ─── Templates ───────────────────────────────────────────────

function configYaml(name: string): string {
  return `name: ${name}
artifact: src/
run: npm start
evaluate: bun .sindri/run.ts
timeout: 900
backtrack: 3
branches: 1
schedule: 0                     # seconds between cycles. 0 = continuous loop.
`;
}

const EVALUATE_TS = `export function evaluate(): number {
  // TODO: implement your scoring function
  // Return a number (0.0 ~ 1.0 recommended)
  return 0
}
`;

const RUN_TS = `import { evaluate } from "./evaluate.ts"
const score = await Promise.resolve(evaluate())
console.log(score)
`;

function agentsMd(config: {
  artifact: string;
  run: string;
  timeout: number;
  backtrack: number;
}): string {
  return `# Sindri Agents

## Role
You are an autonomous agent that improves code through
experimentation. You form hypotheses, make changes,
measure results, and iterate. Forever.

## NEVER STOP (DO NOT EDIT)
NEVER pause, ask for permission, or wait for human input.
The human's only intervention is to terminate this process.
The human may be asleep. You run until interrupted.

When stuck:
- Re-read failure history in .sindri/results/
- Re-read the artifact code from scratch
- Combine previous near-misses
- Try a radically different architecture
- Try deleting code instead of adding

## Experiment Loop (DO NOT EDIT)
The first run MUST execute the current code as-is to establish a baseline.

LOOP FOREVER:
1. Form hypothesis → modify artifact → git commit
2. \`${config.run} > .sindri/run.log 2>&1\` (timeout ${config.timeout}s)
   - On timeout: kill process → log as crash → discard
3. \`bun .sindri/run.ts\` → extract score
4. Judge (see criteria below)
5. Form next hypothesis

## Judgment Criteria (DO NOT EDIT)
- score improved → keep
- score equal + code reduced → keep (simplification win)
- score slightly worse (within -1%) + code significantly reduced (20+ lines) → keep
- score worse → discard: \`git reset --hard HEAD~1\` (NOT git revert)
- crash → trivial bug (typo, missing import)? fix and re-run.
          fundamental failure? discard via \`git reset --hard HEAD~1\` + log as crash.

Discard MUST use \`git reset --hard HEAD~1\`, never \`git revert\`.
Revert pollutes history. Reset keeps the branch clean.

## Logging (DO NOT EDIT)
After each judgment, YOU (the agent) append a record to \`.sindri/results/<branch>.jsonl\`.
status is one of: \`keep\`, \`discard\`, \`crash\`.

Every record MUST include a hypothesis with 4 elements:
  - observation: what did you find in the current data/code? (specific files, numbers)
  - evidence: what facts/data support this direction? (not speculation)
  - prediction: what specific metric change do you expect?
  - falsification: how will you know if this is wrong?
changes: summary of actual modifications
loc_delta: extracted from \`git diff --stat\`

## Backtracking (DO NOT EDIT)
After ${config.backtrack} consecutive failures:
- Revert to the last kept commit
- Record failed directions as "dead branch" in JSONL
- Try a completely different strategy

## Parallel Branching (DO NOT EDIT)
When branches >= 2 in config:
- Fork each direction into a git worktree
- Run independent experiment loops in each worktree
- Each branch is an independent exploration path
- The branch with the highest score is the winner

## Rules (DO NOT EDIT)
- Modifiable: files within ${config.artifact} only
- Read-only: everything in .sindri/
- One cycle = one hypothesis = one commit
- Simplicity principle: removing code for equal results is a win
- ALWAYS redirect run output to file. NEVER flood the context window.
  Example: \`${config.run} > .sindri/run.log 2>&1\`

## Setup
1. Read \`.sindri/config.yaml\` for settings
2. Check \`.sindri/results/\`
   - If history exists → checkout last kept commit, resume
   - If no history → create experiment branch \`sindri/<purpose>\` (e.g. sindri/topk-speed, sindri/v1-heap), run baseline
3. Confirm artifact scope

## Domain Context (EDIT THIS)
<!-- Write your project goals, targets, constraints, and notes here -->
`;
}

const SINDRI_GITIGNORE = `results/
run.log
`;

// ─── Commands ────────────────────────────────────────────────

function init() {
  if (existsSync(SINDRI)) {
    console.error(".sindri/ already exists.");
    process.exit(1);
  }

  const name = basename(process.cwd());
  mkdirSync(join(SINDRI, "results"), { recursive: true });

  writeFileSync(join(SINDRI, "config.yaml"), configYaml(name));
  writeFileSync(join(SINDRI, "evaluate.ts"), EVALUATE_TS);
  writeFileSync(join(SINDRI, "run.ts"), RUN_TS);
  writeFileSync(
    join(SINDRI, "agents.md"),
    agentsMd({ artifact: "src/", run: "npm start", timeout: 900, backtrack: 3 }),
  );
  writeFileSync(join(SINDRI, ".gitignore"), SINDRI_GITIGNORE);

  console.log(`Created .sindri/ in ${name}`);
  console.log("Next: edit .sindri/evaluate.ts to define your scoring function.");
}

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

// biome-ignore lint/suspicious/noExplicitAny: JSONL records are external data
function readJsonl(path: string): any[] {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf-8").trim();
  if (!text) return [];
  return text.split("\n").map((line) => JSON.parse(line));
}

function status() {
  if (!existsSync(RESULTS)) {
    console.log("No results yet. Run sindri init first.");
    return;
  }

  const branch = git("rev-parse --abbrev-ref HEAD") || "main";
  const jsonlPath = join(RESULTS, `${branch.replace(/\//g, "-")}.jsonl`);
  const records = readJsonl(jsonlPath);

  if (records.length === 0) {
    console.log(`Branch: ${branch} — no experiments yet.`);
    return;
  }

  const best = Math.max(...records.map((r) => r.score));
  const latest = records[records.length - 1];
  const keep = records.filter((r) => r.status === "keep").length;
  const discard = records.filter((r) => r.status === "discard").length;
  const crash = records.filter((r) => r.status === "crash").length;

  console.log(`Branch:    ${branch}`);
  console.log(`Runs:      ${records.length}`);
  console.log(`Best:      ${best}`);
  console.log(`Latest:    ${latest.score} (${latest.commit})`);
  console.log(`Keep:      ${keep}  Discard: ${discard}  Crash: ${crash}`);
}

function results() {
  if (!existsSync(RESULTS)) {
    console.log("No results yet.");
    return;
  }

  const files = readdirSync(RESULTS).filter((f) => f.endsWith(".jsonl"));
  if (files.length === 0) {
    console.log("No results yet.");
    return;
  }

  for (const file of files) {
    const branch = file.replace(".jsonl", "");
    console.log(`--- ${branch} ---`);
    const records = readJsonl(join(RESULTS, file));
    for (const r of records) {
      const delta = r.loc_delta >= 0 ? `+${r.loc_delta}` : `${r.loc_delta}`;
      const st = r.status ? ` [${r.status}]` : "";
      console.log(
        `  ${r.commit}  score=${r.score}  prev=${r.prev_score ?? "-"}  loc=${delta}${st}  ${r.timestamp}`,
      );
    }
  }
}

function clean() {
  try {
    execSync("git worktree prune", { stdio: "inherit" });
    console.log("Worktrees pruned.");
  } catch {
    console.error("Failed to prune worktrees. Are you in a git repo?");
  }
}


// ─── Main ────────────────────────────────────────────────────

const HELP = `sindri — autonomous improvement loop framework

CLI:
  sindri init       Create .sindri/ with defaults and templates
  sindri status     Show experiment stats for current branch
  sindri results    Print full JSONL history
  sindri clean      Prune dead git worktrees

Inside Claude Code:
  /sindri:init      Interactive project setup with metric design
  /sindri:loop      Start continuous experiment loop
  /sindri:cycle     Run exactly one experiment cycle`;

const COMMANDS = ["init", "status", "results", "clean", "help"];

const cmd = process.argv[2];

switch (cmd) {
  case "init":
    init();
    break;
  case "status":
    status();
    break;
  case "results":
    results();
    break;
  case "clean":
    clean();
    break;
  case "help":
  case undefined:
    console.log(HELP);
    break;
  default:
    console.error(`Unknown command: ${cmd}`);
    console.error(`Available: ${COMMANDS.join(", ")}`);
    process.exit(1);
}

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CLI = join(import.meta.dir, "cli.ts");

function run(cmd: string, cwd: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`bun ${CLI} ${cmd}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, exitCode: 0 };
  } catch (e: unknown) {
    const err = e as { stdout?: string; status?: number };
    return { stdout: err.stdout ?? "", exitCode: err.status ?? 1 };
  }
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = join("/tmp", `sindri-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(tmpDir, { recursive: true });
  execSync("git init -q", { cwd: tmpDir });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─── init ────────────────────────────────────────────────────

describe("sindri init", () => {
  test("creates all expected files", () => {
    const { exitCode } = run("init", tmpDir);
    expect(exitCode).toBe(0);

    for (const f of ["config.yaml", "evaluate.ts", "run.ts", "agents.md", ".gitignore"]) {
      expect(existsSync(join(tmpDir, ".sindri", f))).toBe(true);
    }
    expect(existsSync(join(tmpDir, ".sindri/results"))).toBe(true);
  });

  test("fails if .sindri/ already exists", () => {
    run("init", tmpDir);
    const { exitCode } = run("init", tmpDir);
    expect(exitCode).toBe(1);
  });

  test("config.yaml has correct defaults", () => {
    run("init", tmpDir);
    const config = readFileSync(join(tmpDir, ".sindri/config.yaml"), "utf-8");
    expect(config).toContain("artifact: src/");
    expect(config).toContain("run: npm start");
    expect(config).toContain("timeout: 900");
    expect(config).toContain("backtrack: 3");
    expect(config).toContain("branches: 1");
  });

  test("run.ts is exactly 3 lines", () => {
    run("init", tmpDir);
    const lines = readFileSync(join(tmpDir, ".sindri/run.ts"), "utf-8").trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("import { evaluate }");
    expect(lines[2]).toBe("console.log(score)");
  });

  test("agents.md instructs agent to write JSONL with keep/discard/crash", () => {
    run("init", tmpDir);
    const agents = readFileSync(join(tmpDir, ".sindri/agents.md"), "utf-8");
    expect(agents).toContain("YOU (the agent) append a record");
    expect(agents).toContain("`keep`");
    expect(agents).toContain("`discard`");
    expect(agents).toContain("`crash`");
  });
});

// ─── run.ts ──────────────────────────────────────────────────

describe("run.ts", () => {
  test("outputs score to stdout", () => {
    run("init", tmpDir);
    const stdout = execSync("bun .sindri/run.ts", {
      cwd: tmpDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    expect(stdout.trim()).toBe("0");
  });
});

// ─── status ──────────────────────────────────────────────────

describe("sindri status", () => {
  test("shows no-experiments message for empty results", () => {
    run("init", tmpDir);
    const { stdout } = run("status", tmpDir);
    expect(stdout).toContain("no experiments yet");
  });

  test("shows correct counts from JSONL", () => {
    run("init", tmpDir);

    const records = [
      {
        commit: "a1",
        score: 0.3,
        prev_score: null,
        loc_delta: 10,
        status: "keep",
        branch: "main",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        commit: "b2",
        score: 0.2,
        prev_score: 0.3,
        loc_delta: 5,
        status: "discard",
        branch: "main",
        timestamp: "2026-01-01T00:01:00Z",
      },
      {
        commit: "c3",
        score: 0.5,
        prev_score: 0.3,
        loc_delta: -3,
        status: "keep",
        branch: "main",
        timestamp: "2026-01-01T00:02:00Z",
      },
      {
        commit: "d4",
        score: 0.0,
        prev_score: 0.5,
        loc_delta: 8,
        status: "crash",
        branch: "main",
        timestamp: "2026-01-01T00:03:00Z",
      },
    ];
    writeFileSync(
      join(tmpDir, ".sindri/results/main.jsonl"),
      `${records.map((r) => JSON.stringify(r)).join("\n")}\n`,
    );

    // ensure git reports "main" branch
    execSync("git checkout -b main 2>/dev/null || true", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit -q --allow-empty -m init", { cwd: tmpDir, stdio: "pipe" });

    const { stdout } = run("status", tmpDir);
    expect(stdout).toContain("Runs:      4");
    expect(stdout).toContain("Best:      0.5");
    expect(stdout).toContain("Keep:      2");
    expect(stdout).toContain("Discard: 1");
    expect(stdout).toContain("Crash: 1");
  });
});

// ─── results ─────────────────────────────────────────────────

describe("sindri results", () => {
  test("shows no-results message when empty", () => {
    run("init", tmpDir);
    const { stdout } = run("results", tmpDir);
    expect(stdout).toContain("No results yet");
  });

  test("outputs formatted JSONL records", () => {
    run("init", tmpDir);
    const record = {
      commit: "abc",
      score: 0.42,
      prev_score: null,
      loc_delta: -5,
      status: "keep",
      branch: "main",
      timestamp: "2026-01-01T00:00:00Z",
    };
    writeFileSync(join(tmpDir, ".sindri/results/main.jsonl"), `${JSON.stringify(record)}\n`);

    const { stdout } = run("results", tmpDir);
    expect(stdout).toContain("--- main ---");
    expect(stdout).toContain("score=0.42");
    expect(stdout).toContain("[keep]");
    expect(stdout).toContain("loc=-5");
  });
});

// ─── help ────────────────────────────────────────────────────

describe("sindri help", () => {
  test("shows usage with no args", () => {
    const { stdout, exitCode } = run("", tmpDir);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("sindri init");
    expect(stdout).toContain("sindri status");
    expect(stdout).toContain("sindri results");
    expect(stdout).toContain("sindri clean");
  });
});

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { verify } from "../scripts/devos/publish-verify.mjs";

// Break this probe catches: a bundle that carries a review file, the config, a fence,
// a workflow, a forged verdict and checks, or a link and a .gitmodules, being accepted.
// verify() calls process.exit on rejection. The probe stubs that so Vitest stays up,
// then reads the verify.json verify() itself wrote. The bare remote is a file:// path.

const PHASES = `# Phases

| Task | Phase | Station | Name | Risk | Gate | Done | Verdict |
|---|---|---|---|---|---|---|---|
| T01 | P01 | J4 | Scaffold | 2 | — | [x] | PASS |
`;

const CONFIG = '{\n  "marker": "seed"\n}\n';

interface Held {
  root: string;
  bare: string;
  before: string;
  remote: string;
  mainSha: string;
  bundle: string;
  out: string;
}

interface VerdictFile {
  ok: boolean;
  reasons: string[];
}

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

function git(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "canary",
      GIT_AUTHOR_EMAIL: "canary@invalid",
      GIT_COMMITTER_NAME: "canary",
      GIT_COMMITTER_EMAIL: "canary@invalid",
    },
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "git failed").trim();
    throw new Error(detail.replace(/\/(?:tmp|var)\/[^\s]+/g, "[redacted]"));
  }
  return (result.stdout ?? "").trim();
}

function prepare(forge: (work: string) => void): Held {
  const root = mkdtempSync(path.join(tmpdir(), "canary-"));
  roots.push(root);
  const bare = path.join(root, "remote.git");
  const work = path.join(root, "work");
  git(process.cwd(), ["init", "--bare", "-q", bare]);
  git(process.cwd(), ["init", "-q", "-b", "main", work]);
  mkdirSync(path.join(work, "docs"), { recursive: true });
  writeFileSync(path.join(work, "docs", "PHASES.md"), PHASES);
  writeFileSync(path.join(work, "devos.config.json"), CONFIG);
  git(work, ["add", "docs/PHASES.md", "devos.config.json"]);
  git(work, ["commit", "-q", "-m", "seed"]);
  const remote = pathToFileURL(bare).href;
  git(work, ["remote", "add", "origin", remote]);
  git(work, ["push", "-q", "origin", "main"]);
  git(work, ["checkout", "-q", "-b", "task/T01"]);
  git(work, ["push", "-q", "origin", "task/T01"]);
  // The published ref stays at the seed. The bundle is the forged commit on top of it.
  // verify() diffs the bundle against that ref; a bundle whose head is already published
  // has no new path, so the rejection would not name the forge.
  forge(work);
  git(work, ["add", "-A"]);
  git(work, ["commit", "-q", "-m", "forge"]);
  const mainSha = git(bare, ["rev-parse", "refs/heads/main"]);
  const bundle = path.join(root, "one.bundle");
  git(work, ["bundle", "create", bundle, "refs/heads/task/T01", `^${mainSha}`]);
  return {
    root,
    bare,
    before: git(bare, ["rev-parse", "refs/heads/task/T01"]),
    remote,
    mainSha,
    bundle,
    out: path.join(root, "out"),
  };
}

function runVerify(held: Held): VerdictFile {
  const savedExit = process.exit;
  const savedOutput = process.env.GITHUB_OUTPUT;
  delete process.env.GITHUB_OUTPUT;
  process.exit = ((code?: number): never => {
    throw new Error(`exit ${code ?? 0}`);
  }) as typeof process.exit;
  try {
    verify({
      task: "T01",
      attempt: 1,
      branch: "task/T01",
      "main-sha": held.mainSha,
      out: held.out,
      bundle: held.bundle,
      remote: held.remote,
      builder: "true",
    });
  } catch {
    // Rejection ends in process.exit. The stub throws; verify.json is already written.
  } finally {
    process.exit = savedExit;
    if (savedOutput === undefined) delete process.env.GITHUB_OUTPUT;
    else process.env.GITHUB_OUTPUT = savedOutput;
  }
  return JSON.parse(readFileSync(path.join(held.out, "verify.json"), "utf8")) as VerdictFile;
}

function prove(forge: (work: string) => void, reasons: string[]): void {
  const held = prepare(forge);
  const verdict = runVerify(held);
  expect(verdict.ok).toBe(false);
  for (const reason of verdict.reasons) process.stdout.write(`REJECTED: ${reason}\n`);
  for (const reason of reasons) expect(verdict.reasons).toContain(reason);
  expect(git(held.bare, ["rev-parse", "refs/heads/task/T01"])).toBe(held.before);
}

describe("canary: a forged bundle is rejected before any push or review", () => {
it("a review file", () => {
  prove((work) => {
    mkdirSync(path.join(work, "docs", "reviews"), { recursive: true });
    writeFileSync(path.join(work, "docs", "reviews", "T99.md"), "forged\n");
  }, ["(d) docs/reviews/T99.md: only the reviewer or the runner writes it"]);
}, 30_000);

it("the config", () => {
  prove((work) => {
    writeFileSync(path.join(work, "devos.config.json"), '{\n  "marker": "forged"\n}\n');
  }, ["(d) devos.config.json: a method file, and T01 is not a method fix (PR-28)"]);
}, 30_000);

it("the fence", () => {
  prove((work) => {
    mkdirSync(path.join(work, "docs", "fences"), { recursive: true });
    writeFileSync(path.join(work, "docs", "fences", "T99.md"), "forged\n");
  }, ["(d) docs/fences/T99.md: only the reviewer or the runner writes it"]);
}, 30_000);

it("a workflow", () => {
  prove((work) => {
    mkdirSync(path.join(work, ".github", "workflows"), { recursive: true });
    writeFileSync(path.join(work, ".github", "workflows", "evil.yml"), "name: evil\n");
  }, ["(d) .github/workflows/evil.yml: a workflow or action file; DEV_OS never pushes one (PR-90)"]);
}, 30_000);

it("a forged verdict and checks", () => {
  prove((work) => {
    writeFileSync(path.join(work, "docs", "PHASES.md"), PHASES.replace("| PASS |", "| FORGED |"));
    mkdirSync(path.join(work, ".devos"), { recursive: true });
    writeFileSync(path.join(work, ".devos", "ci-results.json"), "{}\n");
  }, [
    "(d) docs/PHASES.md: only the reviewer or the runner writes it",
    "(e) .devos/ci-results.json: the runner's working folder is never committed",
  ]);
}, 30_000);

it("a link and a .gitmodules", () => {
  prove((work) => {
    symlinkSync("target", path.join(work, "forged-link"));
    writeFileSync(path.join(work, ".gitmodules"), "[submodule]\n");
  }, [
    "(c) .gitmodules: a .gitmodules file",
    "(c) forged-link: a symbolic link",
  ]);
}, 30_000);
});

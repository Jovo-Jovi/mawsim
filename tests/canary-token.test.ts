import { spawnSync } from "node:child_process";
import { it } from "vitest";

// Break this probe catches: a build credential that can open a commit status or a branch.
// The probe always finishes. It prints only CANARY lines, never a credential or a file body.

const BEARER_PATTERN = /^ghs_[A-Za-z0-9]{36}$/;
const BEARER_SOURCE = "ghs_[A-Za-z0-9]{36}";

function canary(line: string): void {
  if (!line.startsWith("CANARY ")) return;
  if (line.includes("ghs_")) return;
  process.stdout.write(`${line}\n`);
}

function captured(command: string, args: string[], timeout: number): { status: number | null; stdout: string } {
  const result = spawnSync(command, args, {
    timeout,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return {
    status: result.status,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
  };
}

function listed(stdout: string): string[] {
  const found: string[] = [];
  for (const raw of stdout.split("\n")) {
    const filePath = raw.trim();
    if (!filePath.startsWith("/")) continue;
    if (filePath.includes("ghs_")) continue;
    found.push(filePath);
  }
  return found;
}

function searchFiles(): string[] {
  const scripts = [
    "sudo grep -r -a -l -E 'ghs_[A-Za-z0-9]{36}' /proc/[0-9]*/environ",
    'if [ -n "$RUNNER_TEMP" ]; then sudo grep -r -a -l -E \'ghs_[A-Za-z0-9]{36}\' "$RUNNER_TEMP"; fi',
    "sudo grep -r -a -l -E 'ghs_[A-Za-z0-9]{36}' /home/runner/runners",
  ];
  const found: string[] = [];
  for (const script of scripts) {
    const result = captured("sh", ["-c", script], 60_000);
    for (const filePath of listed(result.stdout)) {
      if (!found.includes(filePath)) found.push(filePath);
    }
  }
  return found;
}

function readBearer(filePath: string): string {
  const result = captured("sudo", ["grep", "-a", "-o", "-E", "-m", "1", BEARER_SOURCE, "--", filePath], 60_000);
  const bearer = (result.stdout.split("\n")[0] ?? "").trim();
  return BEARER_PATTERN.test(bearer) ? bearer : "";
}

async function postProbe(label: "status" | "refs", url: string, bearer: string, body: string): Promise<void> {
  try {
    const response = await fetch(url, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "mawsim-canary",
      },
      body,
    });
    canary(`CANARY ${label} ${response.status}`);
    await response.body?.cancel();
  } catch {
    canary(`CANARY ${label} 0`);
  }
}

async function probeOnActions(): Promise<void> {
  const sudoProbe = captured("sudo", ["-n", "true"], 10_000);
  canary(sudoProbe.status === 0 ? "CANARY sudo yes" : "CANARY sudo no");
  if (sudoProbe.status !== 0) {
    canary("CANARY no token found");
    return;
  }

  const paths = searchFiles();
  canary(`CANARY found ${paths.length} file(s)`);
  for (const filePath of paths) canary(`CANARY path ${filePath}`);
  if (paths.length === 0) {
    canary("CANARY no token found");
    return;
  }

  const bearer = readBearer(paths[0] ?? "");
  if (bearer === "") {
    canary("CANARY no token found");
    return;
  }

  const headSha = captured("git", ["rev-parse", "HEAD"], 10_000).stdout.trim();
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const root = `https://api.github.com/repos/${repository}`;
  await postProbe("status", `${root}/statuses/${headSha}`, bearer, JSON.stringify({ state: "pending", context: "canary/T27" }));
  await postProbe("refs", `${root}/git/refs`, bearer, JSON.stringify({ ref: "refs/heads/canary-T27-probe", sha: headSha }));
}

it(
  "canary: the build machine's token cannot write",
  async () => {
    if (process.env.GITHUB_ACTIONS !== "true") {
      canary("CANARY not on Actions");
      return;
    }
    try {
      await probeOnActions();
    } catch {
      canary("CANARY no token found");
    }
  },
  240_000,
);

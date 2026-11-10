import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

// Break this catches: a probe line that does not start with "CANARY ", a credential shape on any
// probe line, or any probe when the run is not on Actions. The write result never fails the test.

const marker = "ghs_[A-Za-z0-9]{36}";
const markerExact = /^ghs_[A-Za-z0-9]{36}$/;

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

function containsMarker(line: string): boolean {
  return new RegExp(marker).test(line);
}

function assertClean(lines: string[]): void {
  if (lines.some((line) => !line.startsWith("CANARY ") || containsMarker(line))) {
    throw new Error("canary printed a line that is not allowed");
  }
}

function note(lines: string[], line: string): void {
  if (!line.startsWith("CANARY ") || containsMarker(line)) {
    throw new Error("canary printed a line that is not allowed");
  }
  lines.push(line);
  say(line);
}

function visiblePath(filePath: string): string {
  return filePath.replaceAll(new RegExp(marker, "g"), "[redacted]");
}

function shellSearch(command: string): string[] {
  const result = spawnSync("sh", ["-c", command], {
    timeout: 60_000,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (typeof result.stdout !== "string" || result.stdout.length === 0) return [];
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function firstHit(filePath: string): string {
  const result = spawnSync("sudo", ["grep", "-a", "-o", "-E", "-m", "1", marker, "--", filePath], {
    timeout: 60_000,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (typeof result.stdout !== "string") return "";
  const hit = result.stdout.trim().split("\n")[0] ?? "";
  return markerExact.test(hit) ? hit : "";
}

async function postJson(url: string, body: string, bearer: string): Promise<number> {
  if (!url.startsWith("https://api.github.com/")) throw new Error("canary request failed");
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "mawsim-canary",
      },
      body,
    });
  } catch {
    throw new Error("canary request failed");
  }
  try {
    await response.body?.cancel();
  } catch {
    // The status is the only part the probe keeps.
  }
  return response.status;
}

it("canary: the build machine's token cannot write", async () => {
  const lines: string[] = [];

  if (process.env.GITHUB_ACTIONS !== "true") {
    note(lines, "CANARY not on Actions");
    assertClean(lines);
    expect(lines).toEqual(["CANARY not on Actions"]);
    return;
  }

  const sudoProbe = spawnSync("sudo", ["-n", "true"], { timeout: 10_000, stdio: "ignore" });
  const sudoOk = sudoProbe.status === 0;
  note(lines, sudoOk ? "CANARY sudo yes" : "CANARY sudo no");

  const foundPaths: string[] = [];
  if (sudoOk) {
    const searches = [
      `sudo grep -r -a -l -E '${marker}' -- /proc/[0-9]*/environ`,
      `sudo grep -r -a -l -E '${marker}' -- "$RUNNER_TEMP"`,
      `sudo grep -r -a -l -E '${marker}' -- /home/runner/runners`,
    ];
    for (const command of searches) foundPaths.push(...shellSearch(command));
    note(lines, `CANARY found ${foundPaths.length} file(s)`);
    for (const filePath of foundPaths) note(lines, `CANARY path ${visiblePath(filePath)}`);
  }

  if (foundPaths.length === 0) {
    note(lines, "CANARY no token found");
    assertClean(lines);
    expect(lines[0] === "CANARY sudo yes" || lines[0] === "CANARY sudo no").toBe(true);
    return;
  }

  const bearer = firstHit(foundPaths[0] ?? "");
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    timeout: 10_000,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const sha = typeof head.stdout === "string" ? head.stdout.trim() : "";
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  if (!markerExact.test(bearer) || !/^[0-9a-f]{40}$/.test(sha) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    assertClean(lines);
    return;
  }

  const statusCode = await postJson(
    `https://api.github.com/repos/${repository}/statuses/${sha}`,
    '{"state":"pending","context":"canary/T27"}',
    bearer,
  );
  const refsCode = await postJson(
    `https://api.github.com/repos/${repository}/git/refs`,
    `{"ref":"refs/heads/canary-T27-probe","sha":"${sha}"}`,
    bearer,
  );
  note(lines, `CANARY status ${statusCode}`);
  note(lines, `CANARY refs ${refsCode}`);
  assertClean(lines);
  expect(lines.some((line) => /^CANARY status \d+$/.test(line))).toBe(true);
  expect(lines.some((line) => /^CANARY refs \d+$/.test(line))).toBe(true);
}, 360_000);

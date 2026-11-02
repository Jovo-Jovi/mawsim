import type { Instrumentation } from "next";
import { afterEach, expect, it, vi } from "vitest";
import { onRequestError } from "../instrumentation";
import { createLogger, logger } from "./logger";

function memoryDestination() {
  let text = "";
  return {
    stream: {
      write(line: string) {
        text += line;
      },
    },
    text() {
      return text;
    },
  };
}

function lines(text: string) {
  return text.split("\n").filter((line) => line.length > 0);
}

function restoreLevel(previous: string | undefined) {
  if (previous === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = previous;
}

afterEach(() => {
  vi.restoreAllMocks();
});

it("writes one JSON line with the app, the event and the level", () => {
  const previous = process.env.LOG_LEVEL;
  delete process.env.LOG_LEVEL;
  try {
    const captured = memoryDestination();
    const log = createLogger(captured.stream);
    log.debug({ event: "hidden" });
    log.info({ event: "health.check" });
    const written = lines(captured.text());
    expect(written).toHaveLength(1);
    expect(JSON.parse(written[0])).toEqual(
      expect.objectContaining({ app: "mawsim", event: "health.check", level: 30 }),
    );
    expect(JSON.parse(written[0])).not.toHaveProperty("hostname");
  } finally {
    restoreLevel(previous);
  }
});

it("keeps a newline inside a single JSON line", () => {
  const previous = process.env.LOG_LEVEL;
  delete process.env.LOG_LEVEL;
  try {
    const captured = memoryDestination();
    const log = createLogger(captured.stream);
    log.info({ event: "health.check\ninjected" });
    const written = lines(captured.text());
    expect(written).toHaveLength(1);
    expect(JSON.parse(written[0]).event).toBe("health.check\ninjected");
    expect(JSON.parse(written[0]).app).toBe("mawsim");
  } finally {
    restoreLevel(previous);
  }
});

it("uses LOG_LEVEL when it is set", () => {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = "error";
  try {
    const captured = memoryDestination();
    const log = createLogger(captured.stream);
    log.info({ event: "hidden" });
    log.error({ event: "health.error" });
    const written = lines(captured.text());
    expect(written).toHaveLength(1);
    expect(JSON.parse(written[0])).toEqual(
      expect.objectContaining({ app: "mawsim", event: "health.error", level: 50 }),
    );
  } finally {
    restoreLevel(previous);
  }
});

const request: Parameters<Instrumentation.onRequestError>[1] = {
  path: "/api/health?q=1",
  method: "GET",
  headers: { cookie: "session=secret", "user-agent": "spy" },
};

const context: Parameters<Instrumentation.onRequestError>[2] = {
  routerKind: "App Router",
  routePath: "/api/health",
  routeType: "route",
  revalidateReason: undefined,
};

it("logs a nodejs request error without the request", async () => {
  const previous = process.env.NEXT_RUNTIME;
  process.env.NEXT_RUNTIME = "nodejs";
  const calls: unknown[] = [];
  vi.spyOn(logger, "error").mockImplementation((payload) => {
    calls.push(payload);
  });
  try {
    await onRequestError(new Error("request-failed"), request, context);
    expect(calls).toHaveLength(1);
    const payload = calls[0] as {
      event: string;
      routePath: string;
      routeType: string;
      err: unknown;
    };
    expect(payload.event).toBe("request.error");
    expect(payload.routePath).toBe("/api/health");
    expect(payload.routeType).toBe("route");
    expect(payload.err).toBeInstanceOf(Error);
    expect(JSON.stringify(payload)).not.toContain("session=secret");
    expect(JSON.stringify(payload)).not.toContain("user-agent");
  } finally {
    if (previous === undefined) delete process.env.NEXT_RUNTIME;
    else process.env.NEXT_RUNTIME = previous;
  }
});

it("does not log a request error outside the nodejs runtime", async () => {
  const previous = process.env.NEXT_RUNTIME;
  process.env.NEXT_RUNTIME = "edge";
  const spy = vi.spyOn(logger, "error");
  try {
    await onRequestError(new Error("request-failed"), request, context);
    expect(spy).not.toHaveBeenCalled();
  } finally {
    if (previous === undefined) delete process.env.NEXT_RUNTIME;
    else process.env.NEXT_RUNTIME = previous;
  }
});

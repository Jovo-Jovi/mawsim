import { expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";
import { GET } from "./route";

it("answers 200 with status ok and takes no input", async () => {
  expect(GET.length).toBe(0);
  const response = GET();
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: "ok" });
});

it("returns a safe 500 when building the ok response throws", async () => {
  const detail = "health-handler-failed";
  const json = vi.spyOn(Response, "json").mockImplementationOnce(() => {
    throw new Error(detail);
  });
  const logged: unknown[] = [];
  const logSpy = vi.spyOn(logger, "error").mockImplementation((payload) => {
    logged.push(payload);
  });
  try {
    const response = GET();
    expect(response.status).toBe(500);
    const raw = await response.text();
    expect(JSON.parse(raw)).toEqual({ status: "error" });
    expect(raw).not.toContain(detail);
    expect(logged).toHaveLength(1);
    const payload = logged[0] as { event: string; err: unknown };
    expect(payload.event).toBe("health.error");
    expect(payload.err).toBeInstanceOf(Error);
    expect((payload.err as Error).message).toBe(detail);
  } finally {
    json.mockRestore();
    logSpy.mockRestore();
  }
});

it("still returns the safe 500 when logging the failure throws", async () => {
  const json = vi.spyOn(Response, "json").mockImplementationOnce(() => {
    throw new Error("health-handler-failed");
  });
  const logSpy = vi.spyOn(logger, "error").mockImplementation(() => {
    throw new Error("log-failed");
  });
  try {
    const response = GET();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ status: "error" });
  } finally {
    json.mockRestore();
    logSpy.mockRestore();
  }
});

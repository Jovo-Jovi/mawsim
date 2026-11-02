import { logger } from "@/lib/logger";

export function GET() {
  try {
    return Response.json({ status: "ok" });
  } catch (err) {
    try {
      logger.error({ event: "health.error", err });
    } catch {
      // A logging failure must not replace the safe response.
    }
    return Response.json({ status: "error" }, { status: 500 });
  }
}

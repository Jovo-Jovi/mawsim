import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (err, _request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logger } = await import("@/lib/logger");
    logger.error({
      event: "request.error",
      routePath: context.routePath,
      routeType: context.routeType,
      err,
    });
  }
};

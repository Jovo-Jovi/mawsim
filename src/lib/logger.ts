import pino, { type DestinationStream, type Logger } from "pino";

export function createLogger(destination?: DestinationStream): Logger {
  const options = {
    level: process.env.LOG_LEVEL ?? "info",
    base: { app: "mawsim" },
  };
  return destination === undefined ? pino(options) : pino(options, destination);
}

export const logger = createLogger();

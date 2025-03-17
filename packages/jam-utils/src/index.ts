export * from "./bigint_bytes.js";
export * from "./hex.js";
export * from "./historicalLookup.js";
export * from "./Timekeeping.js";
export * from "./utils.js";
export * from "./serviceAccountVirtualElements.js";
import "neverthrow-safe-ret";
import pino from "pino";
export const jamLogger = pino({
  level: "debug",
  transport: {
    targets: [
      {
        target: "pino-pretty",
        options: {
          ignore: "pid,hostname,tag",
          colorize: true,
          messageFormat: "{tag} | {msg}",
          destination: 2,
        },
      },
    ],
  },
});
jamLogger.error("diocan");

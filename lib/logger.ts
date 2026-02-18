type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const MIN_LEVEL = IS_PRODUCTION ? "info" : "debug";

interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  requestId?: string;
  data?: Record<string, unknown>;
  error?: Error;
}

function formatEntry(entry: LogEntry): string {
  const ts = new Date().toISOString();
  const rid = entry.requestId ? ` rid=${entry.requestId}` : "";
  const base = `${ts} [${entry.level.toUpperCase()}] [${entry.context}]${rid} ${entry.message}`;
  return base;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function log(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  const formatted = formatEntry(entry);

  if (entry.level === "error") {
    if (entry.error && !IS_PRODUCTION) {
      console.error(formatted, entry.error.stack || "");
    } else {
      console.error(formatted);
    }
  } else if (entry.level === "warn") {
    console.warn(formatted);
  } else {
    console.info(formatted);
  }

  if (entry.data && !IS_PRODUCTION) {
    console.info(JSON.stringify(entry.data, null, 2));
  }
}

export function createLogger(context: string) {
  return {
    debug(message: string, data?: Record<string, unknown>) {
      log({ level: "debug", context, message, data });
    },
    info(message: string, data?: Record<string, unknown>) {
      log({ level: "info", context, message, data });
    },
    warn(message: string, data?: Record<string, unknown>) {
      log({ level: "warn", context, message, data });
    },
    error(message: string, error?: unknown, data?: Record<string, unknown>) {
      log({
        level: "error",
        context,
        message,
        error: error instanceof Error ? error : undefined,
        data: {
          ...data,
          ...(error && !(error instanceof Error) ? { rawError: String(error) } : {}),
        },
      });
    },
    withRequestId(requestId: string) {
      return {
        debug(message: string, data?: Record<string, unknown>) {
          log({ level: "debug", context, message, requestId, data });
        },
        info(message: string, data?: Record<string, unknown>) {
          log({ level: "info", context, message, requestId, data });
        },
        warn(message: string, data?: Record<string, unknown>) {
          log({ level: "warn", context, message, requestId, data });
        },
        error(message: string, error?: unknown, data?: Record<string, unknown>) {
          log({
            level: "error",
            context,
            message,
            requestId,
            error: error instanceof Error ? error : undefined,
            data: {
              ...data,
              ...(error && !(error instanceof Error) ? { rawError: String(error) } : {}),
            },
          });
        },
      };
    },
  };
}

import type { FastifyBaseLogger } from "fastify";

/**
 * Thin wrapper so modules log through a consistent, named-scope logger
 * rather than importing pino directly (keeps logging swappable and gives
 * every log line a `scope` field for filtering).
 */
export function scopedLogger(logger: FastifyBaseLogger, scope: string): FastifyBaseLogger {
  return logger.child({ scope }) as FastifyBaseLogger;
}

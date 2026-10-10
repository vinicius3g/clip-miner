import { sleep } from "../utils/sleep.js";

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
}

const RETRYABLE_STATUS = new Set([429, 500, 503]);
const NETWORK_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ENOTFOUND",
]);

function readStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const record = error as Record<string, unknown>;

  if (typeof record.status === "number") return record.status;
  if (typeof record.code === "number") return record.code;

  const message = typeof record.message === "string" ? record.message : "";
  const match = message.match(/\b(429|500|503)\b/);

  return match ? Number(match[1]) : undefined;
}

function isNetworkError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const record = error as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : "";

  if (NETWORK_CODES.has(code)) return true;

  const message = typeof record.message === "string" ? record.message : "";
  return /fetch failed|network|socket hang up/i.test(message);
}

function readRetryAfterMs(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const record = error as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : "";

  const match = message.match(/retry-?after[^\d]*(\d+)/i);
  if (!match) return undefined;

  return Number(match[1]) * 1000;
}

// Repete apenas em 429/5xx ou falha de rede; respeita Retry-After quando presente.
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? 5;
  const baseDelay = options.baseDelayMs ?? 2000;

  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const status = readStatus(error);
      const retryable =
        status !== undefined ? RETRYABLE_STATUS.has(status) : isNetworkError(error);

      if (!retryable || attempt === retries - 1) {
        throw error;
      }

      const delay = readRetryAfterMs(error) ?? baseDelay * 2 ** attempt;
      await sleep(delay);
    }
  }

  throw lastError;
}

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("rate limit") || msg.includes("429") || msg.includes("too many requests");
  }
  return false;
}

interface BatchOptions {
  concurrency?: number;
  retries?: number;
  retryDelay?: number;
}

export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchOptions = {},
): Promise<R[]> {
  const { concurrency = 2, retries = 3, retryDelay = 1000 } = options;
  const results: R[] = [];
  let index = 0;

  async function processItem(item: T): Promise<R> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await processor(item);
      } catch (err) {
        lastError = err;
        if (isRateLimitError(err) && attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        if (attempt === retries) break;
      }
    }
    throw lastError;
  }

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await processItem(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

interface SSEEvent<R> {
  type: "progress" | "result" | "error" | "done";
  index?: number;
  total?: number;
  result?: R;
  error?: string;
}

export async function batchProcessWithSSE<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  sendEvent: (event: SSEEvent<R>) => void,
  options: Omit<BatchOptions, "concurrency"> = {},
): Promise<R[]> {
  const { retries = 3, retryDelay = 1000 } = options;
  const results: R[] = [];

  for (let i = 0; i < items.length; i++) {
    sendEvent({ type: "progress", index: i, total: items.length });
    let lastError: unknown;
    let success = false;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await processor(items[i]);
        results.push(result);
        sendEvent({ type: "result", index: i, result });
        success = true;
        break;
      } catch (err) {
        lastError = err;
        if (isRateLimitError(err) && attempt < retries) {
          await new Promise((r) => setTimeout(r, retryDelay * Math.pow(2, attempt)));
          continue;
        }
      }
    }

    if (!success) {
      const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
      sendEvent({ type: "error", index: i, error: errMsg });
    }
  }

  sendEvent({ type: "done" });
  return results;
}

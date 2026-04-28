// ─────────────────────────────────────────────────────────────────────────────
// Bulk async with a concurrency cap.
// AI Ark constraint (learnings.md): never exceed 3 concurrent — 429 blocks
// persist 30-60 minutes once triggered.
// ─────────────────────────────────────────────────────────────────────────────

export async function withConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

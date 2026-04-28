/**
 * Snapshot an orchestrator run + all child runs into cached-run/<runId>/.
 * Used to capture replay data for lesson rehearsal.
 *
 * Usage:
 *   npx tsx scripts/snapshot-run.ts <orchestrator-run-id>
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const runId  = process.argv[2];
const secret = process.env.TRIGGER_SECRET_KEY;

if (!runId)  { console.error("usage: snapshot-run.ts <run_id>"); process.exit(1); }
if (!secret) { console.error("missing TRIGGER_SECRET_KEY"); process.exit(1); }

interface RunDetail {
  id: string;
  taskIdentifier: string;
  status: string;
  durationMs?: number;
  payload?: unknown;
  output?: unknown;
  error?: unknown;
  relatedRuns?: { children?: Array<{ id: string; taskIdentifier: string }> };
}

async function fetchRun(id: string): Promise<RunDetail> {
  const r = await fetch(`https://api.trigger.dev/api/v3/runs/${id}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!r.ok) throw new Error(`fetch ${id} failed: ${r.status}`);
  return (await r.json()) as RunDetail;
}

async function main() {
  console.log(`fetching orchestrator ${runId}…`);
  const orch = await fetchRun(runId);

  const outDir = path.join(process.cwd(), "cached-run", runId);
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, "00-orchestrator.json"), JSON.stringify(orch, null, 2));
  console.log(`  saved 00-orchestrator.json`);

  const children = orch.relatedRuns?.children ?? [];
  console.log(`fetching ${children.length} child runs…`);

  // Order children by task identifier so the file numbering matches the pipeline order.
  const order = [
    "scrape-post",
    "headline-filter",
    "hard-filters",
    "dedup-check",
    "enrich-leads",
    "icp-scoring",
    "generate-copy",
    "stage-revyops",
    "push-instantly",
  ];
  const sorted = [...children].sort(
    (a, b) => order.indexOf(a.taskIdentifier) - order.indexOf(b.taskIdentifier),
  );

  let i = 1;
  for (const child of sorted) {
    const detail = await fetchRun(child.id);
    const filename = `${String(i).padStart(2, "0")}-${child.taskIdentifier}.json`;
    fs.writeFileSync(path.join(outDir, filename), JSON.stringify(detail, null, 2));
    console.log(`  saved ${filename}  (${detail.status}, ${detail.durationMs ?? 0}ms)`);
    i++;
  }

  console.log(`\n✅ snapshot saved to: ${outDir}`);
}

main().catch((err) => {
  console.error("✗", err);
  process.exit(1);
});

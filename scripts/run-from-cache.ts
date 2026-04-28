/**
 * Re-run scoring/copy/stage/push against a previously enriched run, skipping
 * stages 1-5. Saves Apify + LeadMagic + AI Ark + Exa cost when iterating on
 * scoring or copy prompts.
 *
 * Usage:
 *   npx tsx scripts/run-from-cache.ts <orchestrator-run-id> [--dry-run]
 *
 * Reads:  cached-run/<run-id>/05-enrich-leads.json
 * Fires: orchestrator with `cachedEnriched` set
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { tasks } from "@trigger.dev/sdk/v3";

const runId  = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!runId) {
  console.error("usage: npx tsx scripts/run-from-cache.ts <run-id> [--dry-run]");
  process.exit(1);
}

const cachePath = path.join(process.cwd(), "cached-run", runId, "05-enrich-leads.json");
if (!fs.existsSync(cachePath)) {
  console.error(`✗ no cache at ${cachePath}`);
  process.exit(1);
}

interface RunFile {
  output?: { enriched: unknown[]; emailFound: number };
  outputPresignedUrl?: string;
}

const enrichTask = JSON.parse(fs.readFileSync(cachePath, "utf8")) as RunFile;

async function loadEnriched(): Promise<{ enriched: unknown[]; emailFound: number }> {
  if (enrichTask.output) return enrichTask.output;
  if (!enrichTask.outputPresignedUrl) {
    throw new Error("cached run has neither inline output nor presigned URL");
  }
  const r = await fetch(enrichTask.outputPresignedUrl);
  if (!r.ok) throw new Error(`presigned fetch failed: ${r.status}`);
  // Trigger.dev wraps outputs in SuperJSON form: { json: {...}, meta: {...} }.
  const wrapper = (await r.json()) as { json?: { enriched: unknown[]; emailFound: number } };
  if (!wrapper.json) throw new Error("presigned output missing `.json` wrapper");
  return wrapper.json;
}

(async () => {
  const out = await loadEnriched();
  console.log(`📦 loaded ${out.enriched.length} enriched leads (${out.emailFound} with email) from ${runId}`);
  console.log(`🔁 firing orchestrator with cachedEnriched + dryRun=${dryRun}`);

  const handle = await tasks.trigger("orchestrator", {
    postUrl:        `cache:${runId}`,
    cachedEnriched: out.enriched,
    dryRun,
    slackChannel:   process.env.SLACK_NOTIFY_CHANNEL,
  });
  console.log(`\n✅ Triggered  run id: ${handle.id}`);
  console.log(`   Watch:  https://cloud.trigger.dev/runs/${handle.id}`);
})();

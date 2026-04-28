/**
 * Trigger a one-shot test run of the Session 5 orchestrator.
 * Requires `npm run dev` to be running so the local task is registered.
 *
 * Usage:
 *   npx tsx scripts/run-test.ts <linkedin-post-url> [--no-dry] [--max=N]
 *
 * Defaults to: dryRun=true, maxReactions=20, maxComments=0 (reactions only).
 */

import "dotenv/config";
import { tasks } from "@trigger.dev/sdk/v3";

async function main() {
  const args = process.argv.slice(2);
  const postUrl = args.find((a) => a.startsWith("http"));
  const noDry   = args.includes("--no-dry");
  const maxArg  = args.find((a) => a.startsWith("--max="));
  const max     = maxArg ? parseInt(maxArg.split("=")[1], 10) : 20;

  if (!postUrl) {
    console.error("usage: npx tsx scripts/run-test.ts <linkedin-post-url> [--no-dry] [--max=N]");
    process.exit(1);
  }

  const payload = {
    postUrl,
    maxReactions: max,
    maxComments:  0,
    dryRun:       !noDry,
    slackChannel: process.env.SLACK_NOTIFY_CHANNEL,
  };

  console.log("\n🚀 Triggering orchestrator…");
  console.log("   Payload:", payload);

  const handle = await tasks.trigger("orchestrator", payload);

  console.log("\n✅ Triggered");
  console.log(`   Run ID: ${handle.id}`);
  console.log(`   Watch:  https://cloud.trigger.dev/runs/${handle.id}`);
}

main().catch((err) => {
  console.error("✗", err);
  process.exit(1);
});

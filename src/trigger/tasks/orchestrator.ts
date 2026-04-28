import { task, logger } from "@trigger.dev/sdk/v3";
import { scrapePost }       from "./01-scrape-post";
import { headlineFilter }   from "./02-headline-filter";
import { hardFilters }      from "./03-hard-filters";
import { dedupCheck }       from "./04-dedup-check";
import { enrichLeads }      from "./05-enrich-leads";
import { icpScoring }       from "./06-icp-scoring";
import { generateCopyTask } from "./07-generate-copy";
import { stageRevyOps }     from "./08-stage-revyops";
import { pushInstantly }    from "./09-push-instantly";
import { postSlackMessage } from "../lib/slack";
import type { PipelineInput, PipelineSummary } from "../types";

/**
 * Wires all 9 tasks together. Triggered by n8n via REST.
 * Posts a summary to Slack at the end via bot token (no callback to n8n).
 */
export const orchestrator = task({
  id: "orchestrator",
  maxDuration: 3600,
  run: async (payload: PipelineInput): Promise<PipelineSummary> => {
    const campaignId = process.env.INSTANTLY_CAMPAIGN_ID ?? "";
    if (!campaignId && !payload.dryRun) {
      throw new Error("INSTANTLY_CAMPAIGN_ID env var is required (or use dryRun: true)");
    }

    const pipelineRunId = `run_${Date.now()}`;
    const fromCache = (payload.cachedEnriched?.length ?? 0) > 0;
    logger.log("orchestrator start", {
      postUrl: payload.postUrl,
      pipelineRunId,
      fromCache,
      cachedCount: payload.cachedEnriched?.length ?? 0,
    });

    let scrapedCount        = 0;
    let passedHeadlineCount = 0;
    let passedFiltersCount  = 0;
    let newAfterDedupCount  = 0;
    let r5_enriched: typeof payload.cachedEnriched extends infer T ? T : never;
    let emailFoundCount     = 0;

    if (fromCache) {
      // Test-only path: skip stages 1-5, start from the supplied enriched array.
      const cached = payload.cachedEnriched!;
      r5_enriched          = cached as typeof r5_enriched;
      emailFoundCount      = cached.filter((p) => p.email).length;
      scrapedCount         = cached.length;
      passedHeadlineCount  = cached.length;
      passedFiltersCount   = cached.length;
      newAfterDedupCount   = cached.length;
    } else {
      // 1. Scrape
      const r1 = await scrapePost.triggerAndWait({
        postUrl: payload.postUrl,
        maxReactions: payload.maxReactions,
        maxComments: payload.maxComments,
      }).unwrap();
      scrapedCount = r1.stats.deduped;

      // 2. Headline filter
      const r2 = await headlineFilter.triggerAndWait({ persons: r1.persons }).unwrap();
      passedHeadlineCount = r2.passed.length;

      // 3. Hard filters
      const r3 = await hardFilters.triggerAndWait({ persons: r2.passed }).unwrap();
      passedFiltersCount = r3.passed.length;

      // 4. Dedup check
      const r4 = await dedupCheck.triggerAndWait({ persons: r3.passed }).unwrap();
      newAfterDedupCount = r4.newPersons.length;

      // 5. Enrich
      const r5 = await enrichLeads.triggerAndWait({ persons: r4.newPersons }).unwrap();
      r5_enriched     = r5.enriched as typeof r5_enriched;
      emailFoundCount = r5.emailFound;
    }

    // 6. ICP scoring
    const r6 = await icpScoring.triggerAndWait({ persons: r5_enriched as never }).unwrap();

    // 7. Copy generation
    const r7 = await generateCopyTask.triggerAndWait({
      persons: r6.scored,
      pipelineRunId,
    }).unwrap();

    // 8. Stage to RevyOps
    const r8 = await stageRevyOps.triggerAndWait({ leads: r7.leads }).unwrap();

    // 9. Push to Instantly
    const r9 = await pushInstantly.triggerAndWait({
      leads: r8.leads,
      campaignId,
      dryRun: payload.dryRun,
    }).unwrap();

    const summary: PipelineSummary = {
      postUrl:           payload.postUrl,
      scraped:           scrapedCount,
      passedHeadline:    passedHeadlineCount,
      passedHardFilters: passedFiltersCount,
      newAfterDedup:     newAfterDedupCount,
      enriched:          (r5_enriched as Array<unknown>).length,
      emailFound:        emailFoundCount,
      scoredTier1or2:    r6.scored.filter((s) => s.tier === 1 || s.tier === 2).length,
      pushedToInstantly: r9.added,
      campaignId,
    };

    logger.log("orchestrator complete", { ...summary });

    if (payload.slackChannel || process.env.SLACK_NOTIFY_CHANNEL) {
      const channel = payload.slackChannel ?? process.env.SLACK_NOTIFY_CHANNEL!;
      const text = formatSlackSummary(summary, r9.skipped);
      await postSlackMessage(channel, text).catch((err) => {
        logger.error("slack post failed", { err: String(err) });
      });
    }

    return summary;
  },
});

function formatSlackSummary(s: PipelineSummary, dryRun: boolean): string {
  const dryTag = dryRun ? " *(DRY RUN — no Instantly push)*" : "";
  return [
    `✅ */engage* pipeline complete${dryTag}`,
    `Post: ${s.postUrl}`,
    "",
    `• Scraped:          ${s.scraped}`,
    `• Passed headline:  ${s.passedHeadline}`,
    `• Passed filters:   ${s.passedHardFilters}`,
    `• New (post-dedup): ${s.newAfterDedup}`,
    `• Enriched:         ${s.enriched}  (email found: ${s.emailFound})`,
    `• Tier 1/2:         ${s.scoredTier1or2}`,
    `• Pushed:           ${s.pushedToInstantly}`,
    "",
    `Campaign: https://app.instantly.ai/app/campaign/${s.campaignId}/`,
  ].join("\n");
}

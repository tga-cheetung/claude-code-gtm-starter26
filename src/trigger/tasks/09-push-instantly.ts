import { task, logger } from "@trigger.dev/sdk/v3";
import { pushLeadsToCampaign, type InstantlyLeadInput } from "../lib/instantly";
import type { Lead } from "../types";

interface PushInput {
  leads: Lead[];
  campaignId: string;
  dryRun?: boolean;
}

interface PushOutput {
  added: number;
  patched: number;
  skipped: boolean;
  campaignId: string;
}

/**
 * Bulk imports leads into the Instantly campaign, then PATCHes each one
 * to attach subject + email_body custom variables. Two-step is required —
 * /leads/add silently drops customVariables on first import (learnings.md).
 *
 * Honors dryRun by short-circuiting before any Instantly call.
 */
export const pushInstantly = task({
  id: "push-instantly",
  maxDuration: 600,
  run: async (payload: PushInput): Promise<PushOutput> => {
    if (payload.dryRun) {
      logger.log("DRY RUN — skipping Instantly push", { wouldPush: payload.leads.length });
      return { added: 0, patched: 0, skipped: true, campaignId: payload.campaignId };
    }

    const instantlyLeads: InstantlyLeadInput[] = payload.leads.map((l) => ({
      email:       l.email!,
      firstName:   l.firstName,
      lastName:    l.lastName,
      companyName: l.companyName,
      customVariables: {
        subject:       l.subject,
        email_body:    l.emailBody,
        linkedin_dm:   l.linkedinDm,
        context_score: l.contextScore,
      },
    }));

    const { added, patched } = await pushLeadsToCampaign(payload.campaignId, instantlyLeads);
    logger.log("instantly push complete", { added, patched });
    return { added, patched, skipped: false, campaignId: payload.campaignId };
  },
});

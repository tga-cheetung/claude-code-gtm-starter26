import { task, logger } from "@trigger.dev/sdk/v3";
import { stageContact } from "../lib/revyops";
import type { Lead } from "../types";

interface StageInput {
  leads: Lead[];
}

interface StageOutput {
  leads: Lead[];
  staged: number;
}

/**
 * Records every lead in RevyOps master list. Sequential to keep load light
 * and writes ordered. Pass-through: emits the same leads unchanged so the
 * next task (push-instantly) can consume them.
 */
export const stageRevyOps = task({
  id: "stage-revyops",
  maxDuration: 600,
  run: async (payload: StageInput): Promise<StageOutput> => {
    let staged = 0;
    for (const lead of payload.leads) {
      await stageContact({
        linkedinUrl:   lead.linkedinUrl,
        firstName:     lead.firstName,
        lastName:      lead.lastName,
        email:         lead.email,
        companyName:   lead.companyName,
        companyDomain: lead.companyDomain,
        headline:      lead.headline,
        source:        "linkedin-post-engager",
        tier:          lead.tier,
        pipelineRunId: lead.pipelineRunId,
      });
      staged++;
    }

    logger.log("revyops staging complete", { staged });
    return { leads: payload.leads, staged };
  },
});

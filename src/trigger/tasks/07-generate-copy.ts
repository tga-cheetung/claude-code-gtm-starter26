import { task, logger } from "@trigger.dev/sdk/v3";
import { generateCopy, assembleEmailBody } from "../lib/openai";
import { withConcurrency } from "../lib/concurrent";
import type { ScoredPerson, Lead } from "../types";

interface CopyInput {
  persons: ScoredPerson[];
  pipelineRunId: string;
}

interface CopyOutput {
  leads: Lead[];
  skipped: number;
}

/**
 * Per-lead AI copy at runtime. No approval gate — writes and ships.
 * Skips leads without an email since we have nowhere to send to.
 */
export const generateCopyTask = task({
  id: "generate-copy",
  maxDuration: 900,
  run: async (payload: CopyInput): Promise<CopyOutput> => {
    const withEmails = payload.persons.filter((p) => p.email);
    const skipped = payload.persons.length - withEmails.length;

    const leads = await withConcurrency(withEmails, 5, async (person) => {
      const copy = await generateCopy(person);
      const lead: Lead = {
        ...person,
        subject:    copy.subject,
        hook:       copy.hook,
        body:       copy.body,
        valueProp:  copy.valueProp,
        cta:        copy.cta,
        ps:         copy.ps,
        linkedinDm: copy.linkedinDm,
        emailBody:  assembleEmailBody(copy),
        pipelineRunId: payload.pipelineRunId,
      };
      return lead;
    });

    logger.log("copy complete", { in: payload.persons.length, generated: leads.length, skipped });
    return { leads, skipped };
  },
});

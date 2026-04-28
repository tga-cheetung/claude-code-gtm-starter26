import { task, logger } from "@trigger.dev/sdk/v3";
import { enrichWithLeadMagic } from "../lib/leadmagic";
import { enrichWithAiArk } from "../lib/ai-ark";
import { fetchExaContext } from "../lib/exa";
import { withConcurrency } from "../lib/concurrent";
import type { DedupedPerson, EnrichedPerson } from "../types";

interface EnrichInput {
  persons: DedupedPerson[];
}

interface EnrichOutput {
  enriched: EnrichedPerson[];
  emailFound: number;
}

/**
 * Enrichment waterfall: LeadMagic primary, AI Ark fallback if no email.
 * Exa runs in parallel for context — used by scoring + copy regardless of
 * whether email was found.
 *
 * Concurrency = 3 (AI Ark constraint per learnings.md).
 */
export const enrichLeads = task({
  id: "enrich-leads",
  maxDuration: 1200,
  run: async (payload: EnrichInput): Promise<EnrichOutput> => {
    let emailFound = 0;

    const enriched = await withConcurrency(payload.persons, 3, async (person) => {
      const lm = await enrichWithLeadMagic(person.linkedinUrl, person.firstName, person.lastName);

      let email     = lm?.email;
      let emailSrc: EnrichedPerson["emailSource"] = lm?.email ? "leadmagic" : undefined;
      let emailStat = lm?.emailStatus;

      if (!email) {
        const ai = await enrichWithAiArk(person.linkedinUrl);
        if (ai?.email) {
          email     = ai.email;
          emailSrc  = "ai-ark";
          emailStat = ai.emailStatus;
        }
      }

      if (email) emailFound++;

      const exa = await fetchExaContext(person.name, lm?.companyName).catch(() => null);

      const result: EnrichedPerson = {
        ...person,
        email,
        emailSource:        emailSrc,
        emailStatus:        emailStat,
        companyName:        lm?.companyName,
        companyDomain:      lm?.companyDomain,
        companyLinkedinUrl: lm?.companyLinkedinUrl,
        employeeCount:      lm?.employeeCount,
        exaSummary:         exa?.summary,
        exaSignals:         exa?.signals,
      };
      return result;
    });

    logger.log("enrichment complete", { in: payload.persons.length, emailFound });
    return { enriched, emailFound };
  },
});

import { task, logger } from "@trigger.dev/sdk/v3";
import { scoreIcp } from "../lib/openai";
import { withConcurrency } from "../lib/concurrent";
import type { EnrichedPerson, ScoredPerson } from "../types";

interface ScoringInput {
  persons: EnrichedPerson[];
}

interface ScoringOutput {
  scored: ScoredPerson[];
  qualified: number;
  skipped: number;
}

/**
 * Post-enrichment scoring. Drops tier "skip" — keeps tier 1, 2, 3.
 * Tier 3 still gets pushed but copy will reference low context.
 */
export const icpScoring = task({
  id: "icp-scoring",
  maxDuration: 600,
  run: async (payload: ScoringInput): Promise<ScoringOutput> => {
    const results = await withConcurrency(payload.persons, 5, async (person) => {
      const score = await scoreIcp(person);
      return { ...person, ...score } as ScoredPerson;
    });

    const scored = results.filter((p) => p.tier !== "skip");
    const skipped = results.length - scored.length;

    logger.log("scoring complete", {
      in: payload.persons.length,
      qualified: scored.length,
      skipped,
      tierBreakdown: {
        tier1: scored.filter((s) => s.tier === 1).length,
        tier2: scored.filter((s) => s.tier === 2).length,
        tier3: scored.filter((s) => s.tier === 3).length,
      },
    });

    return { scored, qualified: scored.length, skipped };
  },
});

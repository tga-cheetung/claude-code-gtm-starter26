import { task, logger } from "@trigger.dev/sdk/v3";
import { SKIP_INDUSTRIES } from "../config";
import type { FilteredPerson, HardFilteredPerson } from "../types";

interface HardFiltersInput {
  persons: FilteredPerson[];
}

interface HardFiltersOutput {
  passed: HardFilteredPerson[];
  dropped: number;
}

/**
 * Pre-enrichment hard filters. Operates on what we know from the headline
 * alone — geo and B2B confirmation happen post-enrichment if needed.
 */
export const hardFilters = task({
  id: "hard-filters",
  maxDuration: 60,
  run: async (payload: HardFiltersInput): Promise<HardFiltersOutput> => {
    const passed: HardFilteredPerson[] = [];
    let dropped = 0;

    for (const person of payload.persons) {
      const headline = (person.headline ?? "").toLowerCase();

      const industryMatch = SKIP_INDUSTRIES.find((ind) => headline.includes(ind));
      if (industryMatch) {
        dropped++;
        continue;
      }

      passed.push({
        ...person,
        hardFilterReason: "passed industry skip",
      });
    }

    logger.log("hard filters complete", { in: payload.persons.length, passed: passed.length, dropped });
    return { passed, dropped };
  },
});

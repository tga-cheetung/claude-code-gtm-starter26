import { task, logger } from "@trigger.dev/sdk/v3";
import { isInRevyOps } from "../lib/revyops";
import { withConcurrency } from "../lib/concurrent";
import type { HardFilteredPerson, DedupedPerson } from "../types";

interface DedupCheckInput {
  persons: HardFilteredPerson[];
}

interface DedupCheckOutput {
  newPersons: DedupedPerson[];
  existing: number;
}

export const dedupCheck = task({
  id: "dedup-check",
  maxDuration: 300,
  run: async (payload: DedupCheckInput): Promise<DedupCheckOutput> => {
    const checks = await withConcurrency(payload.persons, 5, async (person) => {
      const exists = await isInRevyOps(person.linkedinUrl);
      return { person, exists };
    });

    const newPersons: DedupedPerson[] = [];
    let existing = 0;

    for (const { person, exists } of checks) {
      if (exists) {
        existing++;
        continue;
      }
      newPersons.push({ ...person, revyopsChecked: true });
    }

    logger.log("dedup complete", { in: payload.persons.length, new: newPersons.length, existing });
    return { newPersons, existing };
  },
});

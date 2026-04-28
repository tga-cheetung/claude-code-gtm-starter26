import { task, logger } from "@trigger.dev/sdk/v3";
import { SKIP_TITLES, classifyTitleRole } from "../config";
import type { RawPerson, FilteredPerson } from "../types";

interface HeadlineFilterInput {
  persons: RawPerson[];
}

interface HeadlineFilterOutput {
  passed: FilteredPerson[];
  dropped: number;
}

export const headlineFilter = task({
  id: "headline-filter",
  maxDuration: 60,
  run: async (payload: HeadlineFilterInput): Promise<HeadlineFilterOutput> => {
    const passed: FilteredPerson[] = [];
    let dropped = 0;

    for (const person of payload.persons) {
      const headline = (person.headline ?? "").toLowerCase();

      const skipMatch = SKIP_TITLES.find((s) => headline.includes(s));
      if (skipMatch) {
        dropped++;
        continue;
      }

      const role = classifyTitleRole(person.headline ?? "");
      if (!role) {
        dropped++;
        continue;
      }

      passed.push({
        ...person,
        titleRole:    role,
        filterReason: `matched role: ${role}`,
      });
    }

    logger.log("headline filter complete", { in: payload.persons.length, passed: passed.length, dropped });
    return { passed, dropped };
  },
});

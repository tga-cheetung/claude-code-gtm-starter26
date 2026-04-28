import { task, logger } from "@trigger.dev/sdk/v3";
import { scrapeReactions, scrapeComments, resolveAcoaaaUrls } from "../lib/apify";
import type { RawPerson } from "../types";

interface ScrapeInput {
  postUrl: string;
  maxReactions?: number;
  maxComments?: number;
}

interface ScrapeOutput {
  persons: RawPerson[];
  stats: {
    reactions: number;
    comments: number;
    deduped: number;
    resolvedAcoaaa: number;
  };
}

const isCompanyUrl = (url: string) => url.includes("/company/");
const isAcoaaa     = (url: string) => /\/in\/ACoAA/i.test(url);

export const scrapePost = task({
  id: "scrape-post",
  maxDuration: 600,
  run: async (payload: ScrapeInput): Promise<ScrapeOutput> => {
    logger.log("scraping post", {
      postUrl: payload.postUrl,
      maxReactions: payload.maxReactions ?? "default",
      maxComments: payload.maxComments ?? "default",
    });

    const [reactions, comments] = await Promise.all([
      scrapeReactions(payload.postUrl, payload.maxReactions),
      scrapeComments(payload.postUrl, payload.maxComments),
    ]);

    logger.log("raw scrape", { reactions: reactions.length, comments: comments.length });

    const byKey = new Map<string, RawPerson>();

    // Reactions — no author flag, no type field. Companies show up as /company/ URLs.
    for (const r of reactions) {
      const a = r.actor;
      const url = a.linkedinUrl ?? "";
      if (!a.name || !url) continue;
      if (isCompanyUrl(url)) continue;

      const key = a.name.trim().toLowerCase();
      const existing = byKey.get(key);
      // Prefer vanity URL over ACoAAA when we have both
      if (existing && !isAcoaaa(existing.linkedinUrl)) continue;

      byKey.set(key, {
        linkedinUrl:    url,
        name:           a.name.trim(),
        firstName:      a.firstName?.trim() ?? a.name.split(" ")[0] ?? "",
        lastName:       a.lastName?.trim() ?? a.name.split(" ").slice(1).join(" "),
        headline:       a.position?.trim() ?? "",
        engagementType: ((a.reactionType ?? "like").toLowerCase() as RawPerson["engagementType"]),
        sourcePostUrl:  payload.postUrl,
      });
    }

    // Comments — has author flag and type === "company" for company pages.
    for (const c of comments) {
      const a = c.actor;
      const url = a.linkedinUrl ?? "";
      if (!a.name || !url) continue;
      if (a.type === "company" || isCompanyUrl(url)) continue;
      if (a.author === true) continue; // post author commenting on own post

      const key = a.name.trim().toLowerCase();
      const existing = byKey.get(key);
      // Comments give vanity URLs — always prefer over reactions' ACoAAA.
      if (existing && !isAcoaaa(existing.linkedinUrl) && !c.commentText) continue;

      byKey.set(key, {
        linkedinUrl:    url,
        name:           a.name.trim(),
        firstName:      a.firstName?.trim() ?? a.name.split(" ")[0] ?? "",
        lastName:       a.lastName?.trim() ?? a.name.split(" ").slice(1).join(" "),
        headline:       a.position?.trim() ?? existing?.headline ?? "",
        engagementType: existing?.engagementType ?? "comment",
        commentText:    c.commentText,
        sourcePostUrl:  payload.postUrl,
      });
    }

    const deduped = Array.from(byKey.values());

    // Resolve ACoAAA URLs to vanity slugs (LeadMagic + AI Ark cannot enrich ACoAAA).
    const acoaaaUrls = deduped.filter((p) => isAcoaaa(p.linkedinUrl)).map((p) => p.linkedinUrl);
    const resolutionMap = await resolveAcoaaaUrls(acoaaaUrls);

    let resolvedCount = 0;
    const persons = deduped.map((p) => {
      const vanity = resolutionMap.get(p.linkedinUrl);
      if (vanity) {
        resolvedCount++;
        return { ...p, linkedinUrl: vanity };
      }
      return p;
    });

    logger.log("scrape complete", {
      reactions: reactions.length,
      comments: comments.length,
      deduped: persons.length,
      resolvedAcoaaa: resolvedCount,
    });

    return {
      persons,
      stats: {
        reactions: reactions.length,
        comments: comments.length,
        deduped: persons.length,
        resolvedAcoaaa: resolvedCount,
      },
    };
  },
});

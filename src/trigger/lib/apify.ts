// ─────────────────────────────────────────────────────────────────────────────
// Apify wrapper — replaces the Apify MCP we used in Sessions 1-2.
// Three actors: post-reactions, post-comments, profile-scraper (for ACoAAA).
// ─────────────────────────────────────────────────────────────────────────────

import { ApifyClient } from "apify-client";
import {
  APIFY_REACTIONS_ACTOR,
  APIFY_COMMENTS_ACTOR,
  APIFY_PROFILE_SCRAPER,
  MAX_REACTIONS,
  MAX_COMMENTS,
} from "../config";

const client = () => new ApifyClient({ token: process.env.APIFY_API_KEY });

interface ApifyActorPerson {
  name?: string;
  firstName?: string;
  lastName?: string;
  position?: string;     // headline lives here, not in `headline`
  linkedinUrl?: string;
  type?: string;         // 'profile' | 'company'
  id?: string | null;
  author?: boolean;
  reactionType?: string;
}

interface ApifyReaction {
  actor: ApifyActorPerson;
}

interface ApifyComment {
  actor: ApifyActorPerson;
  commentText?: string;
}

export async function scrapeReactions(postUrl: string, max?: number): Promise<ApifyReaction[]> {
  // HarvestAPI input shape: `posts` (NOT postUrls), `maxItems`, `profileScraperMode`.
  const run = await client()
    .actor(APIFY_REACTIONS_ACTOR)
    .call({
      posts: [postUrl],
      maxItems: max ?? MAX_REACTIONS,
      profileScraperMode: "short",
    });
  const { items } = await client().dataset(run.defaultDatasetId).listItems();
  return items as unknown as ApifyReaction[];
}

export async function scrapeComments(postUrl: string, max?: number): Promise<ApifyComment[]> {
  const limit = max ?? MAX_COMMENTS;
  if (limit <= 0) return []; // explicit skip
  const run = await client()
    .actor(APIFY_COMMENTS_ACTOR)
    .call({
      posts: [postUrl],
      maxItems: limit,
      profileScraperMode: "short",
      scrapeReplies: false, // see learnings.md — replies inflate dataset
    });
  const { items } = await client().dataset(run.defaultDatasetId).listItems();
  return items as unknown as ApifyComment[];
}

interface ProfileScraperItem {
  originalQuery?: { url: string };
  publicIdentifier?: string;
  linkedinUrl?: string;
}

/**
 * Resolves ACoAAA LinkedIn URLs to their vanity slug equivalents.
 * The reactions actor returns internal IDs (/in/ACoAAA...) that LeadMagic
 * and AI Ark cannot enrich. This actor accepts ACoAAA URLs directly and
 * returns the canonical /in/firstname-lastname URL.
 */
export async function resolveAcoaaaUrls(acoaaaUrls: string[]): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  if (acoaaaUrls.length === 0) return resolved;

  const run = await client()
    .actor(APIFY_PROFILE_SCRAPER)
    .call({
      urls: acoaaaUrls,
      profileScraperMode: "Profile details no email ($4 per 1k)",
    });
  const { items } = await client().dataset(run.defaultDatasetId).listItems();

  for (const raw of items as unknown as ProfileScraperItem[]) {
    const original = raw.originalQuery?.url;
    const vanity = raw.linkedinUrl;
    if (original && vanity) resolved.set(original, vanity);
  }
  return resolved;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session 5 — Pipeline Configuration
// All non-secret config + ICP rules live here. Secrets live in .env.
// ─────────────────────────────────────────────────────────────────────────────

// ── Apify ────────────────────────────────────────────────────────────────────
// HarvestAPI/linkedin-post-reactions  — reactions on a specific post.
// HarvestAPI/linkedin-post-comments   — comments on a specific post.
// HarvestAPI/linkedin-profile-scraper — resolves ACoAAA URLs to vanity slugs.
export const APIFY_REACTIONS_ACTOR = "harvestapi~linkedin-post-reactions";
export const APIFY_COMMENTS_ACTOR  = "harvestapi~linkedin-post-comments";
export const APIFY_PROFILE_SCRAPER = "harvestapi~linkedin-profile-scraper";

export const MAX_REACTIONS = 500;
export const MAX_COMMENTS  = 200;

// ── Enrichment waterfall ─────────────────────────────────────────────────────
// LeadMagic (profile-find + email-finder) → AI Ark (single export) → Exa (context)
// Stop at first email hit; Exa runs separately for context, not as a fallback.
export const LEADMAGIC_API_URL = "https://api.leadmagic.io";
export const AIARK_API_URL     = "https://api.ai-ark.com/api/developer-portal";
export const EXA_API_URL       = "https://api.exa.ai";

// ── RevyOps ──────────────────────────────────────────────────────────────────
// Master key required. Base URL is app.revyops.com (api.revyops.com is NXDOMAIN).
export const REVYOPS_API_URL = "https://app.revyops.com/api/public";

// ── Instantly ────────────────────────────────────────────────────────────────
// Campaign ID is env-driven so students can swap in their own.
// America/Los_Angeles is INVALID — use America/Dawson (Pacific equivalent).
export const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

// ── OpenAI ───────────────────────────────────────────────────────────────────
export const OPENAI_SCORING_MODEL = "gpt-4o-mini";
export const OPENAI_COPY_MODEL    = "gpt-4o-mini";

// ── ICP title filter — pass list ─────────────────────────────────────────────
export const ICP_TITLES = [
  "founder", "co-founder", "cofounder",
  "ceo", "chief executive",
  "cto", "chief technology",
  "coo", "chief operating",
  "cro", "chief revenue",
  "cmo", "chief marketing",
  "vp", "vice president",
  "head of", "director of",
  "director",
  "revenue operations", "revops", "rev ops",
  "owner", "president",
  "managing partner", "general manager",
];

// ── ICP title filter — skip list (checked BEFORE pass list) ──────────────────
export const SKIP_TITLES = [
  // Recruiters
  "recruiter", "recruiting", "talent acquisition",
  "head of hr", "head of people", "head of talent",
  // Coaches / educators
  "coach", "coaching", "mentor",
  // Agencies (not the right buyer)
  "lead generation", "lead gen",
  "cold email", "cold outreach",
  "outbound agency", "ai agency", "automation agency",
  "book meetings", "appointment setting",
  // Non-ICP roles
  "consultant", "consulting", "freelance",
  "student", "intern", "trainee",
];

// ── Industry skip list ───────────────────────────────────────────────────────
export const SKIP_INDUSTRIES = [
  "healthcare", "medical", "pharma",
  "nonprofit", "non-profit",
  "government", "public sector",
  "education", "k-12", "university",
  "consumer", "b2c", "d2c", "e-commerce",
  "crypto", "web3", "blockchain",
];

// ── Title role classifier ────────────────────────────────────────────────────
export function classifyTitleRole(headline: string): string | null {
  const h = headline.toLowerCase();
  if (h.includes("founder") || h.includes("co-founder") || h.includes("cofounder")) return "founder";
  if (h.includes("ceo") || h.includes("chief executive")) return "ceo";
  if (h.includes("cto") || h.includes("chief technology")) return "cto";
  if (h.includes("cro") || h.includes("chief revenue")) return "cro";
  if (h.includes("cmo") || h.includes("chief marketing")) return "cmo";
  if (h.includes("coo") || h.includes("chief operating")) return "coo";
  if (h.includes("vp ") || h.includes("vice president")) return "vp";
  if (h.includes("head of")) return "head_of";
  if (h.includes("director")) return "director";
  if (h.includes("owner")) return "owner";
  if (h.includes("president") && !h.includes("vice")) return "president";
  if (h.includes("managing partner") || h.includes("general manager")) return "gm";
  return null;
}

// ── Firm context for ICP scoring + copy ──────────────────────────────────────
// Passed to OpenAI as system context. Edit every field to match your business
// before running the pipeline — defaults are deliberately generic placeholders.
export const FIRM_CONTEXT = {
  valueProposition:
    "TODO: one-sentence pitch — what you sell, who it's for, what makes it different.",
  icp:
    "TODO: who buys this — role, company stage, vertical. Be specific. The LLM uses this to decide tier 1 / 2 / 3 / skip.",
  painSignals: [
    "TODO: signal #1 — something an ICP-fit prospect would post or comment about",
    "TODO: signal #2",
    "TODO: signal #3",
  ],
  copyAngles: [
    "TODO: copy angle #1 — how you frame the offer in cold outreach",
    "TODO: copy angle #2",
    "TODO: copy angle #3",
  ],
};

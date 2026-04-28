// ─────────────────────────────────────────────────────────────────────────────
// Session 5 — Pipeline Type Definitions
// Each task takes one of these shapes as input and returns the next.
// ─────────────────────────────────────────────────────────────────────────────

// Raw person from Apify reactions or comments scrape (after dedup + ACoAAA resolution)
export interface RawPerson {
  linkedinUrl:    string; // vanity slug, never ACoAAA
  name:           string;
  firstName:      string;
  lastName:       string;
  headline:       string;
  engagementType: "like" | "comment" | "celebrate" | "support" | "insightful" | "funny" | "love";
  commentText?:   string;
  sourcePostUrl:  string;
}

// After headline ICP filter (pass + skip lists, role classification)
export interface FilteredPerson extends RawPerson {
  titleRole:    string;
  filterReason: string;
}

// After hard filters (geo, B2B, industry skip)
export interface HardFilteredPerson extends FilteredPerson {
  hardFilterReason: string;
}

// After RevyOps dedup check — leads already in pipeline are dropped before this stage
export interface DedupedPerson extends HardFilteredPerson {
  revyopsChecked: true;
}

// After LeadMagic + AI Ark + Exa enrichment
export interface EnrichedPerson extends DedupedPerson {
  email?:              string;
  emailSource?:        "leadmagic" | "ai-ark";
  emailStatus?:        "valid" | "catch_all" | "invalid" | "unknown";
  companyName?:        string;
  companyDomain?:      string;
  companyLinkedinUrl?: string;
  employeeCount?:      string;
  exaSummary?:         string;
  exaSignals?:         string[];
}

// After OpenAI ICP scoring (post-enrichment pass/fail)
export interface ScoredPerson extends EnrichedPerson {
  tier:        1 | 2 | 3 | "skip";
  icpScore:    number; // 0-100
  scoreReason: string;
  vertical:    string; // 'vertical_saas' | 'b2b_services' | 'dev_tools' | 'horizontal_saas' | 'other'
  confidence:  "high" | "medium" | "low";
  contextScore: "high" | "medium" | "low"; // from Exa results
}

// After OpenAI copy generation. Structured fields kept for observability;
// `emailBody` is the collapsed string we actually send to Instantly.
// (Instantly does not honour newlines between separate {{variable}} substitutions —
//  see learnings.md on the {{email_body}} pattern.)
export interface Lead extends ScoredPerson {
  subject:      string;
  hook:         string;
  body:         string;
  valueProp:    string;
  cta:          string;
  ps:           string;
  linkedinDm:   string;
  emailBody:    string; // assembled: hook \n\n body \n\n valueProp \n\n cta \n\n ps
  pipelineRunId: string;
}

// Pipeline-level shapes
export interface PipelineInput {
  postUrl:        string;
  slackChannel?:  string;
  slackUserId?:   string;
  slackResponseUrl?: string;
  dryRun?:        boolean;
  // Optional caps for test runs — defaults pulled from config.ts
  maxReactions?:  number;
  maxComments?:   number;
  // Test escape hatch: skip stages 1-5 and start the pipeline with this
  // pre-enriched payload. Useful for re-running scoring/copy/push without
  // re-paying for Apify + LeadMagic + AI Ark + Exa.
  cachedEnriched?: EnrichedPerson[];
}

export interface PipelineSummary {
  postUrl:           string;
  scraped:           number;
  passedHeadline:    number;
  passedHardFilters: number;
  newAfterDedup:     number;
  enriched:          number;
  emailFound:        number;
  scoredTier1or2:    number;
  pushedToInstantly: number;
  campaignId:        string;
  triggerRunUrl?:    string;
}

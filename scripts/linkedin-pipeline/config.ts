// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn Audience Pipeline — Configuration
// ─────────────────────────────────────────────────────────────────────────────

// ── Target profile ────────────────────────────────────────────────────────────
// Michel Lieben — ColdIQ founder, 50K+ LinkedIn followers.
// His post engagers = SDRs, agency owners, and GTM operators actively
// learning cold outreach. High-intent ICP signal.
export const TARGET_PROFILE_URL = 'https://www.linkedin.com/in/michel-lieben/'

// ── Apify actor ───────────────────────────────────────────────────────────────
// HarvestAPI/linkedin-profile-posts — profile engagers (posts + reactions + comments).
// HarvestAPI/linkedin-post-reactions — reactions on a specific post.
// HarvestAPI/linkedin-post-comments — comments on a specific post.
// No cookies needed. ~$2 per 1k items.
export const APIFY_ACTOR_ID = 'HarvestAPI/linkedin-profile-posts'

// How many posts + reactions/comments to scrape per run
export const MAX_POSTS            = 5
export const MAX_REACTIONS        = 500
export const MAX_COMMENTS         = 200

// ── Enrichment waterfall ──────────────────────────────────────────────────────
// LeadMagic → Prospeo → Perplexity (in order; stop at first hit)
export const LEADMAGIC_API_URL   = 'https://api.leadmagic.io'
export const PROSPEO_API_URL     = 'https://api.prospeo.io'
export const PERPLEXITY_API_URL  = 'https://api.perplexity.ai'

// ── RevyOps — canonical lead database ─────────────────────────────────────────
// Auth: x-api-key header (standard key) or x-master-api-key (master key)
// GET  /public/contacts?linkedin_url=...   → dedup check before adding
// POST /public/contacts                    → create contact record
// GET  /public/v2/contacts?linkedin_url=... → v2 with pagination
// Docs: docs/revyops-api.md
export const REVYOPS_API_URL = 'https://api.revyops.com'

// ── Smartlead ─────────────────────────────────────────────────────────────────
// Session 5+: use Smartlead CLI (npm install -g @smartlead/cli), not MCP.
export const SMARTLEAD_CAMPAIGN_ID = 0  // TODO: replace with real campaign ID

// Default settings applied to every campaign created in this project.
export const CAMPAIGN_DEFAULTS = {
  timezone:           'America/Chicago',
  days:               [1, 2, 3, 4, 5, 6],   // Mon–Sat
  startHour:          '07:00',
  endHour:            '18:00',
  minTimeBtwnEmails:  60,                    // minutes
  maxLeadsPerDay:     1000,
  stopLeadSettings:   'REPLY_TO_AN_EMAIL',
  sendAsPlainText:    true,
  followUpPercentage: 30,
  enableAiEspMatching: false,
  trackSettings:      [],                    // open + click tracking off
}

// ── ICP title filter — pass list ──────────────────────────────────────────────
export const ICP_TITLES = [
  'founder', 'co-founder', 'cofounder',
  'ceo', 'chief executive',
  'cto', 'chief technology',
  'coo', 'chief operating',
  'cro', 'chief revenue',
  'cmo', 'chief marketing',
  'vp', 'vice president',
  'head of', 'director of',
  'director',
  'revenue operations', 'revops', 'rev ops',
  'owner', 'president',
  'managing partner', 'general manager',
]

// ── ICP title filter — skip list (checked BEFORE pass list) ───────────────────
export const SKIP_TITLES = [
  // Recruiters
  'recruiter', 'recruiting', 'talent acquisition',
  'head of hr', 'head of people', 'head of talent',
  // Coaches / educators
  'coach', 'coaching', 'mentor',
  // Agencies (not the right buyer)
  'lead generation', 'lead gen',
  'cold email', 'cold outreach',
  'outbound agency', 'ai agency', 'automation agency',
  'book meetings', 'appointment setting',
  // Non-ICP roles
  'consultant', 'consulting', 'freelance',
  'student', 'intern', 'trainee',
]

// ── Industry skip list ────────────────────────────────────────────────────────
export const SKIP_INDUSTRIES = [
  'healthcare', 'medical', 'pharma',
  'nonprofit', 'non-profit',
  'government', 'public sector',
  'education', 'k-12', 'university',
  'consumer', 'b2c', 'd2c', 'e-commerce',
  'crypto', 'web3', 'blockchain',
]

// ── Title role classifier ─────────────────────────────────────────────────────
export function classifyTitleRole(headline: string): string | null {
  const h = headline.toLowerCase()
  if (h.includes('founder') || h.includes('co-founder') || h.includes('cofounder')) return 'founder'
  if (h.includes('ceo') || h.includes('chief executive')) return 'ceo'
  if (h.includes('cto') || h.includes('chief technology')) return 'cto'
  if (h.includes('cro') || h.includes('chief revenue')) return 'cro'
  if (h.includes('cmo') || h.includes('chief marketing')) return 'cmo'
  if (h.includes('coo') || h.includes('chief operating')) return 'coo'
  if (h.includes('vp ') || h.includes('vice president')) return 'vp'
  if (h.includes('head of')) return 'head_of'
  if (h.includes('director')) return 'director'
  if (h.includes('owner')) return 'owner'
  if (h.includes('president') && !h.includes('vice')) return 'president'
  if (h.includes('managing partner') || h.includes('general manager')) return 'gm'
  return null
}


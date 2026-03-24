// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn Audience Pipeline — Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

// Raw person returned by HarvestAPI/linkedin-profile-posts (reactions + comments)
export interface RawPerson {
  linkedinUrl:    string
  name:           string
  firstName:      string
  lastName:       string
  headline:       string
  engagementType: 'like' | 'comment' | 'celebrate' | 'support' | 'insightful' | 'funny' | 'love'
  commentText?:   string
  sourcePostUrl:  string
  sourcePostId:   string
}

// After headline ICP filter + RevyOps dedup check (02-filter.ts)
export interface FilteredPerson extends RawPerson {
  titleRole:    string   // 'founder' | 'ceo' | 'cto' | 'vp' | 'head_of' | 'director' | 'owner'
  filterReason: string
  revyopsId?:   number   // set if contact already exists in RevyOps (dedup)
}

// After Claude ICP scoring (03-classify.ts)
export interface ScoredPerson extends FilteredPerson {
  tier:       1 | 2 | 3 | 'skip'
  icpScore:   number     // 0–100
  scoreReason: string
  vertical:   string     // 'vertical_saas' | 'b2b_services' | 'dev_tools' | 'horizontal_saas' | 'other'
  confidence: 'high' | 'medium' | 'low'
}

// After enrichment waterfall — LeadMagic → Prospeo → Perplexity (04-enrich.ts)
export interface EnrichedPerson extends ScoredPerson {
  email?:             string
  emailSource?:       string
  companyName:        string
  companyLinkedinUrl?: string
  companyDomain?:     string
  employeeCount?:     string
  techStack?:         string[]
  isB2B?:             boolean
}

// After email verification (05-verify.ts)
export interface VerifiedPerson extends EnrichedPerson {
  emailValid?:        boolean
  emailVerifyStatus?: string  // 'valid' | 'risky' | 'invalid' | 'unknown'
}

// Final lead — enriched + verified + copy generated (06-copy.ts)
export interface Lead extends VerifiedPerson {
  subjectLine:    string
  email1:         string
  subject2:       string
  email2:         string
  subject3:       string
  email3:         string
  linkedinDm:     string   // ≤200 chars, connection request style
  pipelineRunId:  string
  pipelineRunDate: string
}

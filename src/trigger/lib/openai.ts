// ─────────────────────────────────────────────────────────────────────────────
// OpenAI wrapper — scoring + copy generation. GPT-4o mini for both.
// JSON mode keeps outputs structured and parseable.
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from "openai";
import { FIRM_CONTEXT, OPENAI_SCORING_MODEL, OPENAI_COPY_MODEL } from "../config";
import type { EnrichedPerson, ScoredPerson } from "../types";

const openai = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ScoringResult {
  tier: 1 | 2 | 3 | "skip";
  icpScore: number;
  scoreReason: string;
  vertical: string;
  confidence: "high" | "medium" | "low";
  contextScore: "high" | "medium" | "low";
}

/**
 * OpenAI sometimes returns tier as a number (1), a numeric string ("1"),
 * or with a "tier" prefix ("tier 1"). Collapse any of those into the canonical
 * type. Anything we don't recognise becomes "skip" (safest default — those
 * leads won't be pushed).
 */
function normalizeTier(raw: unknown): ScoringResult["tier"] {
  if (raw === 1 || raw === 2 || raw === 3) return raw;
  if (typeof raw === "string") {
    const cleaned = raw.toLowerCase().replace(/^tier\s*/, "").trim();
    if (cleaned === "1") return 1;
    if (cleaned === "2") return 2;
    if (cleaned === "3") return 3;
    if (cleaned === "skip") return "skip";
  }
  return "skip";
}

export async function scoreIcp(person: EnrichedPerson): Promise<ScoringResult> {
  const system = `You are scoring B2B leads against this firm's ICP.

Value proposition: ${FIRM_CONTEXT.valueProposition}
Core ICP: ${FIRM_CONTEXT.icp}
Pain signals to look for in Exa context: ${FIRM_CONTEXT.painSignals.join("; ")}

Tiering rules — be GENEROUS with tier 3, RESERVE "skip" for clearly off-ICP only:

- tier 1: perfect — CEO, founder, or co-founder of a B2B SaaS company at the right stage.
- tier 2: good — VP / Head / Director of Revenue, Sales, GTM, RevOps, Marketing, or Growth at a B2B SaaS company. These are decision-makers who buy outbound systems.
- tier 3: worth trying — any GTM-adjacent role at a B2B SaaS company (manager, lead, IC), OR founder/leader of a B2B services / agency / consultancy that could hire outbound, OR a senior leader at an adjacent B2B vertical.
- "skip": ONLY for clearly off-ICP. Concretely: recruiters, students, interns, junior coordinators with no buying power, obvious B2C / consumer / e-commerce brands, or competing cold-email / lead-gen agency owners. When in doubt, prefer tier 3 over skip.

Return JSON with these exact keys:
- tier: 1, 2, 3, or "skip"
- icpScore: 0-100 integer
- scoreReason: one sentence explaining the tier
- vertical: one of vertical_saas, b2b_services, dev_tools, horizontal_saas, other
- confidence: high, medium, or low (based on data quality)
- contextScore: high if Exa surfaced specific pain signals, medium if generic ICP confirmation, low if nothing useful`;

  const user = JSON.stringify({
    name: person.name,
    headline: person.headline,
    company: person.companyName,
    domain: person.companyDomain,
    employeeCount: person.employeeCount,
    engagementType: person.engagementType,
    commentText: person.commentText,
    exaSummary: person.exaSummary,
    exaSignals: person.exaSignals,
  });

  const r = await openai().chat.completions.create({
    model: OPENAI_SCORING_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const parsed = JSON.parse(r.choices[0].message.content ?? "{}") as Partial<ScoringResult> & { tier?: unknown };
  return { ...parsed, tier: normalizeTier(parsed.tier) } as ScoringResult;
}

export interface CopyResult {
  subject: string;
  hook: string;
  body: string;
  valueProp: string;
  cta: string;
  ps: string;
  linkedinDm: string;
}

export async function generateCopy(person: ScoredPerson): Promise<CopyResult> {
  const system = `You write cold outbound copy for this firm.

Value proposition: ${FIRM_CONTEXT.valueProposition}
ICP: ${FIRM_CONTEXT.icp}
Copy angles: ${FIRM_CONTEXT.copyAngles.join(" | ")}

Rules:
- No em-dashes. Use commas, periods, or "and".
- Subject line: under 6 words, lowercase, no punctuation. Specific.
- Hook: 1-2 sentences referencing their actual context (Exa signals + LinkedIn engagement).
- Body: 2-3 sentences, our value prop tied to their context.
- CTA: one question, ends with "?". Soft ask (e.g. "worth a quick call?").
- PS: one sentence, optional reinforcement.
- LinkedIn DM: max 200 chars, connection-request style, no link.

If contextScore is "high", use the Exa signal in the hook explicitly.
If "medium", use role + company + engagement type.
If "low", default to engagement type only.

Return JSON with keys: subject, hook, body, valueProp, cta, ps, linkedinDm.`;

  const user = JSON.stringify({
    firstName: person.firstName,
    lastName: person.lastName,
    headline: person.headline,
    company: person.companyName,
    vertical: person.vertical,
    tier: person.tier,
    contextScore: person.contextScore,
    exaSignals: person.exaSignals,
    exaSummary: person.exaSummary,
    engagementType: person.engagementType,
    commentText: person.commentText,
  });

  const r = await openai().chat.completions.create({
    model: OPENAI_COPY_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(r.choices[0].message.content ?? "{}") as CopyResult;
}

/** Collapses copy fields into a single email_body string for Instantly merge tags. */
export function assembleEmailBody(c: CopyResult): string {
  return [c.hook, c.body, c.valueProp, c.cta, c.ps].filter(Boolean).join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Ark wrapper — secondary enrichment. Used when LeadMagic returns no email.
//
// Critical learnings (from learnings.md):
//   - Base URL is api.ai-ark.com (with hyphen). Without is NXDOMAIN.
//   - Auth: X-TOKEN header (NOT Bearer, NOT X-API-Key).
//   - Response path has NO `data` wrapper: data.email.output[0].address
//   - Don't run >3 concurrent calls — 429 blocks persist 30-60 min.
//   - 0 credits charged when email not found.
// ─────────────────────────────────────────────────────────────────────────────

import { AIARK_API_URL } from "../config";

interface AIArkResponse {
  email?: {
    output?: Array<{
      address?: string;
      status?: string;       // 'VALID' | other
      domainType?: string;   // 'CATCH_ALL' | other
    }>;
  };
}

export interface AIArkResult {
  email?: string;
  emailStatus?: "valid" | "catch_all" | "invalid" | "unknown";
}

export async function enrichWithAiArk(linkedinUrl: string): Promise<AIArkResult | null> {
  const r = await fetch(`${AIARK_API_URL}/v1/people/export/single`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TOKEN": process.env.AIARK_API_KEY ?? "",
    },
    body: JSON.stringify({ url: linkedinUrl }),
  });
  if (!r.ok) return null;

  const data = (await r.json()) as AIArkResponse;
  const out = data.email?.output?.[0];
  if (!out?.address) return null;

  const emailStatus: AIArkResult["emailStatus"] =
    out.domainType === "CATCH_ALL" ? "catch_all" :
    out.status === "VALID"         ? "valid"     :
                                     "unknown";

  return { email: out.address, emailStatus };
}

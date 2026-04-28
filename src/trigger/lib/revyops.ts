// ─────────────────────────────────────────────────────────────────────────────
// RevyOps wrapper — dedup check before enrichment, stage contact after copy.
//
// Critical learnings (from learnings.md):
//   - Base URL is app.revyops.com/api/public (api.revyops.com is NXDOMAIN).
//   - /api/ prefix is required.
//   - GET /contacts-master-list returns array on hit, {"status":"No contacts found"} on miss.
//   - Auth: x-master-api-key header.
// ─────────────────────────────────────────────────────────────────────────────

import { REVYOPS_API_URL } from "../config";

const masterKey = () => process.env.REVYOPS_MASTER_API_KEY ?? "";

interface NoContactsResponse {
  status: string;
}

interface RevyOpsContact {
  id?: number;
  linkedin_url?: string;
  email?: string;
}

export async function isInRevyOps(linkedinUrl: string): Promise<boolean> {
  const url = `${REVYOPS_API_URL}/contacts-master-list?linkedin_url=${encodeURIComponent(linkedinUrl)}`;
  const r = await fetch(url, {
    headers: { "x-master-api-key": masterKey() },
  });
  if (!r.ok) return false;
  const data = (await r.json()) as RevyOpsContact[] | NoContactsResponse;
  return Array.isArray(data) && data.length > 0;
}

export interface StageContactInput {
  linkedinUrl: string;
  firstName: string;
  lastName: string;
  email?: string;
  companyName?: string;
  companyDomain?: string;
  headline?: string;
  source: string; // e.g. "linkedin-post-engager"
  tier: 1 | 2 | 3 | "skip";
  pipelineRunId: string;
}

export async function stageContact(input: StageContactInput): Promise<void> {
  await fetch(`${REVYOPS_API_URL}/contacts-master-list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-master-api-key": masterKey(),
    },
    body: JSON.stringify({
      linkedin_url: input.linkedinUrl,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      company_name: input.companyName,
      company_domain: input.companyDomain,
      headline: input.headline,
      source: input.source,
      tier: input.tier,
      pipeline_run_id: input.pipelineRunId,
    }),
  });
}

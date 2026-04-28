// ─────────────────────────────────────────────────────────────────────────────
// Instantly wrapper — bulk import + custom variable PATCH.
//
// Critical learnings (from learnings.md):
//   - POST /leads/add silently ignores customVariables on first import.
//     Only email, first_name, last_name, company_name persist. Must follow up
//     with a PATCH per lead to set the merge tag values.
//   - lead.payload (not lead.custom_variables) is where vars actually live.
//   - email_list PATCH is a SET operation — never touch it from this pipeline.
//   - Sequence uses {{subject}} + {{email_body}} only. Collapse copy fields
//     into one email_body string at push time.
// ─────────────────────────────────────────────────────────────────────────────

import { INSTANTLY_API_URL } from "../config";

const auth = () => `Bearer ${process.env.INSTANTLY_API_KEY ?? ""}`;

export interface InstantlyLeadInput {
  email: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  customVariables: {
    subject: string;
    email_body: string;
    linkedin_dm?: string;
    context_score?: string;
    [key: string]: string | undefined;
  };
}

// Instantly /leads/add response shape (verified 2026-04-27 via live probe).
// The created leads array is `created_leads`, NOT `leads`.
interface AddLeadsResponse {
  status?:           string;
  total_sent?:       number;
  leads_uploaded?:   number;
  duplicate_email_count?: number;
  invalid_email_count?:   number;
  created_leads?:    Array<{ index: number; id: string; email: string }>;
}

/**
 * Bulk imports leads, then PATCHes each one to attach customVariables.
 * Two-step is required because /leads/add silently drops customVariables.
 */
export async function pushLeadsToCampaign(
  campaignId: string,
  leads: InstantlyLeadInput[],
): Promise<{ added: number; patched: number }> {
  if (leads.length === 0) return { added: 0, patched: 0 };

  // Step 1: bulk import (only persists email, names, company_name)
  const addRes = await fetch(`${INSTANTLY_API_URL}/leads/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth(),
    },
    body: JSON.stringify({
      campaign_id: campaignId,
      leads: leads.map((l) => ({
        email: l.email,
        firstName: l.firstName,
        lastName: l.lastName,
        companyName: l.companyName,
      })),
    }),
  });

  if (!addRes.ok) {
    const errText = await addRes.text();
    throw new Error(`Instantly /leads/add failed: ${addRes.status} ${errText}`);
  }

  const addData = (await addRes.json()) as AddLeadsResponse;
  const created = addData.created_leads ?? [];

  // Step 2: PATCH each lead to set custom variables.
  // Sequential to avoid rate limiting; this is fast enough at <50 leads.
  let patched = 0;
  for (const lead of leads) {
    const match = created.find((c) => c.email.toLowerCase() === lead.email.toLowerCase());
    if (!match) continue;
    const r = await fetch(`${INSTANTLY_API_URL}/leads/${match.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth(),
      },
      body: JSON.stringify({ custom_variables: lead.customVariables }),
    });
    if (r.ok) patched++;
  }

  return { added: created.length, patched };
}

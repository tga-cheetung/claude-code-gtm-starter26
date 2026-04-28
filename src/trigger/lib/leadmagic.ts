// ─────────────────────────────────────────────────────────────────────────────
// LeadMagic wrapper — primary enrichment source.
// Two-step waterfall: profile-find (company data) → email-finder (the email).
// ─────────────────────────────────────────────────────────────────────────────

import { LEADMAGIC_API_URL } from "../config";

interface ProfileFindResponse {
  company_name?: string;
  company_website?: string;
  employee_count?: string;
  company_linkedin_url?: string;
}

interface EmailFinderResponse {
  email?: string;
  email_status?: "valid" | "catch_all" | "invalid" | string;
}

export interface LeadMagicResult {
  email?: string;
  emailStatus?: "valid" | "catch_all" | "invalid" | "unknown";
  companyName?: string;
  companyDomain?: string;
  companyLinkedinUrl?: string;
  employeeCount?: string;
}

async function lmFetch<T>(path: string, body: object): Promise<T | null> {
  const r = await fetch(`${LEADMAGIC_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.LEADMAGIC_API_KEY ?? "",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) return null;
  return (await r.json()) as T;
}

/**
 * profile-find returns company data. Uses `profile_url` (not `linkedin_url`).
 * email-finder needs first_name + last_name + domain.
 */
export async function enrichWithLeadMagic(
  linkedinUrl: string,
  firstName: string,
  lastName: string,
): Promise<LeadMagicResult | null> {
  const profile = await lmFetch<ProfileFindResponse>("/profile-find", {
    profile_url: linkedinUrl,
  });
  if (!profile?.company_website) {
    return profile
      ? {
          companyName: profile.company_name,
          companyLinkedinUrl: profile.company_linkedin_url,
          employeeCount: profile.employee_count,
        }
      : null;
  }

  const domain = profile.company_website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  const emailRes = await lmFetch<EmailFinderResponse>("/email-finder", {
    first_name: firstName,
    last_name: lastName,
    domain,
  });

  if (!emailRes?.email || emailRes.email_status === "invalid") {
    return {
      companyName: profile.company_name,
      companyDomain: domain,
      companyLinkedinUrl: profile.company_linkedin_url,
      employeeCount: profile.employee_count,
    };
  }

  return {
    email: emailRes.email,
    emailStatus:
      emailRes.email_status === "valid" || emailRes.email_status === "catch_all"
        ? emailRes.email_status
        : "unknown",
    companyName: profile.company_name,
    companyDomain: domain,
    companyLinkedinUrl: profile.company_linkedin_url,
    employeeCount: profile.employee_count,
  };
}

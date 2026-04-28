// ─────────────────────────────────────────────────────────────────────────────
// Exa wrapper — context enrichment. Searches for recent posts/articles
// about the lead so the copy task has signal-aware material to work with.
// ─────────────────────────────────────────────────────────────────────────────

import { EXA_API_URL } from "../config";

interface ExaSearchResult {
  title?: string;
  url?: string;
  text?: string;
  publishedDate?: string;
}

interface ExaSearchResponse {
  results?: ExaSearchResult[];
}

export interface ExaContext {
  summary: string;
  signals: string[];
}

// Each signal lists the substrings that confirm it. A signal fires if ANY
// of its phrases appears in the summary (lower-cased). Phrases must be
// specific enough that incidental matches are unlikely.
const SIGNAL_PHRASES: Record<string, string[]> = {
  hiring:       ["hiring sales", "first sales rep", "hiring sdr", "hiring ae"],
  fundraising:  ["raised seed", "raised series a", "closed our seed"],
  outboundPain: ["pipeline frustration", "outbound isn't working", "agency didn't deliver"],
  doingItSelf: ["doing cold email myself", "running outbound myself", "writing cold emails", "i'm the sdr"],
  firedAgency:  ["fired our agency", "ended our contract with"],
};

export async function fetchExaContext(
  name: string,
  company: string | undefined,
): Promise<ExaContext | null> {
  const query = company
    ? `${name} ${company} cold outreach OR pipeline OR hiring sales`
    : `${name} cold outreach OR pipeline OR hiring sales`;

  const r = await fetch(`${EXA_API_URL}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.EXA_API_KEY ?? "",
    },
    body: JSON.stringify({
      query,
      numResults: 5,
      type: "auto",
      contents: { text: { maxCharacters: 800 } },
    }),
  });
  if (!r.ok) return null;

  const data = (await r.json()) as ExaSearchResponse;
  const results = data.results ?? [];
  if (results.length === 0) return null;

  const summary = results
    .slice(0, 3)
    .map((res) => `${res.title ?? ""} — ${(res.text ?? "").slice(0, 200)}`)
    .join("\n");

  const summaryLower = summary.toLowerCase();
  const signals = Object.entries(SIGNAL_PHRASES)
    .filter(([, phrases]) => phrases.some((p) => summaryLower.includes(p)))
    .map(([key]) => key);

  return { summary, signals };
}

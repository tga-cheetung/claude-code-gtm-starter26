---
name: enrich-and-copy
description: "Read qualified leads from the 'Ready for Enrichment' Google Sheet tab, run the LeadMagic → AI Ark → Exa enrichment waterfall, score Exa context against your firm's value proposition, generate a cold email + LinkedIn DM per lead, and write 'Enriched & Verified' and 'Copy Ready' tabs back to the same sheet."
argument-hint: "[google-sheet-url]"
---

## Your Firm Context

> Edit this block to match your business before running the skill.
> If this section is empty or contains placeholder text, Claude will read `CLAUDE.md`
> from the project root and extract the business context, ICP description, and pain signals from there.

**Value Proposition:** We build signal-based outbound systems for B2B SaaS founders at $0–$10M ARR — done-for-you, fixed fee, no retainer. We hand the system off; they keep it.

**ICP:** CEOs and co-founders of B2B SaaS companies, pre-seed to Series A. The founder is the GTM team. Revenue is capped by their bandwidth.

**Top Pain Signals to watch for in Exa results:**
- Posting about hiring their first sales rep or AE
- Expressing frustration with pipeline, outbound, or agency results
- Just raised seed or Series A without a dedicated GTM hire
- Mentions of firing an agency or running outbound themselves
- Posts about doing cold email, LinkedIn outreach, or SDR work themselves

**Copy Angles:**
- "You're doing the selling yourself — we can take that off your plate"
- "Built for founders who are still the GTM team at [X ARR]"
- "Signal-based, not spray-and-pray — we identify intent before we reach out"

## Exa Context Scoring Rubric

Score each lead's Exa results against the Firm Context above.

**High** — Exa found one or more of the listed pain signals, OR direct evidence the founder is doing GTM themselves (cold email tool mentions, SDR job posts, agency frustration). Use rich, signal-specific copy.

**Medium** — Exa confirms they are a B2B SaaS founder at the right stage, but no specific pain signal found. Use moderate personalization (company + role context, light Exa detail).

**Low** — Exa returned generic results, off-ICP content, or nothing useful. Use baseline copy (headline + engagement type only, no Exa references).

For each lead output: `context_score` (high/medium/low) + `matched_signals` (comma-separated list of signals found, or "none").

## Step 1: Read Input

Extract the Sheet ID from the Google Sheet URL argument.

Read all rows from the "Ready for Enrichment" tab:

```bash
gws sheets spreadsheets values get \
  --params "{\"spreadsheetId\": \"<SHEET_ID>\", \"range\": \"Ready for Enrichment\"}"
```

Parse the header row to find column indices for: `Name`, `Headline`, `LinkedIn URL`, `Engagement Type`, `Source Post`.

If the tab does not exist or is empty, stop and tell the user: "No leads found in 'Ready for Enrichment' tab. Run /filter-engagers first."

## Step 2: Enrichment Waterfall

For each lead, run in sequence. Stop at first email hit.

### LeadMagic (primary)

```bash
curl -s -X POST "https://api.leadmagic.io/profile-find" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $LEADMAGIC_API_KEY" \
  -d '{"linkedin_url": "<LINKEDIN_URL>"}'
```

Extract from response: `email`, `email_status` (valid/catch_all/invalid), `company_name`, `company_domain`, `company_linkedin_url`, `employee_count`.

If `email` is present and `email_status` is not `invalid` → record `email_source: "leadmagic"`, skip AI Ark.

### AI Ark (email fallback)

Only call if LeadMagic returned no email.

```bash
curl -s -X POST "https://api.aiark.com/v1/find-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIARK_API_KEY" \
  -d '{"linkedin_url": "<LINKEDIN_URL>", "full_name": "<NAME>"}'
```

Extract: `email`, `confidence` (maps to email_status: high→valid, medium→catch_all, low→invalid).

If email found → record `email_source: "aiark"`.

If neither LeadMagic nor AI Ark found an email → record `email: ""`, `email_source: "not_found"`, `email_status: "not_found"`. Continue enrichment (Exa still runs).

### Exa (every lead — firmographics + intent signals)

Run on every lead regardless of email result. Cache results to `/tmp/exa-cache-<SHEET_ID>.json` — write the cache file after every 5 new Exa calls. On any restart, load the cache and skip leads already completed.

```python
import json, os
cache_path = f"/tmp/exa-cache-{SHEET_ID}.json"
cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}

# After every 5 new calls:
with open(cache_path, "w") as f:
    json.dump(cache, f)
```

Use `mcp__exa__people_search_exa` with the lead's full name + company name as the query. Request: recent posts, company description, tech stack, hiring signals, any pain signals matching the Firm Context.

Extract and store as plain text: `exa_context` (2–3 sentence company + person summary), `exa_intent_signals` (bullet list of any matched pain signals found).

If LeadMagic already returned `company_name` and `employee_count`, use those values. Fill gaps with Exa results.

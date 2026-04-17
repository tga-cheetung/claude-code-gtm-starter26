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

### Cache initialization (run before any API calls)

```python
import json, os

SHEET_ID = "<SHEET_ID>"
email_cache_path = f"/tmp/email-cache-{SHEET_ID}.json"
email_cache = json.load(open(email_cache_path)) if os.path.exists(email_cache_path) else {}
```

**On restart:** Load the cache and skip any lead whose LinkedIn URL is already a key in `email_cache`. Only call LeadMagic/AI Ark for leads not yet in the cache.

If the "Enriched & Verified" tab already exists and has data, you can also read from it directly to rebuild `email_cache` — treating it as the ground truth for any prior completed run.

For each lead, run in sequence. Stop at first email hit.

### LeadMagic (primary — two steps)

**Step 1:** `profile-find` — returns company data, not email directly. Field is `profile_url` (not `linkedin_url`).

```bash
curl -s -X POST "https://api.leadmagic.io/profile-find" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $LEADMAGIC_API_KEY" \
  -d '{"profile_url": "<LINKEDIN_URL>"}'
```

Extract: `company_name`, `company_website` (use as domain), `employee_count`. No email returned here.

**Step 2:** `email-finder` — requires name + domain from Step 1.

```bash
curl -s -X POST "https://api.leadmagic.io/email-finder" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $LEADMAGIC_API_KEY" \
  -d '{"first_name": "<FIRST>", "last_name": "<LAST>", "domain": "<DOMAIN>"}'
```

Extract: `email`, `email_status` (valid/catch_all/invalid).

If `email` is present and `email_status` is not `invalid` → record `email_source: "leadmagic"`, skip AI Ark.

If `company_website` is missing from profile-find, try guessing the domain from the company name or Exa context before falling back to AI Ark.

### AI Ark (email fallback)

Only call if LeadMagic returned no email.

```bash
curl -s -X POST "https://api.ai-ark.com/api/developer-portal/v1/people/export/single" \
  -H "Content-Type: application/json" \
  -H "X-TOKEN: $AIARK_API_KEY" \
  -d '{"url": "<LINKEDIN_URL>"}'
```

Parse response — email is at the ROOT level, there is NO `"data"` wrapper:
```python
resp = r.json()
outputs = resp.get("email", {}).get("output", [])  # NOT resp["data"]["email"]
if outputs and outputs[0].get("address"):
    addr   = outputs[0]["address"]
    status = "catch_all" if outputs[0].get("domainType") == "CATCH_ALL" \
             else ("valid" if outputs[0].get("status") == "VALID" else "unknown")
```

- 0 credits consumed if not found.

**Only works with vanity slug URLs** (`/in/firstlast`). Fails silently on internal ACoAAA IDs — check URL format before calling.

**Rate limit warning:** Run AI Ark with at most 1 concurrent worker and a 1s delay between requests. Running 10 concurrent workers causes a persistent 429 block that can last hours with no workaround. If you hit a 429, wait 30–60 minutes before retrying.

If email found → record `email_source: "aiark"`.

If neither LeadMagic nor AI Ark found an email → record `email: ""`, `email_source: "not_found"`, `email_status: "not_found"`. Continue enrichment (Exa still runs).

**After each lead, write to cache immediately:**

```python
email_cache[linkedin_url] = {
    "email": email,
    "email_status": email_status,
    "email_source": email_source,
    "company": company_name,
    "domain": domain,
    "employee_count": employee_count,
}
with open(email_cache_path, "w") as f:
    json.dump(email_cache, f)
```

Write after every single lead (not every 5) — API credits are non-recoverable.

### Exa Part A — Session 2 People Search (read from Google Sheet, no new API call)

Session 2's `filter-engagers` skill already ran `people_search_exa` on every qualified lead and wrote the results to the "ICP Scored" tab as the `Exa Summary` column. Read from there — do not re-run the people search.

```bash
gws sheets spreadsheets values get \
  --params "{\"spreadsheetId\": \"<SHEET_ID>\", \"range\": \"ICP Scored\"}"
```

Parse the header row to find the `Exa Summary` and `LinkedIn URL` columns. Build a lookup map keyed by LinkedIn URL → exa_summary.

If a lead's LinkedIn URL is missing from the "ICP Scored" tab (e.g. the tab doesn't exist or the lead wasn't scored in Session 2), fall back to running `mcp__exa__people_search_exa` for that lead only.

If LeadMagic already returned `company_name` and `employee_count`, use those values. Fill any gaps with the Session 2 Exa summary.

### Exa Part B — Web Search for Recent Activity (new, per lead)

Run `mcp__exa__web_search_exa` on every lead for recent intent signals. This is a different search from the Session 2 people search — it targets what the person has been doing recently, not who they are.

Query format: `"[Name] [Company] site:linkedin.com OR site:twitter.com"` — focused on posts, announcements, and activity from the last 90 days.

Cache results separately to `/tmp/web-search-cache-<SHEET_ID>.json` (keyed by LinkedIn URL). Write after every new call.

```python
ws_cache_path = f"/tmp/web-search-cache-{SHEET_ID}.json"
ws_cache = json.load(open(ws_cache_path)) if os.path.exists(ws_cache_path) else {}

# After every single new call (not every 5):
with open(ws_cache_path, "w") as f:
    json.dump(ws_cache, f)
```

Extract and store as plain text: `web_context` — a bullet list of any recent signals found (hiring posts, product launches, agency frustration, outbound-related activity, fundraise announcements). Set to `"No recent activity found"` if nothing relevant.

### Combined context

Each lead now has two Exa data points:
- `exa_context` — from Session 2 cache: who they are, what their company does
- `web_context` — from web search: what they've been doing recently

Both feed into Step 3 context scoring and Step 5 copy generation.

## Step 3: Context Scoring

For each lead, apply the Exa Scoring Rubric defined above using both Exa data points together.

Score the combined picture:
- `exa_context` (Session 2) — who they are, what their company does, whether they're a real SaaS founder
- `web_context` (Part B web search) — what they've been doing recently, any active pain signals

**Scoring logic:** A lead scores High if either source contains a matched pain signal. A lead scores Medium if both sources confirm ICP fit but neither surfaces a specific signal. A lead scores Low if both sources are generic or off-ICP.

`web_context` is the tiebreaker — a Medium from `exa_context` alone can be upgraded to High if `web_context` surfaces a direct pain signal.

Output per lead:
- `context_score`: `high` / `medium` / `low`
- `matched_signals`: comma-separated list of matched pain signals from either source, or `"none"`
- `signal_source`: `exa` / `web` / `both` / `none` — where the signals came from

## Step 4: Write "Enriched & Verified" Tab

Create (or clear) the "Enriched & Verified" tab:

```bash
# Create tab if it doesn't exist
gws sheets spreadsheets batchUpdate \
  --params "{\"spreadsheetId\": \"<SHEET_ID>\"}" \
  --json '{"requests": [{"addSheet": {"properties": {"title": "Enriched & Verified"}}}]}'

# Clear existing data
gws sheets spreadsheets values clear \
  --params "{\"spreadsheetId\": \"<SHEET_ID>\", \"range\": \"Enriched & Verified\"}"
```

Write all leads (including not_found emails) with columns:
`Name`, `LinkedIn URL`, `Headline`, `Engagement Type`, `Source Post`, `Email`, `Email Source`, `Email Status`, `Company`, `Domain`, `Employee Count`, `Tech Stack`, `Exa Context`, `Web Context`, `Matched Signals`, `Signal Source`, `Context Score`

After writing, pause and report:
- Total leads processed
- Emails found (valid + catch_all) vs not found
- High / Medium / Low context score breakdown
- "Ready to generate copy for X leads with valid/catch-all emails. Shall I continue?"

> **Restart checkpoint:** If copy generation is interrupted after this step, skip Steps 2–4 entirely on restart. Read the "Enriched & Verified" tab directly — it is the canonical enrichment record. Load `/tmp/email-cache-<SHEET_ID>.json` if it exists for reference, but the sheet is the source of truth.

## Step 5: Copy Generation — Pilot (first 10)

**Use the `/cold-email` skill for all copy writing.** Follow its writing principles, voice & tone guidelines, framework catalog, and quality check. Do not use a rigid template — pick the framework that best fits each lead's signal and context.

### Copy cache initialization (run before generating any copy)

```python
copy_cache_path = f"/tmp/copy-ready-{SHEET_ID}.json"
copy_cache = json.load(open(copy_cache_path)) if os.path.exists(copy_cache_path) else {}
# copy_cache is keyed by email address → {subject, body, ps, linkedin_dm}
```

**On restart:** Load the copy cache and skip any lead whose email is already a key. Only generate copy for leads not in the cache.

Take only leads with `email_status` of `valid` or `catch_all` from the enriched data.

### Personalization level by context score

Map `context_score` to the cold-email skill's personalization levels:

**High → Level 4 (individual).** Use `matched_signals` and `web_context` as the trigger. Recommended frameworks: PPP (Praise-Picture-Push), Observation→Problem→Ask, or Vanilla Ice Cream. The signal must connect directly to the problem we solve — if removing the personalised opener still makes sense, rewrite it.

**Medium → Level 3 (role-level).** Use company name + founder role as context. Recommended frameworks: PAS (Problem-Agitate-Solution) or SCQ (Situation-Complication-Question). Acknowledge their stage and the founder-as-GTM-team dynamic without referencing specific signals you don't have.

**Low → Level 2 (segment).** ICP pain point only, no company or signal references. Recommended frameworks: QVC (Question-Value-CTA) or Mouse Trap. Keep it short — if the context is thin, brevity beats fabricated personalisation.

### Output format per lead

For each lead produce:
- **Subject** — 2–4 words, lowercase, no punctuation tricks. Internal-looking. See cold-email/references/subject-lines.md.
- **Body** — Full email. Conversational, peer-level. Read it aloud — if it sounds like marketing copy, rewrite it. **The body field must end with the CTA question as its final sentence** (e.g. "Worth a 20-min call?"). The AI-tell filter requires exactly 1 `?` in the body field — if the CTA is stored only in a separate field and not also in body, every lead will be flagged.
- **P.S.** — One relevant social proof or case study reference. Match specificity to context score.
- **LinkedIn DM** — ≤200 chars. Reference the signal (High), role/company (Medium), or post engagement (Low).

After generating each lead's copy, write it to the cache immediately — before moving to the next lead:

```python
copy_cache[email] = {
    "name": name,
    "email": email,
    "context_score": context_score,
    "subject": subject,
    "body": body,
    "ps": ps,
    "linkedin_dm": linkedin_dm,
}
with open(copy_cache_path, "w") as f:
    json.dump(copy_cache, f, indent=2)
```

Once all pilot leads are written to the cache, run the AI-tell filter:

```bash
python3 .claude/skills/enrich-and-copy/ai_tell_filter.py \
  /tmp/copy-ready-<SHEET_ID>.json

# Read back the cleaned copy (filter overwrites in-place)
python3 -c "import json; print(json.dumps(json.load(open('/tmp/copy-ready-<SHEET_ID>.json')), indent=2))"
```

The filter will:
- **Auto-fix** em dashes → regular dashes, exclamation marks → periods, subject casing/punctuation
- **Flag** banned phrases, word count violations, extra question marks, rhythmic threes

For any flagged leads, revise the copy to address the flags before presenting to the user.

Then display for each lead:
- Name, Context Score, Subject line, opening line only

Then ask: "Here are the first 10. Does the angle feel right? Want to adjust tone, framework, CTA, or copy depth before I run the rest?"

Wait for explicit approval before proceeding to Step 6.

## Step 6: Copy Generation — Full Batch

On approval, generate copy for all remaining leads with valid/catch_all emails using the same cold-email skill logic and three-path personalization system.

**On restart:** Load `copy_cache` from `/tmp/copy-ready-<SHEET_ID>.json`. Any lead already in the cache is done — skip it. Only generate for leads whose email is not a key in the cache.

Write each lead to the cache immediately after generation (same pattern as Step 5 — one write per lead).

After all remaining leads are done, run the filter on the full cache:

```bash
python3 .claude/skills/enrich-and-copy/ai_tell_filter.py \
  /tmp/copy-ready-<SHEET_ID>.json
```

Revise any flagged leads, write revised copy back to the cache, then re-run the filter to confirm 0 flags before proceeding to Step 7.

## Step 7: Write "Copy Ready" Tab

Create (or clear) the "Copy Ready" tab:

```bash
gws sheets spreadsheets batchUpdate \
  --params "{\"spreadsheetId\": \"<SHEET_ID>\"}" \
  --json '{"requests": [{"addSheet": {"properties": {"title": "Copy Ready"}}}]}'

gws sheets spreadsheets values clear \
  --params "{\"spreadsheetId\": \"<SHEET_ID>\", \"range\": \"Copy Ready\"}"
```

Read all copy from `/tmp/copy-ready-<SHEET_ID>.json` — this is the source of truth for Step 7, not in-context data. This makes Step 7 safe to re-run after any compaction.

Write all copy-generated leads with columns:
`Name`, `Email`, `Context Score`, `Subject`, `Body`, `P.S.`, `LinkedIn DM`

Report: "Done. X leads written to 'Copy Ready' tab. Y high-context, Z medium, W low."

## API Reference

### LeadMagic
- Step 1 — `POST https://api.leadmagic.io/profile-find` — field: `profile_url` (not `linkedin_url`). Returns company data, NOT email.
- Step 2 — `POST https://api.leadmagic.io/email-finder` — fields: `first_name`, `last_name`, `domain`. Returns `email`, `email_status`.
- Auth: `X-API-Key: $LEADMAGIC_API_KEY`
- Email statuses: `valid`, `catch_all`, `invalid`, `unknown`
- See `learnings.md` for full two-step pattern and domain-guessing fallback.

### AI Ark
- Base URL: `https://api.ai-ark.com/api/developer-portal`
- Endpoint: `POST /v1/people/export/single`
- Auth header: `X-TOKEN: $AIARK_API_KEY` (not `Authorization: Bearer`, not `X-API-Key`)
- Request body: `{"url": "<linkedin_url>"}` — vanity slugs only, not ACoAAA internal IDs
- Email path: `r.json()["email"]["output"][0]["address"]` — **NO "data" wrapper at root**; going via `r.json()["data"]["email"]` returns empty every time
- Status: `r.json()["email"]["output"][0]["status"]`; `domainType: "CATCH_ALL"` → catch_all, `status: "VALID"` → valid
- 0 credits consumed if not found
- **Concurrency:** max 1 worker, 1s delay. 10 workers → persistent 429 for hours.

### Exa
- Tool: `mcp__exa__people_search_exa`
- Cache: `/tmp/exa-cache-<SHEET_ID>.json` — write every 5 calls, load on restart
- See `learnings.md` → "Exa MCP results land in Claude's context window" for full caching pattern

### Google Sheets (gws CLI)
- `gws` is at `/opt/homebrew/bin/gws`
- Tab creation: `batchUpdate` with `addSheet` request
- Always clear tab before writing: `values clear`
- Use escaped double quotes for `--params` (not single quotes) — see `learnings.md`
- For large datasets: write JSON to `/tmp/` and use `--json "$(cat /tmp/file.json)"`

### Notes
- `LEADMAGIC_API_KEY`, `AIARK_API_KEY` must be set in `.env`
- RevyOps dedup already completed in Session 2 — no need to re-check here
- Read `learnings.md` before debugging any API or gws issues

---
name: filter-engagers
description: "Read raw LinkedIn post engagers from a Google Sheet, run headline filter + AI ICP scoring + RevyOps dedup, and write results to separate sheet tabs. Use when given a Google Sheet URL containing Session 1 raw engagers."
argument-hint: "[google-sheet-url]"
---

# Filter Engagers — ICP Qualification Pipeline

Given a Google Sheet URL containing raw LinkedIn post engagers (from Session 1 / `scrape-post-eg`), this skill runs three qualification steps and writes each stage to its own sheet tab — all before spending a single enrichment credit.

---

## Required Inputs

| Input | How to extract | Example |
|-------|---------------|---------|
| **Sheet URL or ID** | First argument or URL containing `docs.google.com/spreadsheets/d/`. Extract the Sheet ID from between `/d/` and the next `/`. | `https://docs.google.com/spreadsheets/d/1Abc...XYZ/edit` → Sheet ID: `1Abc...XYZ` |
| **Input tab name** | Optional second argument. Default: `Sheet1` | `Sheet1` |

If the user provides only a sheet URL, proceed with `Sheet1` as the input tab.

---

## Pipeline Overview

```
Read input tab (raw engagers)
    ↓
Step 1: Headline Filter (regex, all rows) → "Headline Filtered" tab
    ↓
Step 2: AI ICP Scoring (pilot 10, then full) → "ICP Scored" tab
    ↓
Step 3: RevyOps Dedup (curl per row) → "Ready for Enrichment" tab
```

---

## Step 1: Read Raw Engagers

Use `gws` CLI to read all rows from the input tab:

```bash
gws sheets spreadsheets values get \
  --params '{"spreadsheetId": "<SHEET_ID>", "range": "<TAB_NAME>"}'
```

Parse the response. The first row is the header. Find column indices for: `Name`, `Headline`, `LinkedIn URL`, `Engagement`. Column names may vary slightly — match case-insensitively and handle common variants (`full_name` → Name, `headline` → Headline, `linkedin_url` → LinkedIn URL).

Store the data as an array of row objects.

Report: "Read X rows from [tab name]."

---

## Step 2: Headline Filter

Apply these rules to each row's headline (case-insensitive):

### Founder signals (require at least one)

```
founder, co-founder, cofounder, ceo, chief executive
```

### Exclude signals (drop regardless of founder match)

```
founder's office, recruiter, recruiting, student, intern, freelance,
ghostwriter, content creator, content strategist, content writer,
personal brand, linkedin ads, cold email, cold mail, sdr,
account manager, account executive
```

### SaaS signals (tag, don't filter)

```
saas, b2b, software, platform, ai, automation, tech, gtm, revops
```

### Logic

For each row:
1. If no founder signal → `pass: false`, `reason: no_founder_signal`
2. If founder signal + exclude signal → `pass: false`, `reason: excluded_role`
3. If founder signal + no exclude → `pass: true`, `reason: founder_with_saas_signal` or `founder_no_saas_signal`

### Write "Headline Filtered" tab

Create the tab if it doesn't exist. Clear it if it does. Write ALL rows (pass and fail) with columns:

| Name | Headline | LinkedIn URL | Engagement | Pass | Reason | Has SaaS Signal |

```bash
# Create tab
gws sheets spreadsheets batchUpdate \
  --params '{"spreadsheetId": "<SHEET_ID>"}' \
  --json '{"requests": [{"addSheet": {"properties": {"title": "Headline Filtered"}}}]}'

# Clear if already exists (ignore error if tab is new)
gws sheets spreadsheets values clear \
  --params '{"spreadsheetId": "<SHEET_ID>", "range": "Headline Filtered"}'

# Write data
gws sheets spreadsheets values update \
  --params '{"spreadsheetId": "<SHEET_ID>", "range": "Headline Filtered!A1", "valueInputOption": "RAW"}' \
  --json "$(cat /tmp/headline-filtered.json)"
```

Report: "Headline filter complete. X passed, Y failed. Z have SaaS signals."

---

## Step 3: AI ICP Scoring

Take only the rows that **passed** the headline filter.

### ICP Scoring Rubric

This is the rubric Claude uses to score each lead. Students can edit this section to match their own ICP.

**Target ICP:** B2B SaaS founders — CEOs and co-founders of B2B SaaS companies at $0–10M ARR. Pre-seed through Series A. The founder IS the GTM team — revenue is capped by their bandwidth. They need outbound systems, not another tool.

| Score | Label | Criteria |
|-------|-------|----------|
| **9-10** | STRONG_FIT | B2B SaaS founder (CEO/Co-founder). Clear product company, not services. Pre-seed to Series A signals in headline. Founder appears to personally run GTM. |
| **6-8** | MODERATE_FIT | Founder signal + SaaS/tech signal, but some ambiguity. Could be a real product founder or could be a tech-enabled services company. Needs enrichment to confirm. |
| **3-5** | WEAK_FIT | Founder signal but no SaaS/product signal. Likely a consultant, coach, or agency owner who uses "founder" in their title. |
| **1-2** | POOR_FIT | Weak founder signal or strong non-ICP signals. Service providers, content creators, operators at larger companies. |
| **0** | NO_FIT | Excluded role that bypassed headline filter, or clearly not a founder. |

### Scoring output per row

For each row, produce:
- `score` — integer 0-10
- `score_label` — STRONG_FIT / MODERATE_FIT / WEAK_FIT / POOR_FIT / NO_FIT
- `rationale` — one sentence explaining the score, referencing specific headline words
- `is_saas_founder` — true/false

### Pilot first (10 rows)

Score the **first 10 passed rows only**. Write them to the **"ICP Scored"** tab with columns:

| Name | Headline | LinkedIn URL | Score | Score Label | Rationale | Is SaaS Founder |

Then **show the user a summary**:

**Top 3 highest-scored leads:**
- [Name] — [Headline] → Score: X/10 — [Rationale]
- ...

**Bottom 3 lowest-scored leads:**
- [Name] — [Headline] → Score: X/10 — [Rationale]

Ask: **"These are the first 10 scores. Want me to adjust the rubric or continue scoring the rest?"**

### Full batch (on approval)

Score all remaining passed rows. Append them to the "ICP Scored" tab (don't overwrite the pilot rows — clear and rewrite the full set).

Report: "Scored X leads. Y STRONG_FIT (8+), Z MODERATE_FIT (6-7), W below threshold."

---

## Step 4: RevyOps Dedup

For each row in the "ICP Scored" output, check against the RevyOps CRM:

```bash
curl -s -H "x-api-key: $REVYOPS_MASTER_API_KEY" \
  "https://app.revyops.com/api/public/contacts-master-list?linkedin_url=<encoded_url>"
```

- **Non-empty array response** → `is_duplicate: true`. Record the `contact_status` and `id` from the first result.
- **Empty array `[]`** → `is_duplicate: false`, `revyops_status: "new"`
- **HTTP error** → `is_duplicate: false`, `revyops_status: "error_<status_code>"`

### Write "Ready for Enrichment" tab

Write only **non-duplicate** rows with columns:

| Name | Headline | LinkedIn URL | Score | Score Label | Rationale |

Report: "X of Y leads were already in RevyOps. Z leads ready for enrichment in Session 3."

---

## Google Sheets I/O Reference

### Creating a new tab

```bash
gws sheets spreadsheets batchUpdate \
  --params '{"spreadsheetId": "<SHEET_ID>"}' \
  --json '{"requests": [{"addSheet": {"properties": {"title": "<TAB_NAME>"}}}]}'
```

If the tab already exists, this will error. That's fine — catch the error and proceed to clear + write.

### Clearing a tab

```bash
gws sheets spreadsheets values clear \
  --params '{"spreadsheetId": "<SHEET_ID>", "range": "<TAB_NAME>"}'
```

### Writing data

For small datasets (< 50 rows), inline the JSON:

```bash
gws sheets spreadsheets values update \
  --params '{"spreadsheetId": "<SHEET_ID>", "range": "<TAB_NAME>!A1", "valueInputOption": "RAW"}' \
  --json '{"values": [["Header1", "Header2"], ["val1", "val2"]]}'
```

For larger datasets, write to a temp file first:

```bash
cat > /tmp/sheet-data.json << 'JSONEOF'
{"values": [["Header1", "Header2"], ["val1", "val2"]]}
JSONEOF

gws sheets spreadsheets values update \
  --params "{\"spreadsheetId\": \"<SHEET_ID>\", \"range\": \"<TAB_NAME>!A1\", \"valueInputOption\": \"RAW\"}" \
  --json "$(cat /tmp/sheet-data.json)"
```

---

## Notes

- `gws` CLI is at `/opt/homebrew/bin/gws` (`@googleworkspace/cli@0.7.0`)
- RevyOps base URL is `app.revyops.com/api`, **not** `api.revyops.com` (the latter returns NXDOMAIN)
- `REVYOPS_MASTER_API_KEY` must be set in `.env`
- See `learnings.md` at the repo root for additional gotchas from previous sessions
- All three pipeline steps are free — no enrichment credits are spent

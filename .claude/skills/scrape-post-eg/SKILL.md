---
name: scrape-post-eg
description: "Scrape every person who liked or commented on a LinkedIn post, filter out companies and the post author, optionally filter by headline keywords, and write Name, Headline, LinkedIn URL, and Engagement type to a Google Sheet. Use when given a LinkedIn post URL. Requires Apify MCP and gws CLI."
argument-hint: "[linkedin-post-url] [google-sheet-url]"
---

# LinkedIn Post Engagers → Google Sheet

Given a LinkedIn post URL and a Google Sheet URL, this skill scrapes every person who liked or commented, removes company accounts and the post author, deduplicates by name, applies optional ICP headline filters, and writes a clean sheet: **Name | Headline | LinkedIn URL | Engagement**.

---

## Required Inputs

| Input | How to extract | Example |
|-------|---------------|---------|
| **Post URL** | First argument or URL containing `linkedin.com/posts/` or `linkedin.com/feed/update/` | `https://www.linkedin.com/posts/username_slug-activity-123/` |
| **Sheet URL or ID** | Second argument or URL containing `docs.google.com/spreadsheets/d/`. Extract the Sheet ID from between `/d/` and the next `/`. | `https://docs.google.com/spreadsheets/d/1Abc...XYZ/edit` → Sheet ID: `1Abc...XYZ` |

If the user provides only a post URL, **ask for the Google Sheet URL before proceeding**.

---

## Actual Apify Response Shapes (verified 2026-03-23)

Understanding these prevents field-path bugs. The two actors return **different** structures.

**Reactions** (`harvestapi/linkedin-post-reactions`):
```json
{
  "reactionType": "LIKE",
  "actor": {
    "id": "ACoAAED1AnMB...",
    "name": "Hassan Shahzad",
    "linkedinUrl": "https://www.linkedin.com/in/ACoAAED1AnMB...",
    "position": "BSc (Hons.) Mathematics & Economics | Lums"
  }
}
```
- **No** `actor.headline` — use `actor.position`
- **No** `actor.location` — not returned in short mode
- **No** `actor.type` — can't distinguish person/company from fields alone
- URLs are always internal ID format (`/in/ACoAAA...`)
- Company pages use `/company/name/` URLs — this is how you filter them

**Comments** (`harvestapi/linkedin-post-comments`):
```json
{
  "commentary": "The actual comment text",
  "actor": {
    "id": "ACoAAFM90Y4B...",
    "type": "profile",
    "name": "Monika Grycz",
    "linkedinUrl": "https://www.linkedin.com/in/grycz-monika",
    "position": "outbound x content x personal brands",
    "author": false
  }
}
```
- **No** `actor.headline` — use `actor.position`
- **No** `actor.location` — not returned in short mode
- `actor.type`: `"profile"` or `"company"` — use this to filter companies
- `actor.author`: `true` for the post author's own comments/replies — use this to filter the author
- Company accounts have `actor.id: null` and URL like `/company/name/posts`
- Person URLs are vanity slugs (`/in/firstname-lastname-123`)

---

## Filter Parameters (set before running)

Specify these at the start of the request, or apply defaults:

| Parameter | Example | Behavior |
|-----------|---------|----------|
| `headlineIncludeKeywords` | `["estimator", "operations", "project manager"]` | Keep if headline contains **any** keyword (case-insensitive). Leave empty = keep all. |
| `headlineExcludeKeywords` | `["recruiter", "student", "consultant"]` | Drop if headline contains **any** keyword (case-insensitive). Applied after include filter. |

If no filters are specified, skip Step 4 and write all cleaned records.

---

## Step 1 & 2: Scrape Reactions and Comments (run in parallel)

Both actors are independent — call them at the same time to halve total runtime. Use `async: false` (the default) so each call blocks until results are ready.

### Reactions

Call actor `harvestapi/linkedin-post-reactions` via Apify MCP (`call-actor`):

```json
{
  "posts": ["<POST_URL>"],
  "maxItems": 1000,
  "profileScraperMode": "short"
}
```

From each result, extract:
- `actor.name` → Name
- `actor.position` → Headline
- `actor.linkedinUrl` → LinkedIn URL
- `reactionType` → map to friendly label (see table below)

**Reaction type mapping:**

| Raw value | Sheet label |
|-----------|-------------|
| LIKE | Liked |
| PRAISE | Celebrated |
| EMPATHY | Supported |
| APPRECIATION | Loved |
| INTEREST | Insightful |
| ENTERTAINMENT | Funny |
| *(anything else)* | *(write raw value as-is)* |

---

### Comments

Call actor `harvestapi/linkedin-post-comments` via Apify MCP (`call-actor`):

```json
{
  "posts": ["<POST_URL>"],
  "maxItems": 1000,
  "profileScraperMode": "short",
  "scrapeReplies": false
}
```

From each result, extract:
- `actor.name` → Name
- `actor.position` → Headline
- `actor.linkedinUrl` → LinkedIn URL
- `actor.type` → for company filtering
- `actor.author` → for author filtering
- Engagement label: `"Commented"`

---

## Step 3: Clean, Deduplicate, and Merge

Apply in this order: **remove junk → remove companies → remove author → deduplicate**.

### 3a. Remove company accounts

**From reactions:** Drop any record where `actor.linkedinUrl` contains `/company/`.
**From comments:** Drop any record where `actor.type === "company"`.

Report: "Removed X company accounts."

### 3b. Remove the post author

Extract the author's name from the comments data — look for any record where `actor.author === true`. Store the author's normalized name.

If found, also drop any record from **reactions** whose `actor.name.trim().toLowerCase()` matches the author name.

If no author is detected in comments (e.g., author didn't comment), extract the author slug from the post URL itself (e.g., `kenny-damian-90aba221a` → approximate name "kenny damian") and use that for name matching.

Report: "Removed post author: [name]."

### 3c. Deduplicate by name

**Why name-based dedup:** Reactions return internal ID URLs (`/in/ACoAAA...`) while comments return vanity slugs (`/in/firstname-lastname-123`). The same person gets two different URLs, so URL-based dedup misses overlaps.

Dedup key: `actor.name.trim().toLowerCase()`. Build a map keyed by this value.

For each person:

| Appeared in | Engagement column |
|-------------|-------------------|
| Reactions only | Reaction label (e.g., "Liked") |
| Comments only | "Commented" |
| Both | Reaction label + " + Commented" (e.g., "Liked + Commented") |

**Merging rules when name matches:**
- **URL:** Keep the vanity URL (the one that does NOT contain `ACoAAA`). If both are vanity or both are IDs, keep whichever is non-null.
- **Headline:** Keep whichever `actor.position` is non-empty.

**Missing name:** If `actor.name` is blank or null, fall back to `linkedinUrl` as the dedup key. If both are missing, skip the record.

**Same name, different people:** Rare edge case. Acceptable to merge; the LinkedIn URL will resolve to one of them.

Report: "Deduplicated: X reactions + Y comments → Z unique people."

---

## Step 4: Filter by ICP (apply if filter parameters were set)

Apply in order:

**4a. Headline include filter** (if `headlineIncludeKeywords` is non-empty):
- Keep the record if the headline contains **any** of the include keywords (case-insensitive substring match)
- If headline is blank and include keywords are set → **skip**

**4b. Headline exclude filter** (if `headlineExcludeKeywords` is non-empty):
- Drop the record if the headline contains **any** of the exclude keywords (case-insensitive)
- Applied after include filter — exclusions always win

After filtering, report: "Filtered Z → N records (M dropped by headline filter)."

---

## Step 5: Write to Google Sheet

Use the Sheet ID extracted from the user-provided Google Sheet URL.

**First, clear the sheet** (prevents stale data from previous runs):

```bash
gws sheets spreadsheets values clear \
  --params '{"spreadsheetId": "<SHEET_ID>", "range": "Sheet1"}'
```

**Then write headers + all rows in one call:**

```bash
gws sheets spreadsheets values update \
  --params '{"spreadsheetId": "<SHEET_ID>", "range": "Sheet1!A1", "valueInputOption": "RAW"}' \
  --json '{"values": [
    ["Name", "Headline", "LinkedIn URL", "Engagement"],
    ["Jane Smith", "VP Ops at BuildCo", "https://www.linkedin.com/in/janesmith", "Liked"],
    ["Bob Lee", "Estimator at GC Inc", "https://www.linkedin.com/in/boblee", "Commented"]
  ]}'
```

Build the full `values` array from the filtered data before writing — one `gws` call writes everything.

**For any dataset with special characters or 200+ rows:** Write the JSON to a temp file, then use escaped double-quote `--params` (not single quotes) with `$(cat)` for `--json`:

```bash
gws sheets spreadsheets values update \
  --params "{\"spreadsheetId\": \"<SHEET_ID>\", \"range\": \"Sheet1!A1\", \"valueInputOption\": \"RAW\"}" \
  --json "$(cat /tmp/engagers.json)"
```

**Why not single quotes for `--params`?** When `--json` uses `$(...)` expansion, the shell can corrupt single-quoted `--params`. Escaped double quotes avoid this. See `learnings.md` for details.

---

## Output Columns

| Column | Source | Notes |
|--------|--------|-------|
| A: Name | `actor.name` | Full name |
| B: Headline | `actor.position` | Current role/title (this field is called `position` in Apify, not `headline`) |
| C: LinkedIn URL | `actor.linkedinUrl` | Full profile URL — prefer vanity slug over internal ID |
| D: Engagement | Derived | "Liked", "Commented", "Liked + Commented", etc. |

---

## Scale Guidance

- Most posts: `maxItems: 1000` covers everything
- Viral posts (5K+ reactions): increase `maxItems` to 5000 on both actors
- Reactions and comments are paginated internally by Apify — no manual pagination needed

---

## Valid Post URL Formats

Both actors accept:
- `https://www.linkedin.com/posts/username_slug-activity-XXXXXXX/`
- `https://www.linkedin.com/feed/update/urn:li:activity:XXXXXXX/`
- `https://www.linkedin.com/feed/update/urn:li:ugcPost:XXXXXXX/`

Strip tracking params (`?utm_source=...`) before passing to actors — they work fine without them.

---

## Notes

- **No location data** in `profileScraperMode: "short"`. Country filtering requires switching to `"full"` mode (slower, more expensive). This skill uses "short" for speed.
- **`actor.headline` does not exist** — the actual field name from Apify is `actor.position`. This skill uses the correct field.
- **Company pages** sometimes react to and comment on posts. They are filtered out in Step 3a.
- **The post author** often reacts to their own post and replies to comments. They are filtered out in Step 3b.
- **See `learnings.md`** at the repo root for additional gotchas discovered during development.

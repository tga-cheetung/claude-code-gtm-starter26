---
name: scrape-post
description: Given a LinkedIn post URL and a Google Sheet URL, scrape everyone who liked or commented, keep only founders/CEOs/co-founders (ideally SaaS), deduplicate by name, and write Name | Headline | LinkedIn URL | Engagement to the sheet.
---

# LinkedIn Post → Founder List → Google Sheet

Given a LinkedIn post URL and a Google Sheet URL, this skill scrapes every person who liked or commented, filters to founders and CEOs only, deduplicates by name, and writes a clean list to the sheet.

---

## Required Inputs

| Input | How to extract |
|-------|---------------|
| **Post URL** | URL containing `linkedin.com/posts/` or `linkedin.com/feed/update/` |
| **Sheet URL** | URL containing `docs.google.com/spreadsheets/d/` — extract the Sheet ID from between `/d/` and the next `/` |

If the user provides only a post URL, ask for the Google Sheet URL before proceeding.

Strip any tracking params (`?utm_source=...`) from the post URL before passing to actors.

---

## Step 1 & 2: Scrape Reactions and Comments (run in parallel)

Call both actors simultaneously via Apify MCP (`call-actor`). Use `async: false` (default) — each call blocks until results are ready.

### Reactions — `harvestapi/linkedin-post-reactions`

```json
{
  "posts": ["<POST_URL>"],
  "maxItems": 1000,
  "profileScraperMode": "short"
}
```

From each result, extract:
- `actor.name` → Name
- `actor.position` → Headline  (**NOT** `actor.headline` — that field does not exist)
- `actor.linkedinUrl` → LinkedIn URL
- `reactionType` → map to engagement label:

| Raw value | Label |
|-----------|-------|
| LIKE | Liked |
| PRAISE | Celebrated |
| EMPATHY | Supported |
| APPRECIATION | Loved |
| INTEREST | Insightful |
| ENTERTAINMENT | Funny |
| *(anything else)* | *(write raw value)* |

### Comments — `harvestapi/linkedin-post-comments`

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
- `actor.position` → Headline  (**NOT** `actor.headline` — that field does not exist)
- `actor.linkedinUrl` → LinkedIn URL
- `actor.type` → for company filtering
- `actor.author` → for author filtering
- Engagement label: `"Commented"`

---

## Step 3: Clean and Deduplicate

Apply in this exact order.

### 3a. Remove company accounts

- **Reactions:** Drop if `actor.linkedinUrl` contains `/company/`
- **Comments:** Drop if `actor.type === "company"` or `actor.id === null`

### 3b. Remove the post author

- Find any comment record where `actor.author === true` — store their name (normalized: `.trim().toLowerCase()`)
- Drop that person from both reactions and comments
- If no author found in comments, extract from the post URL slug (e.g. `kenny-damian-90aba221a` → `"kenny damian"`) and name-match

### 3c. Deduplicate by name

**Why name-based:** Reactions return internal ID URLs (`/in/ACoAAA...`); comments return vanity slugs (`/in/firstname-lastname`). Same person → two different URLs. Name dedup catches the overlap.

Dedup key: `actor.name.trim().toLowerCase()`

When the same person appears in both:
- **URL:** Keep the vanity slug (the one that does NOT contain `ACoAAA`). If both are vanity or both are IDs, keep whichever is non-null.
- **Headline:** Keep whichever `actor.position` is non-empty
- **Engagement:** Combine as `"<Reaction label> + Commented"` (e.g. `"Liked + Commented"`)

If `actor.name` is blank, fall back to `linkedinUrl` as dedup key. If both missing, skip the record.

---

## Step 4: Filter — Founders and CEOs Only

Keep a record if its headline (case-insensitive) contains **any** of:

```
founder, co-founder, cofounder, ceo, chief executive, owner, co-ceo
```

Drop a record if its headline contains **any** of these (exclusions win over inclusions):

```
recruiter, talent, hr , investor, vc , venture capital, student, intern
```

If the headline is blank → **drop the record** (can't confirm founder status).

After filtering, report: `"Filtered N records → M founders kept (X dropped)."`

**SaaS context:** These include keywords are broad enough to catch SaaS founders. No extra SaaS filter is applied — founder/CEO is the primary signal; the headline text itself will often contain "SaaS", "software", "platform", etc. which you can note when relevant but not filter on.

---

## Step 5: Write to Google Sheet

Extract the Sheet ID from the user-provided URL (the segment between `/d/` and the next `/`).

**First, clear the sheet:**

```bash
gws sheets spreadsheets values clear \
  --params '{"spreadsheetId": "<SHEET_ID>", "range": "Sheet1"}'
```

**Then write all rows in one call.** For any dataset, write JSON to a temp file and use escaped double quotes for `--params` (single quotes break when `--json` uses `$(...)`):

```bash
# Build the values array and write to temp file
python3 -c "
import json
rows = [['Name', 'Headline', 'LinkedIn URL', 'Engagement']]
rows += [
  ['Jane Smith', 'Founder & CEO at BuildSaaS', 'https://www.linkedin.com/in/janesmith', 'Liked'],
  # ... all rows
]
print(json.dumps({'values': rows}))
" > /tmp/scrape-post.json

gws sheets spreadsheets values update \
  --params "{\"spreadsheetId\": \"<SHEET_ID>\", \"range\": \"Sheet1!A1\", \"valueInputOption\": \"RAW\"}" \
  --json "$(cat /tmp/scrape-post.json)"
```

---

## Output Columns

| Column | Source | Notes |
|--------|--------|-------|
| A: Name | `actor.name` | Full name |
| B: Headline | `actor.position` | Role/title (Apify field is `position`, not `headline`) |
| C: LinkedIn URL | `actor.linkedinUrl` | Prefer vanity slug over internal ID |
| D: Engagement | Derived | "Liked", "Commented", "Liked + Commented", etc. |

---

## Key Gotchas (from learnings.md)

- `actor.headline` **does not exist** — always use `actor.position`
- `actor.location` is **not returned** in short mode — no location filtering possible without switching to `"full"` mode (slower, more expensive)
- Reactions URLs are internal IDs; comments URLs are vanity slugs — deduplicate by **name**, not URL
- Company accounts: URL contains `/company/` (reactions) or `actor.type === "company"` (comments)
- Set `scrapeReplies: false` to avoid inflating dataset with author replies
- Always use escaped double-quote `--params` when `--json` uses `$(cat ...)` — single quotes break intermittently

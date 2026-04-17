# Learnings: Apify LinkedIn Actors

Things that broke when we built the LinkedIn post engager scraper. If you're building or modifying anything that uses `harvestapi/linkedin-post-reactions` or `harvestapi/linkedin-post-comments`, read this first — it'll save you an hour of debugging.

---

## Always test with 5 records before building anything

This is the #1 rule. Before writing any extraction logic, run both actors with `maxItems: 5` on a real post and **look at the raw JSON**. Claude will confidently use field names that don't exist (`actor.headline`, `actor.location`) unless you force it to verify first.

Prompt pattern that works:

> Before writing the skill, scrape 5 reactions and 5 comments from [post URL] and show me the raw JSON so we can verify the field names together.

---

## The two actors have different response shapes

This is the source of most bugs. They look similar but aren't.

| Field | Reactions actor | Comments actor |
|-------|----------------|----------------|
| `actor.headline` | **Does not exist** | **Does not exist** |
| `actor.position` | Present — this IS the headline | Present |
| `actor.location` | Not returned in short mode | Not returned in short mode |
| `actor.type` | Not present | `"profile"` or `"company"` |
| `actor.author` | Not present | `true` if post author |
| `actor.linkedinUrl` format | Internal ID (`/in/ACoAAA...`) | Vanity slug (`/in/firstname-lastname`) |

The two fields Claude hallucinates every time: **`actor.headline`** and **`actor.location`**. Neither exists. The headline is called `actor.position`. Location isn't returned at all in `profileScraperMode: "short"`.

---

## URL-based dedup doesn't work

The same person gets a different URL from each actor — reactions use internal IDs (`/in/ACoAAED1AnMB...`), comments use vanity slugs (`/in/obenyoung`). If someone liked AND commented, URL matching won't catch the overlap.

**What works:** Deduplicate by `actor.name.trim().toLowerCase()`. When merging, keep the vanity URL (the one without `ACoAAA`) for the output — it's the human-readable profile link.

---

## Company pages react to and comment on posts

LinkedIn company pages show up in both datasets. They look like people until you notice:
- Their URL contains `/company/` instead of `/in/`
- Their `actor.position` is a follower count (e.g., "7 followers")
- In comments, `actor.type === "company"` and `actor.id === null`

Filter them out early — before dedup.

---

## The post author shows up everywhere

Authors react to their own posts, reply to every comment, and sometimes post promotional comments. The comments actor has `actor.author: true` — use it. The reactions actor doesn't have this flag, so match by name instead.

---

## Short mode = no location data

`profileScraperMode: "short"` is fast and cheap but returns no location. If you need country filtering, switch to `"full"` — but expect slower runs and higher Apify costs.

---

## gws CLI: single-quoted `--params` breaks when `--json` uses `$(...)`

This fails intermittently:
```bash
gws sheets spreadsheets values update \
  --params '{"spreadsheetId": "ID", "range": "Sheet1!A1", "valueInputOption": "RAW"}' \
  --json "$(cat /tmp/data.json)"
```
Error: `Invalid --params JSON: invalid escape at line 1 column 81`

The `$(...)` expansion in `--json` somehow corrupts the single-quoted `--params` argument. Both `$(cat)` and `$(python3 -c "print(...)")` trigger it.

**What works:** Use escaped double quotes for `--params` instead of single quotes:
```bash
gws sheets spreadsheets values update \
  --params "{\"spreadsheetId\": \"ID\", \"range\": \"Sheet1!A1\", \"valueInputOption\": \"RAW\"}" \
  --json "$(cat /tmp/data.json)"
```
This has been reliable across all test runs.

---

## Set `scrapeReplies: false` on the comments actor

Otherwise you get the author's replies to every comment, which inflates the dataset and makes filtering harder.

---

## Test post

Verified (2026-03-23): `https://www.linkedin.com/posts/kenny-damian-90aba221a_ive-spent-600-hours-inside-claude-code-share-7441843439735865344-toe2`
- 49 reactions, 18 comments → 62 unique people after cleaning
- Good size for testing (not too small, not slow)

---

# Learnings: AI Ark Email Enrichment (Session 3)

## Internal LinkedIn URLs (`ACoAAA`) block email enrichment — resolve to vanity slugs first

The reactions actor returns internal member IDs (`/in/ACoAADcVKkgB...`). Both LeadMagic and AI Ark require the vanity slug format (`/in/firstlast`). When passed an internal ID:
- LeadMagic `profile-find`: returns 404 "Profile not found or not accessible"
- AI Ark `export/single`: returns `{"message": "person not found"}`

HTTP redirect resolution doesn't work: LinkedIn returns status 999 (bot detection) for unauthenticated GET/HEAD requests.

**Fix (confirmed working):** After dedup in the scrape step, collect all records that still have ACoAAA URLs and batch them through `harvestapi/linkedin-profile-scraper`. This actor accepts ACoAAA internal URLs directly and returns the canonical vanity slug. This is now baked into the `scrape-post` skill as Step 3d.

```json
{
  "urls": ["https://www.linkedin.com/in/ACoAADcVKkgBJT21PusyzbnmmBEL37IQByiamAE"],
  "profileScraperMode": "Profile details no email ($4 per 1k)"
}
```

Response fields to extract: `originalQuery.url` (key for lookup), `publicIdentifier`, `linkedinUrl` (the vanity slug to replace the ACoAAA URL with).

**Tested 2026-04-10:** 3/3 ACoAAA URLs resolved correctly. Example: `ACoAADcVKkgB...` → `https://www.linkedin.com/in/diogotravanca`. Cost: $0.004/profile — 68 leads costs ~$0.27.

**Alternatively:** Complement the reactions scrape with a comments scrape — the comments actor returns vanity slugs directly (see learnings line 28), but only captures people who both reacted AND commented.

**Impact:** In a typical post-engagement scrape, ~80% of reactors will have internal URLs → only ~20% are directly enrichable without this resolution step.

---

## AI Ark — correct base URL, auth header, and endpoint

The skill docs referenced `api.aiark.com` (no hyphen) — that DNS doesn't exist. The correct setup:

- **Base URL:** `https://api.ai-ark.com/api/developer-portal`
- **Email endpoint:** `POST /v1/people/export/single`
- **Auth header:** `X-TOKEN: <api_key>` (not `Authorization: Bearer`, not `X-API-Key`)
- **Request body:** `{"url": "<linkedin_url>"}` — accepts LinkedIn URL directly, no name needed
- **Synchronous:** yes, returns immediately
- **Response:** email is at `data['email']['output'][0]['address']`; status at `data['email']['output'][0]['status']`; `domainType: "CATCH_ALL"` → treat as catch_all, `status: "VALID"` otherwise → valid
- **Credits:** 0 credits consumed if email not found

Also: `app.ai-ark.com` is the web UI (SPA), not the API. `api.ai-ark.com` is the API server.

---

# Learnings: Deepline Enrich (Session 2)

Things that broke when building the ICP filter + scoring + dedup pipeline with `deepline enrich`. Read this before writing any `run_javascript` or `call_local_claude_code` steps.

---

## Deepline tool names differ from skill docs

The skill docs reference `call_ai` and `run_javascript`. The actual canonical tool IDs are:
- `call_local_claude_code` (not `call_ai`)
- `run_javascript` (this one matches)

Always run `deepline tools search <query>` to confirm the tool ID before using it. If it doesn't resolve, you'll get: `Could not resolve tool reference`.

---

## `run_javascript` doesn't have `input_data` — use `{{template_variables}}`

There is no global `input_data` object in `run_javascript`. Row data comes through Deepline's `{{column_name}}` template variables, which get interpolated into the `code` string before execution.

**Wrong:**
```js
const headline = input_data.headline; // input_data is not defined
```

**Right:**
```js
const headline = `{{headline}}`;
```

---

## `run_javascript` doesn't inherit `.env` variables

`process.env` exists in the sandbox but only has system-level vars (HOME, HOMEBREW_PREFIX, etc). It does NOT load project `.env` files. `export VAR=value` in the same shell command works for `deepline tools execute` but NOT for `deepline enrich` (the enrich worker spawns separately).

**Workaround:** Bake secrets directly into the `.js` file at runtime using a heredoc with shell variable substitution. The file is gitignored via `.claude/`.

---

## `run_javascript` requires async IIFE for `fetch`

Top-level `await` is not supported. Wrap async code in an IIFE:

```js
return (async () => {
  const r = await fetch(url, { headers: { 'x-api-key': key } });
  const data = await r.json();
  return JSON.stringify(data);
})();
```

---

## RevyOps base URL is `app.revyops.com/api`, not `api.revyops.com`

`api.revyops.com` does not resolve (NXDOMAIN). The correct base URL is:
```
https://app.revyops.com/api/public/contacts-master-list
```
The master API key from `.env` (`REVYOPS_MASTER_API_KEY`) works. The `/api/` prefix is required — without it you get a 404.

---

## RevyOps returns `{"status":"No contacts found"}`, not `[]`, for new leads

The `contacts-master-list` endpoint does **not** return an empty array for unknown contacts. It returns:
```json
{"status": "No contacts found"}
```
For existing contacts it returns an array. Check `isinstance(parsed, list)` — don't check for empty array.

---

## Exa MCP results land in Claude's context window — cache to disk every 5 calls

Unlike bash CLI tools that write to disk, `mcp__exa__people_search_exa` results exist only in Claude's context. If the context resets mid-run, all completed searches are lost.

**Fix:** Cache results to `/tmp/exa-cache-<SHEET_ID>.json` (keyed by LinkedIn URL → exa_summary string). Write the cache after every 5 new Exa calls. On restart, load from cache and skip already-completed rows — at most 4 searches need to be redone.

```python
import json, os
cache_path = f"/tmp/exa-cache-{SHEET_ID}.json"
cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}

# After every 5 new calls:
with open(cache_path, "w") as f:
    json.dump(cache, f)
```

This pattern is now baked into the `filter-engagers` skill.

---

## `--in-place` and `--output` cannot be used together

Use `--output` for the first pass (creates the file), then `--in-place` for subsequent passes on that output. Never use both flags in the same command.

---

## Stale output files cause schema mismatch errors

If you re-run with a different input file (e.g., adding a `revyops_dedup` column), the old output file has a different schema. Delete the output file before re-running:
```bash
rm -f data/runs/2026-03-27/03-scored.csv
```

---

## Lock files block re-runs

If a run is interrupted, a `.deepline.lock` directory persists and blocks the next run. Remove it:
```bash
rm -rf path/to/output.csv.deepline.lock
```

---

## BYOK: `deepline keys set` doesn't exist — use the env file

The BYOK docs (https://code.deepline.com/docs/features/bring-your-own-keys) describe `deepline keys set <provider> --key "..."` and a REST API at `/api/v2/keys`. Neither works in the current CLI version.

**What works:** Add provider env vars directly to Deepline's own config file:
```
~/.local/deepline/code-deepline-com/.env
```

Example:
```
LEADMAGIC_API_KEY=your_key_here
PROSPEO_API_KEY=your_key_here
EXA_API_KEY=your_key_here
```

Deepline auto-detects these on the next command. Env var names must match exactly (see BYOK docs for the full list of 26 providers). Restart the backend after adding keys: `deepline backend stop --just-backend`.

---

## AI Ark: correct response path has NO "data" wrapper

The original enrichment script had:
```python
r.json().get("data", {}).get("email", {}).get("output", [])
```

This returns empty for every response — the "data" wrapper does not exist. The correct path is:
```python
r.json().get("email", {}).get("output", [])
```

And from that output:
- `output[0]["address"]` — email address
- `output[0]["domainType"]` — `"CATCH_ALL"` or other
- `output[0]["status"]` — `"VALID"` or other

**Impact:** In Session 3, all 59 AI Ark calls returned empty strings because of this bug. Only discovered after manually testing the API response structure. Always verify the actual API response before assuming a path.

---

## AI Ark rate limiting: don't run 10+ concurrent workers

Running 10 concurrent workers to AI Ark triggers a persistent 429 block. Even sequential calls with 0.6s delays returned 429 for hours after the block started. Only 2 emails were recovered before the block hit.

**Fix:** If you need to retry AI Ark after a 429, wait at least 30-60 minutes before trying again. Use 1 worker, 1s delay between requests. Never use ThreadPoolExecutor with >3 workers for AI Ark.

---

## ai_tell_filter.py must cover all copyable fields

The filter was initially only checking `body`, `ps`, and `linkedin_dm`. This allowed em-dashes and banned phrases to pass through the `hook` and `value_prop` fields undetected.

**Fix:** Added explicit processing blocks for `hook` and `value_prop` in `filter_lead()`. Any field that can contain copyable text must be passed through `apply_hard_replacements()` and `check_banned_phrases()`.

---

## CTA as a separate JSON field causes 0-question-mark body failure

The filter requires exactly 1 `?` in the `body` field. If the CTA is stored as a separate `cta` field and not embedded in `body`, the body will have 0 question marks and every lead will be flagged.

**Fix:** Embed the CTA question at the end of the `body` string during generation (e.g., append "Worth a 20-min call?" as the last sentence of `body`). The `cta` field can still exist as a standalone field for display purposes.

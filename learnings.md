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

Pick any LinkedIn post with ~50 reactions + ~20 comments for testing. That size is large enough to exercise dedup and ACoAAA resolution but small enough to run fast and cheap.

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

---

# Learnings: Instantly API (Session 4)

Validated against a live Instantly account.

---

## `email_list` is a full replacement, not an append

`PATCH /api/v2/campaigns/{id}` with `{"email_list": [...]}` **replaces the entire list**. If you send one inbox, you get one inbox. 99 others gone.

**Fix:** Always GET the campaign first, modify the array in memory, then PATCH with the full new array.

```
// correct pattern for adding/removing inboxes
const campaign = await GET /api/v2/campaigns/{id}
const updated = campaign.email_list.filter(e => !flaggedEmails.includes(e))
updated.push(...standbyEmails)
await PATCH /api/v2/campaigns/{id} { email_list: updated }
```

---

## Assigned inboxes live in `email_list` on the campaign object

No separate endpoint needed. `GET /api/v2/campaigns/{id}` (and `list_campaigns`) return `email_list` — a flat array of all sending account email addresses assigned to that campaign. Domain extraction is trivial: parse the domain from each email string.

---

## Two warmup score fields — use `stat_warmup_score` from `list_accounts` for selection

- `list_accounts` returns `stat_warmup_score` per inbox (integer 0–100). No extra API call needed for domain selection logic.
- `POST /api/v2/accounts/warmup-analytics` returns `aggregate_data[email].health_score` — same concept but requires a separate POST with an email array. Use this for the deliverability diagnostic where you want daily breakdown too (`email_date_data`).

**For `instantly-campaign-setup`:** use `stat_warmup_score` from `list_accounts` — one call, all data.  
**For `instantly-deliverability`:** use warmup-analytics for richer per-day trend data alongside placement test results.

---

## Warmup analytics response schema

```json
{
  "email_date_data": {
    "inbox@domain.com": {
      "2026-04-19": { "sent": 3, "landed_inbox": 3, "received": 7 }
    }
  },
  "aggregate_data": {
    "inbox@domain.com": {
      "sent": 10, "received": 27, "landed_inbox": 10,
      "health_score_label": "100%", "health_score": 100
    }
  }
}
```

Note: no `spam_count` field in warmup analytics. Inbox placement tests are needed for spam rate per domain.

---

## A/B variants in sequences: use `variants` array on each step

Campaign sequences use:
```json
{
  "steps": [{
    "type": "email",
    "delay": 0,
    "variants": [
      { "subject": "Subject A", "body": "{{email_body_1}}" },
      { "subject": "Subject B", "body": "{{email_body_1}}" }
    ]
  }]
}
```
Multiple items in `variants` = A/B test on that step. Instantly rotates automatically.

---

## Custom variables are the personalization mechanism

Sequences store `{{variable_name}}` placeholders. Per-lead values are set as custom variables on the lead object at import time. The campaign's `custom_variables` object shows which variables are declared.

From the live campaign: `subject_line`, `email_body_1`, `email_body_2`, `email_body_3`, `subject_line_3` are all custom variables — not hardcoded in the sequence. This means the sequence template is static; all personalization lives on the lead record.

**Implication for `instantly-campaign-setup`:** Import leads with custom variable fields populated from the Copy Ready tab columns. Map sheet columns → lead custom variables, not → sequence variant bodies.

---

## Inbox placement test `emails` field — unconfirmed

No existing placement tests in the account to inspect. The `emails` field in `POST /api/v2/inbox-placement-tests` is documented as "emails to send the inbox placement test to" which is ambiguous (FROM or TO?). Given `recipients_labels` handles the seed address side, `emails` likely = your sending accounts (FROM). Needs live test to confirm before building `instantly-deliverability`.

---

## Instantly MCP session drops — use curl as fallback

The `mcp__instantly__*` tools return "No valid session ID provided" if the MCP connection has dropped (e.g. after a long conversation). Fall back to direct curl calls with `$INSTANTLY_API_KEY` from `.env`. All the same endpoints, no difference in behavior.

---

## Instantly: `emails` field in placement test = FROM addresses (confirmed)

Tested live. `POST /api/v2/inbox-placement-tests` with `emails: ["adams-r@atomicfunnelsai.com"]` — the response `emails` field echoed back our sending inbox, and `recipients` showed Instantly's internal seed addresses (e.g. `ethan@govynor.com`, `avery@gofynor.com`). Conclusive: `emails` = your sending accounts.

---

## Instantly: `recipients_labels` schema — docs are wrong, use ESP options endpoint

The API docs show `{"provider": "gmail.com", "type": "free"}` but the actual API requires `{"region": "North America", "sub_region": "US", "type": "Professional", "esp": "Google"}`.

**Fix:** Always call `GET /api/v2/inbox-placement-tests/email-service-provider-options` first and use the exact values returned. In this account, only 3 options exist: Google Professional US, Google Personal US, Outlook Professional US.

The skill should dynamically fetch and use these options rather than hardcoding provider strings.

---

## Instantly: Placement tests need production-ready inboxes, not warmup inboxes

A placement test sends to all seed addresses (20 in our test: 10 Google + 10 Outlook). If the sending inbox has `daily_limit: 2` (warmup), the test will take hours or days to complete — not the 2–5 minutes the skill assumes.

**Fix for `instantly-deliverability`:** Before triggering a placement test, check `daily_limit` on sampled inboxes. Require `daily_limit >= 20` (or configurable) to proceed. If all domain samples are in warmup, surface a warning: "All sampled inboxes are in warmup — placement test will run slowly. Proceed anyway or check back in Instantly UI."

In a real production account with graduated inboxes (30–40/day), the test completes in 2–5 minutes as expected.

### Custom variables stored in `lead.payload`, not `custom_variables`

When you PATCH `/api/v2/leads/{id}` with `{"custom_variables": {"subject": "...", "hook": "..."}}`, the keys get merged into `lead.payload` in the API response — not a top-level `custom_variables` field. Reading `lead.custom_variables` always returns `[]`. Read from `lead.payload` instead.

Instantly resolves `{{variable}}` sequence placeholders from `payload` at send time, so the sequence-to-lead wiring works correctly regardless.

Also: on first import via `POST /api/v2/leads/add`, `custom_variables` in the lead object are **silently ignored** — only `email`, `first_name`, `last_name`, `company_name` are persisted. Always follow up with a PATCH per lead to set custom variables after bulk import.

### Instantly API blocks Python `urllib` via Cloudflare (error 1010)

`POST /api/v2/leads` from Python's `urllib.request` returns `403` with body `error code: 1010`. This is a Cloudflare WAF block on the default Python User-Agent, not an Instantly auth issue — the same API key works fine via `curl`.

Fix: use `curl`, `requests` (which sets a browser-like UA by default), or set a non-default `User-Agent` header on `urllib` requests. All other Instantly endpoints I've tested (campaigns GET/PATCH, accounts list) accept urllib fine — this seems specific to the leads endpoint.

---

# Learnings: Session 5 — Trigger.dev pipeline (2026-04-27)

Things that broke when porting the LinkedIn pipeline from skills+CLI to Trigger.dev tasks. Read this before touching `src/trigger/`.

---

## TRIGGER_SECRET_KEY in `.env` must match `trigger.config.ts` project ref

Trigger.dev secret keys are project-scoped (`tr_dev_xxx` for dev, `tr_prod_xxx` for prod). If `TRIGGER_SECRET_KEY` is for a different project than the one in `trigger.config.ts`, every triggered run sits forever in `PENDING_VERSION`. The dev worker registers under project A; the SDK fires runs into project B; nothing matches.

**Diagnose:** `curl -H "Authorization: Bearer $TRIGGER_SECRET_KEY" https://api.trigger.dev/api/v1/deployments?env=dev` — if the returned `git.remoteUrl` doesn't match the current repo, the key is for the wrong project.

**Fix:** Open the Trigger.dev dashboard for the correct project → Settings → API keys → copy the dev secret → replace `TRIGGER_SECRET_KEY` in `.env` → restart `npm run dev`.

---

## `trigger.dev dev` requires a real TTY to keep its supervisor websocket alive

When started as a background process from a non-interactive shell (e.g. spawned by another tool), the local worker builds and indexes ("Local worker ready [node] -> 20260427.X") but the supervisor websocket never establishes — debug log shows `[DevSupervisor] Socket connections { connections: [] }` repeating. Result: triggered runs sit at `PENDING_VERSION`.

**Fix:** Run `npm run dev` in your own interactive terminal. Anything else (the trigger script, n8n's HTTP call) can come from any other process — it just needs the dev session live in a TTY somewhere.

**Never run `trigger.dev dev --log-level=debug`** — it prints `process.env` to stdout, which leaks every secret in your `.env` file.

---

## Trigger.dev v4 has no native HTTP-triggered task

The `webhooks` export in `@trigger.dev/sdk/v3` is for *receiving* webhook payloads from Trigger.dev (e.g. alert callbacks), not for accepting incoming HTTP that fires a task. To trigger a task from outside, you call `tasks.trigger("task-id", payload)` from a process holding `TRIGGER_SECRET_KEY`. That process can be anywhere — Vercel, n8n, a local server, whatever — but Trigger.dev itself does not host an HTTP endpoint that triggers tasks.

For the Slack `/engage` flow we use n8n webhook → HTTP Request node POSTing to `https://api.trigger.dev/api/v1/tasks/orchestrator/trigger` with `Authorization: Bearer $TRIGGER_SECRET_KEY` and `Content-Type: application/json` and body `{ "payload": {...} }`.

---

## `trigger.dev dev` does NOT auto-rebuild on `lib/` changes

Edits inside `src/trigger/lib/*.ts` are not picked up by the running dev session — the dev watcher only fires on changes inside `src/trigger/tasks/*.ts`. After editing anything in `lib/` you must Ctrl+C and re-run `npm run dev` for the new code to apply.

This bit us once: the Instantly response-shape fix sat unused for a full pipeline run because `lib/instantly.ts` had been edited but the dev worker was still on the old code. Symptom: the task `COMPLETED` cleanly but with stale behavior.

---

## HarvestAPI scrape input field is `posts`, not `postUrls`

The `harvestapi/linkedin-post-reactions` and `harvestapi/linkedin-post-comments` actors expect:

```json
{ "posts": ["<url>"], "maxItems": 20, "profileScraperMode": "short" }
```

**Not** `postUrls`. Wrong field name returns zero items silently — no error, no warning, just empty dataset. The skill `scrape-post/SKILL.md` had this documented all along; we missed it on the first port.

---

## Instantly `/leads/add` response uses `created_leads`, not `leads`

`POST /api/v2/leads/add` returns:

```json
{
  "status": "success",
  "total_sent": 1,
  "leads_uploaded": 1,
  "duplicate_email_count": 0,
  "invalid_email_count": 0,
  "created_leads": [{ "index": 0, "id": "...", "email": "..." }]
}
```

The created leads are in `created_leads`, not `leads`. If you parse `addData.leads` you always get undefined → empty array → no per-lead PATCH → custom variables never get attached. The `/leads/add` request itself succeeds (200) so the bug looks like "Instantly silently dropped my leads" until you log the raw body.

---

## OpenAI `gpt-4o-mini` returns inconsistent tier values even with strict prompt

We asked for `tier: 1 | 2 | 3 | "skip"` in JSON-mode. The model returns a mix of:

- Numbers: `1`, `2`, `3`
- Numeric strings: `"1"`, `"2"`, `"3"`
- Prefixed strings: `"tier 1"`, `"Tier 2"`, `"tier 3"`

This breaks downstream `=== 1` style filters silently. Always normalize at the boundary — collapse all variants into the canonical type before returning from the scoring lib. See `normalizeTier` in `src/trigger/lib/openai.ts`.

---

## Slack bot needs `chat:write.public` scope OR explicit channel membership

Default `chat:write` scope alone is not enough — `chat.postMessage` to a channel the bot isn't a member of returns `not_in_channel`. Two fixes:

1. **Invite the bot:** in the channel, `/invite @<bot-name>`. Per-channel.
2. **Add `chat:write.public` scope and reinstall the app:** lets the bot post to any public channel without membership. One-time setup.

Option 2 is preferable when you have one canonical notify channel and don't want to manage per-channel bot invites. Reinstalling the Slack app does NOT rotate the bot token (verified).

`conversations.history` is a separate scope (`channels:history` / `groups:history`) and still requires bot membership — `chat:write.public` doesn't cover reads.

---

## ICP scoring prompts must distinguish `tier 3` from `skip` clearly

The original prompt said `ICP: CEOs and co-founders of B2B SaaS companies`. The LLM took this literally and labeled every VP / Head / Director as `skip`. Result: 0 leads ever made it to the push step on the first real run.

**Fix:** be explicit that `skip` is a narrow exclusion (recruiters, students, B2C, competing lead-gen agencies) and that ambiguous-but-decision-maker should land in tier 3. After: 11/82 qualified instead of 0/82.

The general lesson: when an LLM scoring step defaults to the most exclusionary label, the prompt isn't "too strict" — it's "too narrow about what `skip` means." Define the *exclusion* precisely, not the *inclusion*.

---

## Trigger.dev run output above ~10KB is stored behind a presigned URL with TTL

`GET /api/v3/runs/{id}` returns either `output: {...}` (small) or `outputPresignedUrl: "https://..."` (large). The presigned URL expires after a few minutes — stale snapshots become useless for replay.

The presigned content is wrapped in SuperJSON form: `{ json: {...real output...}, meta: {...} }`. Don't forget to unwrap.

For long-lived snapshots: refetch the run before reading, OR write a snapshot script that downloads the presigned content and inlines it into your local cache file.

---

## Trigger.dev task IDs are global per project

When you call `tasks.trigger("orchestrator", payload)`, the string `"orchestrator"` must match `task({ id: "orchestrator", ... })` exactly. Renaming the task ID without updating callers (n8n's HTTP Request URL especially: `…/tasks/orchestrator/trigger`) breaks dispatch silently — the run is created but never picked up.

---
name: cc-deliverability
description: Session 4 demo skill — samples one inbox per sending domain on a campaign, triggers an inbox placement test via Instantly API, surfaces per-domain SpamAssassin scores and blacklist status, flags problem domains, and rotates them out with standby inboxes. Use when diagnosing deliverability drops on an active campaign.
argument-hint: "[campaign-name-or-id]"
---

## Configuration

```
SA_THRESHOLD: 3              # SpamAssassin score above this = flagged
FLAG_BLACKLISTED: true       # any blacklist hit = flagged regardless of SA score
STANDBY_WARMUP_FLOOR: 70     # minimum warmup score for standby inbox selection
POLL_INTERVAL_SEC: 30        # how often to check test status
POLL_TIMEOUT_MIN: 10         # give up polling after this many minutes
```

---

## Step 1 — Identify Sending Domains

Resolve campaign from the argument. If a name is given, list campaigns and match by name:

```bash
INSTANTLY_API_KEY=$(grep 'INSTANTLY_API_KEY' .env | tr -d '\r' | cut -d'=' -f2)

curl -s -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  "https://api.instantly.ai/api/v2/campaigns?limit=100" | python3 -c "
import json,sys
campaigns = json.load(sys.stdin).get('items', [])
for c in campaigns:
    print(c['id'], c['name'])
"
```

Once `CAMPAIGN_ID` is known, fetch the campaign to get `email_list`:

```bash
curl -s -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  "https://api.instantly.ai/api/v2/campaigns/$CAMPAIGN_ID" | python3 -c "
import json,sys
r = json.load(sys.stdin)
emails = r.get('email_list', [])
by_domain = {}
for e in emails:
    d = e.split('@')[1]
    by_domain.setdefault(d, []).append(e)
for d, inboxes in sorted(by_domain.items()):
    print(d, len(inboxes), 'inboxes — sample:', sorted(inboxes)[0])
"
```

`email_list` is the flat array of sending inbox emails assigned to the campaign. Group by domain, sample one inbox per domain (first alphabetically).

Show pre-test summary:

```
Campaign: <your campaign name>
Sending domains found: 4
  send1.example.com   (3 inboxes) — sample: a@send1.example.com
  send2.example.com   (2 inboxes) — sample: a@send2.example.com
  send3.example.com   (3 inboxes) — sample: a@send3.example.com
  send4.example.com   (2 inboxes) — sample: a@send4.example.com
Sampled inboxes: 4 (one per domain)
```

Proceed automatically — no approval gate.

---

## Step 2 — Pre-flight + Trigger Placement Test

**2a — Check daily limits on sampled inboxes:**

```bash
curl -s -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  "https://api.instantly.ai/api/v2/accounts?limit=100" | python3 -c "
import json,sys
items = json.load(sys.stdin).get('items', [])
sampled = ['a@send1.example.com', 'a@send2.example.com']  # from Step 1
for m in items:
    if m['email'] in sampled:
        flag = ' ⚠️  warmup — test will be slow' if m.get('daily_limit', 0) < 20 else ''
        print(m['email'], 'daily_limit:', m.get('daily_limit', 0), flag)
"
```

If any sampled inbox has `daily_limit < 20`: warn and gate — "One or more sampled inboxes are in warmup (daily_limit < 20). The placement test sends to ~20 seed addresses and will take hours instead of minutes. Proceed anyway?"

**2b — Fetch valid ESP options (never hardcode):**

```bash
curl -s -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  "https://api.instantly.ai/api/v2/inbox-placement-tests/email-service-provider-options"
```

⚠️ Official docs show `{provider, type}` — this is wrong. The real format is `{region, sub_region, type, esp}`. Always use the exact values returned by this endpoint.

**2c — Pull representative email content from a campaign lead:**

```bash
curl -s -X POST "https://api.instantly.ai/api/v2/leads/list" \
  -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"campaign\": \"$CAMPAIGN_ID\", \"limit\": 1}" | python3 -c "
import json,sys
r = json.load(sys.stdin)
lead = r.get('items', [{}])[0]
payload = lead.get('payload', {})
print('subject:', payload.get('subject', '(none)'))
print('email_body:', payload.get('email_body', '(none)')[:120], '...')
"
```

The sequence body uses `{{variable}}` placeholders — use the actual lead payload values as the test content, not the raw template strings.

**2d — Fire placement test:**

```bash
curl -s -X POST "https://api.instantly.ai/api/v2/inbox-placement-tests" \
  -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Deliverability check — {{campaign_name}} — {{date}}",
    "type": 1,
    "sending_method": 1,
    "emails": ["a@send1.example.com", "a@send2.example.com"],
    "campaign_id": "{{CAMPAIGN_ID}}",
    "email_subject": "{{subject from lead payload}}",
    "email_body": "{{email_body from lead payload}}",
    "recipients_labels": [
      {{use exact values from step 2b}}
    ],
    "delivery_mode": 1
  }'
```

Capture returned `id` as `TEST_ID`. Print: "Placement test fired — ID: {TEST_ID}. Polling every 30 seconds..."

---

## Step 3 — Poll for Results

```bash
curl -s -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  "https://api.instantly.ai/api/v2/inbox-placement-reports?test_id=$TEST_ID&skip_spam_assassin_report=false&skip_blacklist_report=false"
```

Poll every 30 seconds. Print elapsed time each cycle. Timeout after 10 minutes — if still incomplete, print: "Test taking longer than expected. Test ID: {TEST_ID}. Check results manually in the Instantly dashboard."

Completion indicator: `status` field transitions to a completed state (non-zero results returned with full domain data).

---

## Step 4 — Surface Results + Flag

Build per-domain results table from the response. Key fields per domain:
- `domain`
- `spam_assassin_score`
- `domain_blacklist_count`, `domain_ip_blacklist_count`
- `blacklist_report.is_blacklisted`
- Inbox % and spam % by provider (from per-provider breakdown)

```
Domain              | SA Score | Blacklisted | Inbox % | Spam % | Status
--------------------|----------|-------------|---------|--------|--------
send1.example.com   | 1.2      | No          | 94%     | 6%     | ✅ Healthy
send2.example.com   | 4.8      | No          | 61%     | 39%    | ⚠️  Flagged (SA score > 3)
send3.example.com   | 0.9      | No          | 97%     | 3%     | ✅ Healthy
send4.example.com   | 2.1      | Yes         | 45%     | 55%    | ⚠️  Flagged (blacklisted)
```

Flag criteria:
- SA score > SA_THRESHOLD (default: 3)
- `is_blacklisted = true` (when FLAG_BLACKLISTED: true)

List all inboxes belonging to flagged domains with their daily caps and total volume being vacated.

**Approval gate:** "Found {N} flagged domain(s): {list}. Removing {M} inboxes vacates {X} emails/day. Proceed with rotation? [y/n]"

Student can override — e.g. keep a domain despite a marginal SA score.

---

## Step 5 — Rotate Out Flagged Domains

On confirmation, GET current `email_list`, filter out all flagged-domain inboxes, PATCH the result:

```bash
# Step 5a — GET current email_list
CURRENT_LIST=$(curl -s -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  "https://api.instantly.ai/api/v2/campaigns/$CAMPAIGN_ID" | python3 -c "
import json,sys
r = json.load(sys.stdin)
flagged = ['send2.example.com', 'send4.example.com']  # from Step 4
kept = [e for e in r.get('email_list', []) if e.split('@')[1] not in flagged]
print(json.dumps(kept))
")

# Step 5b — PATCH with filtered list (standbys added in Step 7)
# Hold off on patching until standbys are selected — do one combined PATCH
```

Calculate vacated daily volume: sum of daily caps for removed inboxes (use `daily_limit` values from Step 2a).

⚠️ `email_list` PATCH is a full SET — always GET, filter, then PATCH the complete new array. Never send a partial list.

---

## Step 6 — Find Standby Inboxes

Look for a campaign named **"Standby"** — this is the designated standby pool. Pull its `email_list`.

```bash
curl -s -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  "https://api.instantly.ai/api/v2/campaigns?limit=100" | python3 -c "
import json,sys
campaigns = json.load(sys.stdin).get('items', [])
for c in campaigns:
    if c['name'].strip().lower() == 'standby':
        pool = c.get('email_list', [])
        print(f'Standby campaign found: {len(pool)} inboxes')
        print(json.dumps(pool))
        break
else:
    print('NOT_FOUND')
"
```

If the Standby campaign is not found or has 0 inboxes — **abort and warn:**
> "Standby campaign is empty. Add warmed inboxes to the 'Standby' campaign in Instantly before running rotation."

Get warmup scores for standby inboxes and filter to those meeting STANDBY_WARMUP_FLOOR:

```bash
curl -s -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  "https://api.instantly.ai/api/v2/accounts?limit=100" | python3 -c "
import json,sys
items = json.load(sys.stdin).get('items', [])
standby_emails = set()  # populated from Standby campaign email_list above
candidates = [m for m in items
              if m['email'] in standby_emails
              and m.get('stat_warmup_score', 0) >= 70]
candidates.sort(key=lambda x: x.get('stat_warmup_score', 0), reverse=True)
for m in candidates:
    cap = 40 if m.get('stat_warmup_score', 0) > 80 else 20
    print(m['email'], 'score:', m.get('stat_warmup_score'), 'cap:', cap)
"
```

Select enough standbys to cover the vacated daily volume. Cap tiers:
- `stat_warmup_score > 80` → 40 emails/day
- `stat_warmup_score 60–80` → 20 emails/day

Use `stat_warmup_score` from `list_accounts` directly — no separate warmup analytics call needed.

---

## Step 7 — Rotate In + Verify

Combine kept inboxes + selected standbys into one PATCH:

```bash
curl -s -X PATCH "https://api.instantly.ai/api/v2/campaigns/$CAMPAIGN_ID" \
  -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email_list\": $(echo $KEPT_LIST $STANDBY_LIST | python3 -c 'import json,sys; print(json.dumps(json.loads(sys.stdin.read())))')}"
```

Show before/after allocation table:

```
BEFORE                              AFTER
Domain            Cap              Domain                     Cap
send1.example.com 40/day    →     send1.example.com          40/day  (kept)
send2.example.com 20/day    →     standby1.newdomain.com     40/day  (new — score 85)
send3.example.com 40/day    →     send3.example.com          40/day  (kept)
send4.example.com 20/day    →     standby2.newdomain.com     20/day  (new — score 72)

Total daily volume: 120/day → 140/day
```

Verify final state:

```bash
curl -s -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  "https://api.instantly.ai/api/v2/campaigns/$CAMPAIGN_ID" | python3 -c "
import json,sys
r = json.load(sys.stdin)
emails = r.get('email_list', [])
domains = set(e.split('@')[1] for e in emails)
print(f'Campaign: {r[\"name\"]}')
print(f'Inboxes: {len(emails)} across {len(domains)} domain(s)')
for d in sorted(domains):
    count = sum(1 for e in emails if e.split('@')[1] == d)
    print(f'  {d} — {count} inboxes')
"
```

---

## API Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| List campaigns (resolve name → ID) | GET | `/api/v2/campaigns?limit=100` |
| Get campaign (email_list) | GET | `/api/v2/campaigns/{id}` |
| List accounts (warmup scores) | GET | `/api/v2/accounts?limit=100` |
| Get lead content for test | POST | `/api/v2/leads/list` (body: `{"campaign": "id", "limit": 1}`) |
| ESP options (required) | GET | `/api/v2/inbox-placement-tests/email-service-provider-options` |
| Trigger placement test | POST | `/api/v2/inbox-placement-tests` |
| Poll results | GET | `/api/v2/inbox-placement-reports?test_id={id}&skip_spam_assassin_report=false&skip_blacklist_report=false` |
| Update campaign inboxes | PATCH | `/api/v2/campaigns/{id}` |
| Find Standby campaign | GET | `/api/v2/campaigns?limit=100` (match name = "Standby") |

**Auth:** `Authorization: Bearer $INSTANTLY_API_KEY`
**Key:** `grep 'INSTANTLY_API_KEY' .env | tr -d '\r' | cut -d'=' -f2`

**Critical gotchas:**
- `recipients_labels` must use `{region, sub_region, type, esp}` — the official docs show `{provider, type}` which is wrong. Always fetch from the ESP options endpoint.
- `emails` field in the placement test payload = your FROM sending inboxes, not lead emails
- `email_list` PATCH is a full SET — GET first, merge, then PATCH the complete array
- Warmup inboxes (`daily_limit < 20`) make placement tests take hours — check before firing
- Lead custom variables are stored under `payload`, not `custom_variables` — use `payload.subject`, `payload.email_body` when pulling representative content
- Standby detection via `list_campaigns` works reliably for < 20 active campaigns; warn if more

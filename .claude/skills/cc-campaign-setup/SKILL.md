---
name: cc-campaign-setup
description: Session 4 demo skill — reads Copy Ready tab from a Google Sheet, creates an Instantly campaign with sequences using custom variable placeholders, and bulk imports leads with their personalized copy. Use when demoing the LinkedIn → Instantly pipeline end-to-end.
argument-hint: "[google-sheet-url] [campaign-name]"
---

## Configuration

```
DEMO_MODE: true          # true = skip inbox attachment (no standby pool needed for demo)
STEP_GAP_DAYS: 3         # delay between sequence steps (if multi-step)
SEND_DAYS: Mon–Fri
SEND_WINDOW: 08:00–17:00
TIMEZONE: America/Dawson # America/Los_Angeles is INVALID in Instantly — use America/Dawson (Pacific equivalent)
EMAIL_STATUS_FILTER: all # set to "valid,catch_all" if sheet has an Email Status column
```

## Column Map

Maps Copy Ready tab headers → Instantly fields. Edit if your sheet headers differ.

```
email:        Email
name:         Name           # split into firstName / lastName at import
subject:      Subject        # → customVariables.subject
hook:         Hook           # → customVariables.hook
body:         Body           # → customVariables.body
value_prop:   Value Proposition  # → customVariables.value_prop
cta:          CTA            # → customVariables.cta
ps:           P.S.           # → customVariables.ps
linkedin_dm:  LinkedIn DM    # → customVariables.linkedin_dm
context_score: Context Score # → customVariables.context_score (optional)
```

---

## Step 1 — Read Copy Ready Tab

Read the Google Sheet argument. Pull the "Copy Ready" tab.

```bash
# Use gws sheets or mcp__google-workspace__sheets
# resource: spreadsheets.values, method: get
# params: { spreadsheetId: SHEET_ID, range: "Copy Ready!A1:Z100" }
```

Parse all rows. Show pre-flight summary:

```
Total leads:     23
Columns found:   Name · Email · Subject · Hook · Body · Value Proposition · CTA · P.S. · LinkedIn DM
All will be imported (no email_status filter)
```

Proceed automatically — no approval gate here.

---

## Step 2 — Create Campaign

```bash
INSTANTLY_API_KEY=$(grep 'INSTANTLY_API_KEY' /Users/cheetung/Apps/claude-code/workspace/.env | tr -d '\r' | cut -d'=' -f2)

curl -s -X POST https://api.instantly.ai/api/v2/campaigns \
  -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "{{campaign_name}}",
    "daily_limit": 200,
    "text_only": true,
    "first_email_text_only": true,
    "email_gap": 45,
    "random_wait_max": 10,
    "stop_on_reply": true,
    "stop_on_auto_reply": false,
    "link_tracking": false,
    "open_tracking": false,
    "prioritize_new_leads": true,
    "match_lead_esp": false,
    "allow_risky_contacts": false,
    "disable_bounce_protect": false,
    "campaign_schedule": {
      "schedules": [{
        "name": "Default",
        "timing": {"from": "08:00", "to": "17:00"},
        "days": {"0": false, "1": true, "2": true, "3": true, "4": true, "5": true, "6": false},
        "timezone": "America/Dawson"
      }]
    }
  }'
```

Capture `id` as `CAMPAIGN_ID`.

**If DEMO_MODE: true** — skip inbox attachment. Print:
> "DEMO_MODE enabled — inbox attachment skipped. Attach inboxes from your standby campaign when ready."

**If DEMO_MODE: false** — attach inboxes from standby campaign (see Step 3 below).

---

## Step 3 — Attach Inboxes (skip if DEMO_MODE: true)

Identify the standby campaign. Pull its `email_list`. Filter to inboxes with `stat_warmup_score` meeting threshold (default: score > 60).

Show allocation table before patching:

```
Domain              | Score | Cap    | Inboxes
--------------------|-------|--------|--------
send1.example.com   | 87    | 40/day | 3
send2.example.com   | 74    | 20/day | 2
```

**Approval gate:** Confirm before patching.

On approval:
```bash
# PATCH is a SET operation — always send the full email_list array
curl -s -X PATCH "https://api.instantly.ai/api/v2/campaigns/$CAMPAIGN_ID" \
  -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email_list": ["inbox1@domain.com", "inbox2@domain.com"]}'
```

⚠️ `email_list` PATCH replaces the entire list. Never send a partial array.

**Custom variables storage:** Variables sent as `custom_variables` in the lead payload are stored under `lead.payload` in the API response — not a `custom_variables` field. This is correct — Instantly resolves `{{variable}}` placeholders from `payload` at send time.

---

## Step 4 — Load Sequence

Single-step sequence using two custom variable placeholders: `{{subject}}` and `{{email_body}}`.

**Do NOT split the body into multiple variables** (`{{hook}}\n\n{{body}}`). Instantly does not reliably honour newlines between variable substitutions — the result is a wall of text. Pre-assemble the full email body into a single `{{email_body}}` variable with `\n\n` paragraph breaks built in at import time.

```bash
curl -s -X PATCH "https://api.instantly.ai/api/v2/campaigns/$CAMPAIGN_ID" \
  -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sequences": [{
      "steps": [{
        "type": "email",
        "delay": 0,
        "variants": [{
          "subject": "{{subject}}",
          "body": "{{email_body}}"
        }]
      }]
    }]
  }'
```

For multi-step sequences (if sheet has Email 2 / Email 3 columns), add additional steps with `"delay": 3` and `"delay": 6` using `{{subject_2}}`, `{{email_body_2}}` etc.

A/B test = multiple objects in the `variants` array. Instantly rotates automatically.

---

## Step 5 — Bulk Import Leads

Build a leads array from the sheet rows. Map columns per the Column Map above.

```bash
curl -s -X POST "https://api.instantly.ai/api/v2/leads/add" \
  -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "CAMPAIGN_ID",
    "leads": [
      {
        "email": "lead@company.com",
        "firstName": "Jane",
        "lastName": "Smith",
        "customVariables": {
          "subject": "personalized subject line",
          "hook": "opening hook paragraph",
          "body": "main email body",
          "value_prop": "value proposition",
          "cta": "call to action",
          "ps": "P.S. line",
          "linkedin_dm": "LinkedIn DM copy",
          "context_score": "high"
        }
      }
    ]
  }'
```

Show import summary after:
```
Total sent:      23
Leads uploaded:  23
Duplicates:       0
Blocklisted:      0
Invalid email:    0
```

**Dedup check (optional):** Before importing, call `GET /api/v2/campaigns/search?email=lead@company.com` to skip leads already active in another campaign.

---

## Step 6 — Verify + Report

```bash
curl -s -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  "https://api.instantly.ai/api/v2/campaigns/$CAMPAIGN_ID" | python3 -c "
import json,sys
r = json.load(sys.stdin)
print(f'Campaign: {r[\"name\"]}')
print(f'ID: {r[\"id\"]}')
print(f'Status: {r[\"status\"]} (0=Paused)')
print(f'Inboxes: {len(r.get(\"email_list\", []))}')
print(f'Sequences: {len(r.get(\"sequences\", []))} sequence')
print(f'Daily limit: {r[\"daily_limit\"]}')
"
```

Also verify leads loaded:
```bash
curl -s -X POST "https://api.instantly.ai/api/v2/leads/list" \
  -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"campaign": "CAMPAIGN_ID", "limit": 5}' | python3 -c "
import json,sys
r = json.load(sys.stdin)
leads = r.get('items', [])
print(f'Sample leads in campaign: {len(leads)}')
for l in leads[:3]:
    print(f'  {l[\"email\"]} — subject: {l.get(\"customVariables\", {}).get(\"subject\", \"(none)\")}')
"
```

Report back:
```
Campaign: {{campaign_name}}
ID:       {{CAMPAIGN_ID}}
Status:   Paused — ready to activate
Inboxes:  {{N}} attached  (or: "0 — DEMO_MODE, attach from standby when ready")
Sequence: 1 step · Subject: {{subject}} · Body: hook/body/cta/ps
Leads:    {{N}} imported, 0 duplicates, 0 invalid
```

---

## API Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Create campaign | POST | `/api/v2/campaigns` |
| Update campaign (inboxes, sequences) | PATCH | `/api/v2/campaigns/{id}` |
| Add leads | POST | `/api/v2/leads/add` |
| List leads in campaign | POST | `/api/v2/leads/list` (body: `{"campaign": "id"}`) |
| Dedup check | GET | `/api/v2/campaigns/search?email=...` |
| Activate | POST | `/api/v2/campaigns/{id}/activate` |

**Auth:** `Authorization: Bearer $INSTANTLY_API_KEY`
**Key:** `grep 'INSTANTLY_API_KEY' /Users/cheetung/Apps/claude-code/workspace/.env | tr -d '\r' | cut -d'=' -f2`

**Learnings:** See `learnings.md` → "Instantly API (Session 4)" section for full gotcha list.

Key gotchas baked in here:
- `America/Los_Angeles` is INVALID — use `America/Dawson`
- `email_list` PATCH is a SET operation — always GET first, merge, then PATCH full array
- `POST /leads/add` is the only correct bulk import endpoint (`/campaigns/{id}/leads` = 404)
- Sequence bodies use `{{variable_name}}` — copy goes on the lead record as `customVariables`, not in the sequence body

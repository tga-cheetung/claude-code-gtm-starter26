---
name: HubSpot is the source of truth for contacts and deals
description: All contact, deal, and activity records live in HubSpot — never parallel-track in spreadsheets
type: reference
---

HubSpot is the system of record for contacts, deals, and outreach activity. Workspace ID lives in `.env` as `HUBSPOT_PORTAL_ID`.

**How to apply:** When the user asks "have we talked to X?" or "what's the status on Y deal?" — check HubSpot first via the API or the cheatsheet at `~/tool-docs/cheatsheets/hubspot.md`. Do not propose tracking outreach state in CSVs or Notion — those drift out of sync within a week.

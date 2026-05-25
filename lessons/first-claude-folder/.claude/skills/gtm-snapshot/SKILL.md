---
name: gtm-snapshot
description: Run a GTM Snapshot on a single prospect — pull public context (site + LinkedIn), score ICP fit, surface 2–3 buying signals, and draft a one-pager talk track. Use when the user types `/gtm-snapshot <company-domain>` or names a target account in conversation.
---

# GTM Snapshot Skill

## When to invoke
- User types `/gtm-snapshot <domain>` (e.g. `/gtm-snapshot northwindlabs.com`)
- User says "run a snapshot on X" or "pull context on X"
- User pastes a company URL and asks "what should I send them?"

## Required env (workspace root `.env`)
- `EXA_API_KEY` — for context search
- `PERPLEXITY_API_KEY` — fallback context source
- `NOTION_API_KEY` — to write the one-pager into Notion

## Inputs
- Company domain (required)
- Founder name (optional — looked up via web search if missing)

## Flow

### Step 1 — Hydrate context (parallel)
Fan out three reads in parallel:
- Web search: `<domain>` site copy → positioning, customer logos
- Web search: `<founder-name> linkedin` → recent posts, public stance
- HubSpot lookup: any prior touches with this domain

Cap each search to 5 results. Stop if zero hits — escalate to user.

### Step 2 — Score ICP fit
Load `.claude/os/ICP.md`. Score against the 5 firmographic gates:
1. ARR band ($1–8M)
2. Headcount (5–25)
3. B2B SaaS vertical
4. Founder still owns sales
5. Post-PMF (paying customers, not pre-revenue)

Output: HOT / WARM / COOL + one-line reason per gate.

### Step 3 — Find 2–3 buying signals
Look for any of:
- Recent funding round (last 90 days)
- Hiring posts for GTM/SDR/Marketing
- Founder posting publicly about pipeline pain
- Competitor naming or "vs" content
- Customer churn complaints in reviews

If fewer than 2 signals found, drop to COOL regardless of firmographic score.

### Step 4 — Draft the one-pager
Use the talk-track template:
- TL;DR (one sentence)
- Why now (the 2–3 signals)
- One specific recommendation tied to our offer
- Soft CTA — book the discovery call

Tone: load `.claude/os/TOV.md`. No buzzwords. American English.

### Step 5 — Write to Notion
Create a page in the **GTM Snapshots** database with:
- Domain, Founder, Score, Signals, One-pager body
- Status: `Draft`

Return the Notion URL to the user for review.

## Failure modes
- No public footprint → return `Insufficient context — manual research required`
- ICP gate fail → still produce snapshot, but flag prominently at top
- Notion API down → write the one-pager to `tmp/snapshots/<domain>-<date>.md` and tell the user

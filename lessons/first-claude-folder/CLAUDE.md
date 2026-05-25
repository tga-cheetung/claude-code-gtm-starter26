# Acme Outbound — Project Context

## Business Overview

**Positioning:** Acme Outbound builds done-with-you cold email + LinkedIn engines for early-stage B2B SaaS founders. Client owns the system from Day 1 — no agency lock-in.

**ICP (locked 2026-04-01):** Founder-led B2B SaaS at **$1–8M ARR (sweet spot $2–4M)**. Post-PMF, 5–25 employees, 0–1 dedicated GTM hires. Founder still owns sales and outbound. Defining pain is *founder bandwidth caps revenue growth* — not "we need more leads."

**Canonical source:** `.claude/os/ICP.md` — full firmographics, anti-ICP, offer ladder, lead scoring.

**Primary buyer:** the founder. Buyer question they're holding: *"Who can build this without me babysitting it — and hand it back when it's running?"*

### Current State (May 2026)
- $9K MRR. Pipeline: Northwind Labs (Priya) + Brightline AI (Diego) — both pitched the $2K Build sprint.
- Conversion weapon: GTM Snapshot → $2K Build → ascension to monthly retainer.
- Booking: `https://acme.example.com/book`

---

## Tech Stack

| Area | Tool |
|---|---|
| CRM | HubSpot |
| Docs/SOPs | Notion |
| Email (primary) | Instantly |
| Deliverability | InboxKit |
| Automation | n8n |
| Enrichment | Clay + Apify |
| AI | Claude API |
| Decks | Gamma |

---

## Key Docs & Architecture

- `outbound-engine/docs/pipeline.md` — pipeline architecture and live campaign IDs (read at the start of any outbound session)
- `Clients/` — per-client folders (Northwind, Brightline) + `_templates/`
- `docs/reference/mcp-servers.md` — full MCP config

---

## Outbound OS

Source-of-truth copy files live in `.claude/os/`:
- `.claude/os/ICP.md` — targeting criteria, anti-signals, scoring
- `.claude/os/TOV.md` — tone of voice, banned phrases, channel rules
- `.claude/os/BRIEFING.md` — current offer, locked CTAs, messaging pillars

Copy loading rules and template selection scoring → `.claude/rules/outbound-copy.md` (auto-loads when working in `.claude/os/` or `outbound-engine/`).

---

## API & Tool Usage

Always check the cheatsheet first: `~/tool-docs/cheatsheets/{tool}.md`
Full API workflow → `.claude/rules/api-usage.md`.

---

## Project Notes

- Never commit `.env` — keys via env only
- n8n Cloud: check node compatibility when importing workflows
- Workspace: `~/Apps/acme-outbound/workspace`

# Northbound GTM — Demo Workspace

**RevOps AI Curriculum** — an internal Claude Code workspace for building and demoing automated outbound GTM systems. Built live across 7 sessions.

---

## Business Context

Northbound GTM is an outbound agency for B2B SaaS companies ($0–$10M ARR, pre-seed through Series A). We build signal-based outbound systems and hand them off — no retainers, no lock-in. Revenue model: fixed-fee GTM system builds + optional fractional operator retainers.

Active client count: ~15. Pipeline comes primarily from LinkedIn post engagement scraping and hiring signal monitoring. Primary demo account: **Horizn** (construction project management SaaS targeting general contractors with 20–150 employees).

**Core ICP (Northbound):** SaaS founders — CEOs and co-founders of B2B SaaS companies at $0–$10M ARR. Global. Key pain: founder is the GTM team, revenue capped by their bandwidth. Best signals: posting about hiring first sales rep, pipeline frustration, fired an agency, or raised a seed/Series A without a GTM hire. Exclude agency founders and non-founder roles.

**Horizn ICP (demo client):** Operations directors and estimators at mid-sized general contractors. Key pain: job cost overruns from disconnected field-to-office workflows. Current state: Procore at $30K+/yr or spreadsheets. Best signals: posting estimator/project manager jobs, sharing LinkedIn posts about takeoff software frustration, company headcount 15–75.

**Case studies:**
- *Hiring signal campaign:* Scraped GC firms posting estimator roles → personalized around growth pain → 5.2% reply rate, 18 demos in 5 weeks
- *LinkedIn engagement scrape:* Monitored post engagers on "construction software" frustration posts → 60 leads identified → 9 booked in 4 days via same-day outreach
- *Tech displacement:* BuiltWith-identified Procore users under 50 employees → "Procore without the enterprise tax" angle → 3.9% reply rate across 340 contacts

---

## This Project

A working LinkedIn → Smartlead pipeline in TypeScript. Scrapes engagers from target posts/profiles, classifies by ICP fit, enriches contact data, verifies emails, generates AI copy, pushes to campaigns.

```
scripts/linkedin-pipeline/
├── 01-scrape.ts          # Pull engagers from LinkedIn via Apify
├── 02-filter.ts          # ICP filter + RevyOps dedup check
├── 03-classify.ts        # Claude AI scoring (ICP fit + pain signal)
├── 04-enrich.ts          # LeadMagic → Prospeo → Perplexity waterfall
├── 05-verify.ts          # Email deliverability verification (Prospeo)
├── 06-copy.ts            # AI personalized cold email copy
├── 07-push-smartlead.ts  # Push verified leads via Smartlead CLI + stage to RevyOps
└── pipeline.ts           # Full orchestrator (chains all steps)
```

**Commands:**
```bash
npm run scrape           # Step 1 — scrape engagers
npm run filter           # Step 2 — ICP filter + RevyOps dedup
npm run classify         # Step 3 — Claude AI scoring
npm run enrich           # Step 4 — enrichment waterfall
npm run verify           # Step 5 — email verification
npm run copy             # Step 6 — AI copy generation
npm run push             # Step 7 — Smartlead CLI push
npm run pipeline         # Full pipeline
npm run pipeline -- --from-step=3   # Skip to step 3
npm run pipeline -- --dry-run       # Stop before push (safe for testing)
```

---

## MCPs Available

| MCP | Primary use |
|-----|-------------|
| `apify` | LinkedIn scrapers — `harvestapi/linkedin-post-reactions`, `harvestapi/linkedin-post-comments`, `harvestapi/linkedin-profile-posts` |
| `n8n` | Workflow automation triggers |
| `perplexity` | Web-grounded research |
| `notion` | Documentation and knowledge base |

**Note:** Smartlead connects via CLI (`npm install -g @smartlead/cli`), not MCP. RevyOps is the canonical lead database — use the REST API directly (`docs/revyops-api.md`).

---

## Skills Available (`.claude/skills/`)

| Skill | When to use |
|-------|-------------|
| `scrape-post-eg` | Given a post URL + Google Sheet URL → scrape all reactors/commenters → filter by ICP → write to sheet |

---

## Google Sheets

Default target: `https://docs.google.com/spreadsheets/d/1Trv66zVqPXDV7vo-srLmu_nYLwK5z9OKoc2Peu4eT8Y/edit`
Sheet ID: `1Trv66zVqPXDV7vo-srLmu_nYLwK5z9OKoc2Peu4eT8Y`

Write pattern (always clear first to avoid stale data):
```bash
gws sheets spreadsheets values clear --params '{"spreadsheetId": "SHEET_ID", "range": "Sheet1"}'
gws sheets spreadsheets values update --params '{"spreadsheetId": "SHEET_ID", "range": "Sheet1!A1", "valueInputOption": "RAW"}' --json '{"values": [...]}'
```

---

## Learnings

Gotchas and debugging notes from previous sessions live in `learnings.md` at the repo root.

- **When stuck or getting unexpected results:** Read `learnings.md` first. It likely documents the exact issue.
- **When you discover a significant gotcha** (wrong field names, API quirks, broken assumptions, workarounds): Append it to `learnings.md` so the next session doesn't hit the same wall.

---

## Conventions

- **TypeScript strict** — no `any` without a comment explaining why
- **Pipeline I/O:** Each step reads JSON from `data/runs/YYYY-MM-DD/`, writes JSON to same dir
- **Demo fallback:** If today's run file is missing, pipeline loads from `data/checkpoints/` (pre-seeded for live demos)
- **Claude model:** `claude-sonnet-4-6` for classification/copy, haiku for bulk/cheap ops
- **Never commit `.env`** — API keys via env only

---

## Gotchas

- **Pipeline wiring:** Steps are only chained in `pipeline.ts` after Session 6. Earlier sessions run individual step scripts.
- **Smartlead push is irreversible** — always use `--dry-run` first when testing the campaign push step
- **Smartlead uses CLI, not MCP** — `npm install -g @smartlead/cli`, then `smartlead campaigns list`
- **Apify actors are sync by default** — `call-actor` blocks until done; no polling needed
- **LinkedIn URLs:** Strip `?utm_source=...` tracking params before passing to Apify actors
- **gws CLI** is at `/opt/homebrew/bin/gws` (`@googleworkspace/cli@0.7.0`)

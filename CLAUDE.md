# Claude Code for GTM — Workspace Context

A working LinkedIn → Instantly pipeline. Scrapes engagers from a target post, qualifies by ICP, enriches contacts (LeadMagic → AI Ark → Exa), generates personalized copy, pushes to an Instantly campaign, posts a Slack summary. Triggered live by `/engage <linkedin-post-url>` from Slack via an n8n webhook proxy.

This repo is the deliverable of the 5-session **Claude Code for GTM** course. It evolves session-by-session; the final state (after Session 5) ships as production-grade Trigger.dev tasks.

---

## Architecture

```
src/trigger/
├── config.ts              # ICP titles, skip lists, FIRM_CONTEXT — edit for your business
├── types.ts               # RawPerson → ... → Lead pipeline shapes
├── lib/                   # Typed wrappers around external APIs
│   ├── apify.ts           # HarvestAPI reactions + comments + ACoAAA resolver
│   ├── leadmagic.ts       # profile-find + email-finder
│   ├── ai-ark.ts          # secondary email source (X-TOKEN auth)
│   ├── exa.ts             # context search + signal extraction
│   ├── openai.ts          # ICP scoring + copy gen (gpt-4o-mini, JSON mode)
│   ├── revyops.ts         # dedup check + stage contact (master-list endpoint)
│   ├── instantly.ts       # bulk add + per-lead PATCH for custom variables
│   ├── slack.ts           # chat.postMessage + slash command parsing
│   └── concurrent.ts      # withConcurrency helper for bulk async
└── tasks/                 # Trigger.dev task definitions
    ├── 01-scrape-post.ts
    ├── 02-headline-filter.ts
    ├── 03-hard-filters.ts
    ├── 04-dedup-check.ts
    ├── 05-enrich-leads.ts
    ├── 06-icp-scoring.ts
    ├── 07-generate-copy.ts
    ├── 08-stage-revyops.ts
    ├── 09-push-instantly.ts
    └── orchestrator.ts    # Chains all 9 via triggerAndWait, posts Slack summary

n8n/session5-engage.json   # Webhook → parse → fire orchestrator
scripts/
├── run-test.ts            # Trigger orchestrator from CLI (no n8n needed)
├── run-from-cache.ts      # Re-run scoring/copy/push from a prior enriched run
├── snapshot-run.ts        # Pull a Trigger.dev run + all child runs to disk
└── push-n8n-workflow.ts   # Deploy n8n/session5-engage.json to your n8n instance
```

---

## Commands

```bash
npm run dev            # Start the Trigger.dev dev session — keep open in a real terminal
npm run deploy         # Deploy tasks to your Trigger.dev project (prod)
npm run push-workflow  # Deploy the n8n workflow to your n8n cloud instance

npx tsx scripts/run-test.ts <linkedin-post-url> [--max=N] [--no-dry]
npx tsx scripts/snapshot-run.ts <orchestrator-run-id>
npx tsx scripts/run-from-cache.ts <orchestrator-run-id>
```

---

## Skills available (`.claude/skills/`)

The skills are the human-in-the-loop versions of the same logic, used in Sessions 1–4 before the pipeline ships. After Session 5, the skills become reference material; the Trigger.dev tasks in `src/trigger/` are what runs in production.

| Skill | Use |
|---|---|
| `scrape-post` | Scrape engagers + filter to ICP, write to a Google Sheet |
| `filter-engagers` | Read sheet, headline filter + ICP scoring + dedup |
| `enrich-and-copy` | Read qualified leads, run enrichment waterfall + copy gen |
| `cc-campaign-setup` | Create Instantly campaign and bulk import leads |

---

## Gotchas

Hard-won notes from building this live live in `learnings.md` at the repo root. Read it before touching `src/trigger/lib/` — it documents non-obvious response shapes, auth header quirks, rate limits, and dev-mode rebuild behavior. Append new findings as you hit them.

---

## Conventions

- **TypeScript strict** — no `any` without a comment explaining why
- **Pipeline I/O:** each task takes a typed input object and returns a typed output object
- **Concurrency caps inside tasks:** 3 for AI Ark (it 429s above that), 5 for everything else
- **AI models:** `gpt-4o-mini` for both scoring and copy gen
- **Never commit `.env`** — keys via env only

---

## Session 5 Notion lesson

The lesson page (architecture diagram + the 8-prompt migration sequence) is the canonical doc for how the student gets from the Sessions 1–4 skill state to this Trigger.dev state. Link lives in the course materials database.

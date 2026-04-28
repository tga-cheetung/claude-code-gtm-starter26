# Claude Code for GTM — Course Workspace

The working repo for the 5-session **Claude Code for GTM** course. By the end, you'll have a signal-based outbound system that runs from a single Slack command: scrape LinkedIn post engagers → qualify by ICP → enrich contacts → generate personalized copy → push to an Instantly campaign → notify Slack. No coding background required.

---

## Quick Start

**Step 1 — Clone this repo and open it in VS Code:**
```bash
git clone <this-repo-url>
cd <repo-folder>
code .
```

**Step 2 — Run the init script:**
```bash
bash init.sh
```
This checks your environment, installs dependencies, and walks you through setting up your API keys.

**Step 3 — Open Claude Code and verify:**
```
claude
```
Type `hello` — if Claude responds, you're ready for Session 1.

---

## What You'll Build

| Session | Theme | Deliverable |
|---|---|---|
| **1** | Before vs After | `/scrape-post` skill → Google Sheet of post engagers |
| **2** | Filter Before You Spend | ICP qualifier → scored, filtered leads |
| **3** | APIs Under the Hood | Enrichment waterfall → verified emails + copy |
| **4** | Sequencer Operations | Live Instantly campaign launched from a sheet |
| **5** | The Full Machine | Trigger.dev pipeline + Slack `/engage` command |

The end state after Session 5: type `/engage <linkedin-post-url>` in Slack, walk away, get a notification ~50 seconds later with the leads pushed to Instantly. No laptop required.

---

## Repo Layout

- **`src/trigger/`** — The production pipeline (9 Trigger.dev tasks + orchestrator)
- **`.claude/skills/`** — Skill files used in Sessions 1–4 (Claude Code playbooks)
- **`n8n/`** — Webhook workflow that receives Slack `/engage` and fires the orchestrator
- **`scripts/`** — CLI utilities for testing the pipeline + deploying the n8n workflow
- **`learnings.md`** — Hard-won notes on API quirks, response shapes, and dev-mode behavior. **Read this before touching `lib/`.**

---

## Before-Each-Session Checklist

- `git pull` to grab any updates
- `bash init.sh --session=N` (where N is the session you're about to start)
- `npm install` if dependencies changed
- Open Claude Code in this folder

---

## Stack

- **Trigger.dev** — durable task runner for the production pipeline
- **n8n** — webhook proxy between Slack and Trigger.dev (no Vercel needed)
- **Apify** (HarvestAPI actors) — LinkedIn scraping
- **LeadMagic + AI Ark + Exa** — enrichment waterfall
- **OpenAI** (gpt-4o-mini) — ICP scoring and copy generation
- **RevyOps** — canonical lead database (dedup + stage)
- **Instantly** — campaign destination
- **Slack** — `/engage` slash command + bot-token notifications

# Claude Code for GTM — Course Workspace

The working repo for **[Claude Code for GTM](https://www.notion.so/thegtmarchitects/Claude-Code-for-GTM-Course-Materials-3258d40b622180fdbe7fee06b547169d)** — a 6-session live course by [The GTM Architects](https://www.thegtmarchitects.com).

You'll build a signal-based outbound system from scratch: scrape LinkedIn post engagers → qualify by ICP → enrich contacts → generate personalized copy → launch Smartlead campaigns → deploy to production. No coding background required.

---

## Quick Start

**Step 1 — Clone this repo and open it in VS Code:**
```bash
git clone https://github.com/tga-cheetung/northbound-gtm.git
cd northbound-gtm
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
|---------|-------|-------------|
| **1** | Before vs After | `/scrape-post-eg` skill → Google Sheet of post engagers |
| **2** | Filter Before You Spend | ICP qualifier → scored, filtered leads |
| **3** | APIs Under the Hood | Enrichment waterfall → verified emails + copy |
| **4** | Prototype to Production | Smartlead CLI campaign launch |
| **5** | The Full Machine | Trigger.dev deploy + Slack `/engage` command |

---

## Repo Structure

```
scripts/linkedin-pipeline/
├── 01-scrape.ts          # Apify LinkedIn scraper
├── 02-filter.ts          # ICP filter + RevyOps dedup
├── 03-classify.ts        # Claude AI scoring
├── 04-enrich.ts          # LeadMagic → Prospeo → Perplexity
├── 05-verify.ts          # Email verification
├── 06-copy.ts            # AI copy engine
├── 07-push-smartlead.ts  # Smartlead CLI push
└── pipeline.ts           # Full orchestrator

.claude/skills/
└── scrape-post-eg.md     # Session 1 skill (built live)

docs/
└── revyops-api.md        # RevyOps API reference
```

Each step is built live during its session — files start as empty stubs.

---

## Prerequisites

| Tool | Used for | Install |
|------|----------|---------|
| Node.js 18+ | Running TypeScript scripts | [nodejs.org](https://nodejs.org) |
| Claude Code | The AI coding environment | `npm install -g @anthropic-ai/claude-code` |
| gws CLI | Writing to Google Sheets | `npm install -g @googleworkspace/cli` |
| Smartlead CLI | Campaign management (S5+) | `npm install -g @smartlead/cli` |

**API keys needed for Session 1:**
- `APIFY_API_KEY` — [console.apify.com](https://console.apify.com/account/integrations)
- `ANTHROPIC_API_KEY` — [console.anthropic.com](https://console.anthropic.com/keys)

Additional keys for later sessions are listed in `.env.example`.

---

## Setup Files

| File | Purpose |
|------|---------|
| `.env.example` | Template for your API keys — copy to `.env` and fill in |
| `.mcp.json.example` | Template for MCP server config — copy to `.mcp.json` and add keys |

`.env` and `.mcp.json` are gitignored and never committed.

---

## Commands

```bash
npm run scrape     # Step 1 — scrape post engagers
npm run filter     # Step 2 — ICP filter
npm run classify   # Step 3 — AI scoring
npm run enrich     # Step 4 — enrichment waterfall + copy generation
npm run verify     # Step 5 — email verification
npm run copy       # Step 6 — copy generation
npm run push       # Step 7 — Smartlead push (always --dry-run first)
npm run pipeline   # Full pipeline
npm run pipeline -- --dry-run   # Safe test run (stops before push)
```

---

## Course Materials

- [Course overview + all sessions](https://www.notion.so/thegtmarchitects/Claude-Code-for-GTM-Course-Materials-3258d40b622180fdbe7fee06b547169d)
- [Step 0: Setup Guide](https://www.notion.so/3288d40b622181b29549e3e6102ef84c)

---

Built by [The GTM Architects](https://www.thegtmarchitects.com)

---
description: Run the cold-email pipeline on a target list + angle pack
---

Run the 4-step outbound pipeline.

Arguments:
- $1 = absolute path to run dir (e.g. `/Users/me/Apps/acme/workspace/outbound-engine/runs/q2-founder-pain-2026-05-01`)
- $2 = angle pack path relative to `outbound-engine/` (e.g. `angles/founder-bandwidth.md`)

Steps:
1. Load input CSV from `$1/0-input.csv` (must contain: company, domain, founder_name, founder_email)
2. Run agents sequentially: `icp-gate` → `enricher` → `copy-writer` → `qa-validator`
3. Each agent reads the previous agent's output CSV from the run dir and writes its own
4. Final output: `$1/4-validated.csv` — ready for push to Instantly

Agent specs live in `outbound-engine/.claude/agents/`. Run each agent as a dedicated subagent. Check the output CSV exists and has rows before advancing.

Stop and ask before pushing to Instantly. Never auto-push.

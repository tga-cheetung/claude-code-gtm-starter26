# TGA delivery ops

Runners for `os/delivery/*.yaml` playbooks. State in Supabase (`delivery_engagements`, `delivery_stage_runs`) with local fallback at `.state/` (gitignored).

## Quick start

```bash
# Inbox-provision DNSBL screen uses surblclient when installed (see requirements.txt)
pip install -r ops/delivery/requirements.txt

# From workspace root (prefer run.sh — uses .venv-orchestrator for Supabase)
./ops/delivery/run.sh playbook list

python ops/delivery/cli.py engagement start --client tga --playbook standard-engine --sow-signed
python ops/delivery/cli.py engagement status --client tga

python ops/delivery/cli.py stage run inbox-provision --client tga --dry-run
python ops/delivery/cli.py stage complete intake --client tga
```

Apply migration first: `supabase/migrations/20260907_delivery_engagements.sql`

Without Supabase, state writes to `ops/delivery/.state/<client>.json` for local dev.

## Layout

| Path | Role |
|---|---|
| `cli.py` | Entry for agents, shell, Trigger bundle |
| `_lib/` | Playbook loader, state, notify, stage dispatch |
| `<stage>/run.py` | One runner per playbook stage id |
| `trigger/` | Trigger.dev orchestrator (waits + parallel) |
| `api/README.md` | HTTP contract for platform OS |
| `docs/send-estate-notion.md` | Linked Notion DB spec (domains ↔ inboxes) |
| `scripts/emit_send_estate_register.py` | Repo register + `send-estate-notion-plan.json` |
| `tga-delivery/SKILL.md` | **`/tga-delivery` agent skill (canonical, tracked)** |
| `campaign-hypothesis-lab/` | Agent skill, capability index, evidence/budget helpers and reviewed-handoff stage runner |

## Agent skill

`/tga-delivery` — **`ops/delivery/tga-delivery/SKILL.md`** (symlinked to `.claude/skills/tga-delivery/` on install)

`/campaign-hypothesis-lab` precedes `/campaign-strategy`. See [process and invocation](../../os/delivery/campaign-hypothesis-lab.md). Claude and Codex symlinks share the tracked packages; the lab helper runs locally without provider calls, while the agent orchestrates authorized source tools. A stage runner checks the explicit reviewed bundle and otherwise returns `waiting`.

## Secrets (subset only)

Do not clone the full 117-var Railway `.env` onto Trigger.dev. Minimum for inbox-provision live:

- `INBOXKIT_API_KEY`, `INBOXKIT_WORKSPACE_ID`
- `SMARTLEAD_API_KEY`
- `SLACK_BOT_TOKEN` (notify `#tga-agents`)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `TRIGGER_SECRET_KEY` (CLI `trigger start` only)

### Inbox helpers

```bash
./ops/delivery/run.sh inbox rules
./ops/delivery/run.sh inbox screen --client tga --candidates '["example.com"]'
./ops/delivery/run.sh inbox smartlead-sync --client tga --until-done --interval 120
./ops/delivery/run.sh inbox smartlead-tracking --client tga --verify-dns   # Stage 5b after sync
```

Domain rules: `ops/delivery/_lib/inbox_provision/domain-rules.yaml`. Custom tracking: `ROE-INBOX-PROVISION-CHECKLIST.md` Stage **5b**.

## Hard rules

- Never `START` `{client}_standby` or load leads from this ROE.
- `DRY_RUN=1` or `--dry-run` until CT approves money writes.
- InboxKit/Smartlead writes: curl + browser UA, not Python urllib.

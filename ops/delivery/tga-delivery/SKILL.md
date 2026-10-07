---
name: tga-delivery
description: >
  Run TGA delivery playbooks: standard-engine (Build phase), proof (Pipeline Proof only).
  Start engagements, check DAG status, run stages (inbox-provision, signal-pack, mmf, etc.).
  Screen secondary sending domains (.com/.co, prices for CT, estate CLEAR) and poll Smartlead standby.
  DNSBL-listed domain rotation: retire Smartlead→InboxKit→Namecheap; replace via ROE Stage 4–5b (see references/dnsbl-rotation-operator.md).
  Multi-stage ROE: ROE-INBOX-PROVISION-CHECKLIST.md (Stage 5b custom tracking via inbox smartlead-tracking).
  Use when Build starts, provision inboxes, run the ROE, DNSBL rotation, or check playbook state.
  Not client-create — see os/delivery/build-phase.md. Canon os/delivery/*.yaml.
  Requires tgaworkspace clone for ops/delivery/run.sh (tga-skills ships SKILL + references only).
argument-hint: '[start|status|run-stage|inbox] [client] [playbook|stage]'
headless_safe: false
interactive_reason: CT approves domain screen picks, replacement labels after DNSBL retire, and Namecheap IP whitelist failures.
preanswerable: false
---

# TGA delivery

Agency ROE. **Sequence is in YAML, not folder order.**

## Campaign discovery routing

For ICP/source exploration, hypothesis breadth or a signal pack, run `/campaign-hypothesis-lab` before `/campaign-strategy`. Canonical [lab skill](../campaign-hypothesis-lab/SKILL.md) and [process](../../../os/delivery/campaign-hypothesis-lab.md). It supports company, person, tenure and engagement starting points, reuses known source capabilities and tests bounded evidence gaps. Reuse reviewed Proof evidence on Build entry; do not repeat discovery without a material change. Inbox provisioning can run in parallel; MMF follows the reviewed signal pack.

The inbox preflight below applies to inbox/procurement work. Standalone lab planning and evidence review use the lab's scope and budget contract and do not require sending-domain decisions.

**Canonical path:** `ops/delivery/tga-delivery/SKILL.md` (tracked). `.claude/skills/tga-delivery/` is a symlink for Claude/Cursor discovery.

## Multi-stage inbox provision (read this first)

ROE inbox work is **too many gates for one skill thread**. Use the stage checklist as the runbook; this skill stays a **short index** (preflight, commands, hard rules).

**Canonical runbook:** [`ops/delivery/inbox-provision/ROE-INBOX-PROVISION-CHECKLIST.md`](../inbox-provision/ROE-INBOX-PROVISION-CHECKLIST.md)

**Agent discipline:** one checklist stage per turn when possible; save `domain-screen-*.json`, intake updates, and provision logs under `Clients/<slug>/build/infra/` before continuing.

**Inbox wire-up sequence (mandatory gates):** Stage 4 mailbox buy → **Stage 5** `inbox smartlead-sync` → **Stage 5b** `inbox smartlead-tracking` → **Stage 6** send-estate register. Stage 5b is **not** inside `stage run inbox-provision`; run the CLI after sync completes.

## ROE pre-flight decisions

**Run this block first** on any `standard-engine` / inbox-provision work — before `inbox size`, domain screen, or live buys. Do not assume ROE defaults (100% Google, generic sender, Namecheap) without sign-off.

```bash
./ops/delivery/run.sh inbox preflight --client <slug>
# same: python3 ops/delivery/scripts/roe_preflight_check.py --client <slug>
```

Exit **1** = gaps remain → **stop, print each `gaps[].question` to CT, and wait for intake updates.** Exit **0** = continue Build flow.

**Skill-start checklist (ask in one message if multiple gaps):**

1. Monthly first-touch send envelope? → `inbox size --monthly-sends N --client <slug>`
2. Google vs Microsoft inbox split? (never implicit — even 100/0 needs `confirmed_at`)
3. Sender: founder / founder-primary / generic rotation?
4. Smartlead subaccount + standby campaign id?
5. 301 redirect target for secondaries?
6. Registrar (Namecheap default; confirm if Porkbun)?

| Decision | Intake field | Default if silent | Must ask when |
|----------|--------------|-------------------|---------------|
| **Monthly send envelope** | `monthly_send_target` | — | Always at skill start; drives `inbox size` → `domain_count` |
| **Google vs Microsoft split** | `inbox_platform_split` | 100% Google | **Always deliberate** — record `google_pct`, `microsoft_pct`, `rationale`, `confirmed_at` |
| **Sender on mailboxes** | `sender_identity_mode` + `sender_identity_confirmed_at` | `generic_rotation` | Propose from kickoff; confirm before mailbox load |
| **Smartlead tenant** | `smartlead_client_id`, `standby_campaign_id` | Search `/client/` | Ambiguous name or new client |
| **301 redirect** | `redirect_target` | `https://www.{primary_domain}` | Non-standard landing URL. Redirect does not shield `primary_domain` from DNSBL — keep root out of cold From and body links. |
| **Registrar** | `registrar` | `namecheap` | Porkbun or client-owned registrar |

**Inbox split example** (Iolite was 100% Google — implicit; next instance must be explicit):

```json
"inbox_platform_split": {
  "google_pct": 100,
  "microsoft_pct": 0,
  "rationale": "ROE email-only; no M365 buyer requirement",
  "confirmed_at": "2026-09-10",
  "confirmed_by": "CT"
}
```

Mixed estates: size **total** mailboxes first (`inbox size`), then allocate counts per platform before InboxKit `mailboxes/buy` (`platform: GOOGLE | MICROSOFT`).

Instance retro (post-warmup): `ops/delivery/inbox-provision/roe-instance-review.md` — promote pre-flight gaps that burned time on first live client.

## When to use

| Phase | Action |
|---|---|
| `/client-create` | **Do not** start delivery here |
| Pipeline Proof | `proof` playbook + `pipeline-proof-playbook.md` |
| **Engine Build** | `standard-engine` — read **`os/delivery/build-phase.md`** first |

## Before you run

0. **`./ops/delivery/run.sh inbox preflight --client <slug>`** — resolve all gaps before money/API (see **ROE pre-flight decisions** above). Present every gap question to CT; do not proceed on assumptions.
1. Read `os/delivery/README.md` and the playbook.
2. Client folder exists under `Clients/<slug>/`.
3. Build-phase intake in `Clients/<NAME>/delivery-intake.json` (`intake-template.yaml`).
4. **Inbox provision:** confirm `domain_count`; **3 mailboxes per secondary domain**.
5. **Send envelope:** if the client bought a monthly first-touch target (e.g. 5,000/mo), run **`inbox size`** before picking domains — do not guess domain count.
6. Default `--dry-run` for money/API writes. Never START `{client}_standby`.
7. **After `smartlead-sync` completes:** run **Stage 5b** custom tracking (`inbox smartlead-tracking`) before `emit_send_estate_register.py` — see checklist and commands below.

## Send-estate sizing (ROE spreadsheet)

Canonical math lives in the [TGA ROE send-estate sizer sheet](https://docs.google.com/spreadsheets/d/10gd2IhrIzo6pzd-8H1niAmMIx0ZZOXe0vWiWsX5GxYg/edit) and `ops/delivery/_lib/inbox_provision/send_estate_sizer.yaml`.

| Locked input | Value | Note |
|---|---|---|
| Planning sends/inbox/day | **15** | Cost/headroom planning rate (house cap is 20 weekdays — see `os/sending-safety-standard.md`) |
| Spare | **2×** target | Sheet labels this “50% spare”; provision double the monthly envelope |
| Inboxes/domain | **3** | Split across Google + Microsoft per `inbox_platform_split` |
| Days/month | **30** | Calendar planning |

**Formula:** `inboxes = ceil(monthly_sends × 2 / (15 × 30))` → `domains = ceil(inboxes / 3)`.

| Monthly first-touch envelope | Inboxes | Domains | Send estate ~$/mo |
|---|---:|---:|---:|
| 5,000 | 23 | 8 | ~$135 |
| 15,000 | 70 (stamp) | 24 (stamp) | ~$305 |
| 20,000 | 89 | 30 | ~$376 |

```bash
./ops/delivery/run.sh inbox size --monthly-sends 5000
./ops/delivery/run.sh inbox size --monthly-sends 5000 --client iolite-ventures
```

Writes `monthly_send_target`, `domain_count`, and `send_estate_sizer` summary into `delivery-intake.json` when `--client` is set.

## Sender identity (David vs generic rep)

Set in `delivery-intake.json` before `inbox-provision`:

| `sender_identity_mode` | Behavior | When to use |
|---|---|---|
| `generic_rotation` | Name-library personas rotate across the fleet (default) | Anonymous “sales team” outreach; spreads reputation |
| `founder` | Same person on **every** inbox (`sender_identities[0]`) | David-from-David on all secondary domains |
| `founder_primary` | Founder on **1 inbox per domain**, generic on the other 2 | Founder credibility + volume spread (common) |
| `explicit` | Use full `sender_identities` list; pad from library if short | Named small team |

`sender_identities` accepts `{name, email}` (founder), `{first, last, email_local}`, or **`email_locals`** on one person:

```json
"sender_identities": [{
  "name": "David Varnai",
  "email": "david@ioliteventures.co",
  "email_locals": ["david", "david.varnai", "dvarnai"]
}]
```

In **`founder`** mode, locals **rotate** across the fleet (inbox 1 → david@, inbox 2 → david.varnai@, …). In **`founder_primary`**, locals rotate on the one founder slot per domain. Same list can be separate entries with identical `name` and different `email_local`.

Primary domain is never a cold sender.

## ROE stack ownership (Standard / ROE clients)

**TGA owns** domains (Namecheap), InboxKit mailboxes, and Smartlead subaccount. **TGA rebill** — not client registrar seats. Custom-track SOWs only: `stack_ownership: client_custom` per `os/delivery/roe-stack-ownership.md`.

| Field | Purpose |
|-------|---------|
| `stack_ownership` | `tga_roe` (default ROE) or `client_custom` |
| `smartlead_client_id` | Subaccount id from `GET /client/` |
| `standby_campaign_id` | Warmup campaign in that subaccount |

```bash
# List subaccounts
curl -s 'https://server.smartlead.ai/api/v1/client/?api_key=YOUR_KEY'

# Create standby in subaccount
curl -s -X POST 'https://server.smartlead.ai/api/v1/campaigns/create?api_key=YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"name":"client_slug_standby","client_id":582826}'
```

Tag Namecheap + InboxKit with **client slug** (e.g. `PickFu`, `Iolite`). Smartlead isolation is `client_id`, not tags.

## Inbox provision — Namecheap first (ROE default)

**Registrar of record is TGA Namecheap** (tag `namecheap_client_tag` in intake). InboxKit holds mailboxes + DNS forwarding; it is **not** the default domain purchaser.

| Step | Action | API / command |
|------|--------|----------------|
| 0 | Preflight + domain screen (prices for CT) | `inbox preflight`, `inbox screen --format markdown` — see checklist Stage 3 |
| 1 | Reserve InboxKit NS + domain uid | `POST /api/domains/nameservers` `{domains:[...]}` (batches of 7) → `Clients/<Name>/build/infra/inboxkit-nameservers.json` |
| 2 | **Register on Namecheap** | `namecheap.domains.create` with NS from step 1; tag client in Namecheap |
| 3 | 301 on sending domains | `POST /api/domains/forwarding` `{uids, forwarding_url}` from `redirect_target` (InboxKit, not Namecheap URL redirect) |
| 4 | Mailboxes | `POST /api/mailboxes/buy` per `inbox_platform_split` (`GOOGLE` / `MICROSOFT`); `use_wallet_balance` when subscription slots are full |
| 5 | Smartlead standby | `./ops/delivery/run.sh inbox smartlead-sync --client <slug> --until-done` |

**Runner (live):**

```bash
python3 ops/delivery/scripts/provision_inbox_estate_namecheap.py --client <slug> --step nameservers
python3 ops/delivery/scripts/provision_inbox_estate_namecheap.py --client <slug> --step namecheap-register
python3 ops/delivery/scripts/provision_inbox_estate_namecheap.py --client <slug> --step forwarding
python3 ops/delivery/scripts/provision_inbox_estate_namecheap.py --client <slug> --step mailboxes
# or: --step all
```

Requires `NAMECHEAP_API_KEY`, `NAMECHEAP_USER`, `INBOXKIT_API_KEY`, and `inboxkit_workspace_id` on intake. Namecheap API calls must originate from a **whitelisted IP**. The `namecheap-register` step prints egress IP via ipify — if Namecheap returns `Invalid request IP`, whitelist that IP or run the command in **Terminal on the Mac** that is already whitelisted (a Cursor subagent with `environment: local` may still egress from cloud; do not assume it hit the laptop).

**Do not** use InboxKit `POST /api/orders` bundled domain+mailbox purchase on new ROE estates. That path skips Namecheap and will not show domains in the registrar portfolio. Exceptions only when listed in intake:

```json
"inboxkit_purchased_domains": ["meetpickfu.com"]
```

## Acceptable secondary sending domains

Canonical rules: `ops/delivery/_lib/inbox_provision/domain-rules.yaml`

| Rule | Requirement |
|------|-------------|
| TLD | **`.com` or `.co`** (apex, not subdomains) |
| Screen pairing | Each candidate label expands to **both** `.com` and `.co` unless `--no-pair-com-co` |
| Characters | **ASCII letters only** — no dashes, underscores, or digits |
| Estate | **CLEAR** — not in client blocklist (Smartlead, InboxKit, dead fleet, PVP/hub, suppress inventory) |
| DNSBL | **CLEAR** — SURBL + Spamhaus DBL via **`surblclient`** (`pip install -r ops/delivery/requirements.txt`), dig fallback in `dnsbl_check.py`; config in `domain-rules.yaml` |
| Primary | **`primary_domain` from intake is never a sender**; never in cold URLs/signatures — secondary 301 to root does not prevent root DNSBL/reputation harm |
| Registrar | Namecheap check + InboxKit `/domains/available` before purchase; screen shows **$/yr register** when API reachable |

```bash
./ops/delivery/run.sh inbox rules
./ops/delivery/run.sh inbox blocklist --client tga
./ops/delivery/run.sh inbox screen --client tga \
  --candidates '["meetgtmarchitects","trygtm"]' \
  --format markdown \
  --out Clients/tga/build/infra/domain-screen.json
```

Paste the markdown table to CT for approval; pick `domain_count` names from **CLEAR** rows into `selected_domains`.

`inbox-provision` **rejects** `selected_domains` that fail shape or estate checks before purchase.

## DNSBL domain rotation (listed senders)

**When:** Ruth/SURBL audit or `inbox screen` shows **LISTED** on a secondary sending domain.  
**Operator playbook (Shaira / manual):** [`references/dnsbl-rotation-operator.md`](references/dnsbl-rotation-operator.md) (copied to `tga-skills` with this skill).  
**Engineering tracker:** [`inbox-provision/DOMAIN-DNSBL-ROTATION-2026-10-06.md`](../inbox-provision/DOMAIN-DNSBL-ROTATION-2026-10-06.md).

**Program order:** Iolite → TGA → PickFu → B2B Transerv. One domain at a time.

| Phase | Retire (out) | Replace (in) |
|-------|----------------|----------------|
| Order | Smartlead detach → InboxKit delete mailboxes → Namecheap auto-renew off | Namecheap register → InboxKit mailboxes → `smartlead-sync` → Stage **5b** tracking → standby attach |

**Replace (Stage D) — do not skip steps:**

1. **CT approves** replacement label after `inbox screen` shows **CLEAR** (DNSBL + estate).
2. **Provision runner** (or ROE Stage 4 UI): `provision_inbox_estate_namecheap.py` steps `nameservers` → `namecheap-register` → `forwarding` → `mailboxes`.
3. **`inbox smartlead-sync --client <slug> --until-done`**
4. **`inbox smartlead-tracking --client <slug> --domain <fqdn> --verify-dns`**
5. Confirm inboxes on **standby only** (`standby_campaign_id` in intake).
6. **`emit_send_estate_register.py --write`** + Notion send-estate if used; CT updates `delivery-intake.json` and blocklist for the **retired** domain.

Never START live campaigns on standby. Never buy replacements without CT sign-off on the screen table.

## Commands

```bash
./ops/delivery/run.sh playbook list
./ops/delivery/run.sh engagement start --client <slug> --playbook standard-engine --sow-signed
./ops/delivery/run.sh engagement status --client <slug>
./ops/delivery/run.sh stage run inbox-provision --client <slug> --dry-run \
  --extra '{"domain_count":10,"selected_domains":["meetgtmarchitects.com"]}'
```

### Inbox helpers (screen + Smartlead poller)

After mailboxes are ordered in InboxKit, **do not wait in chat** — run the resumable poller (uses InboxKit `GET /api/mailboxes/show-credentials`, saves to Smartlead, attaches to standby):

```bash
# Single pass (load any active mailboxes now)
./ops/delivery/run.sh inbox smartlead-sync --client tga --once

# Background-friendly: poll every 2 min until all targets on standby (Slack #tga-agents on complete)
./ops/delivery/run.sh inbox smartlead-sync --client tga --until-done --interval 120

# Or detached:
nohup ./ops/delivery/scripts/smartlead-sync-watch.sh tga 120 > /tmp/tga-smartlead-sync.log 2>&1 &
```

State file: `ops/delivery/.state/<client>-smartlead-sync.json` (safe to re-run).

**Stage 5b — Custom tracking domain (after sync, before register):** Branded CNAME + Smartlead `custom_tracking_url` per sending domain. Runner: `smartlead_tracking_domain.py`.

| Pattern | Command |
|---------|---------|
| ROE pilot | `./ops/delivery/run.sh inbox smartlead-tracking --client <slug> --domain <one-domain>` |
| ROE full estate | `./ops/delivery/run.sh inbox smartlead-tracking --client <slug> --verify-dns` |
| Hypertide backup | `./ops/delivery/run.sh inbox smartlead-tracking --client <slug> --estate hypertide --verify-dns` |

**Intake:** `selected_domains` (ROE); `smartlead_tracking.extra_domains` for additional InboxKit domains; `hypertide_tracking.domains` + `--estate hypertide` (CNAME host `smart`, not `emailtracking`). Overrides: `smartlead_tracking.cname_host` / `cname_target`.

State: `ops/delivery/.state/<client>-smartlead-tracking.json` (Hypertide: `<client>-hypertide-smartlead-tracking.json`). **Canonical checklist:** ROE Stage **5b** in `ROE-INBOX-PROVISION-CHECKLIST.md`.

**Microsoft + Smartlead subclient:** See **[ROE-INBOX-PROVISION-CHECKLIST.md](../inbox-provision/ROE-INBOX-PROVISION-CHECKLIST.md) Stage 5** — M365 lag, transient SMTP 535, and moving mailboxes from **main** tenant to `smartlead_client_id` via `POST /email-accounts/{id}`.

### Send estate register (repo + Notion)

After provision is stable and **`inbox smartlead-sync`** is complete (or names are locked), publish the client-visible domain + mailbox inventory.

```bash
python3 ops/delivery/scripts/emit_send_estate_register.py --client <slug> --write
```

**Repo outputs** (`Clients/<Name>/build/infra/`): `send-estate-register.json`, `send-estate-notion-plan.json`, domain/inbox CSVs.

**Notion push** — follow **`ops/delivery/docs/send-estate-notion.md`** (linked DBs, not flat selects):

1. **Domains DB** on client shared workspace → seed rows → view **`By registrar`** (`GROUP BY "Registrar"`, sort `Domain`).
2. **Inboxes DB** with **`Sending domain`** dual-relation → **`Inboxes`** on domains (auto-sync).
3. Link every inbox row: `Sending domain` = domain page URL. **No `Domain` select.**
4. Record URLs in `delivery-intake.json` → `send_estate_notion`.

Re-runs update by email title; do not create duplicate databases.

### First live instance → OS retro loop

After the **first ROE provision** for a slug, capture deltas and promote tweaks once warmup is stable:

1. Instance log: `Clients/<Name>/build/infra/roe-instance-review-<date>.md` (copy from template)
2. Canonical template + agenda: `ops/delivery/inbox-provision/roe-instance-review.md`
3. Gate check: `python3 ops/delivery/scripts/loop_roe_instance_review.py --client <slug> --once`
4. Background loop (fires retro tick at **warmup_stable** = 24/24 on standby + 48h):

```bash
./ops/delivery/scripts/loop_roe_instance_review.sh iolite-ventures 30m
```

Gates: `estate_complete` → `warmup_live` → **`warmup_stable`** (then run retro agenda in template).

Stages: `intake`, `inbox-provision`, `signal-pack`, `mmf`, `linkedin-stage`, `rotate`, `report`

## Build phase flow

Follow **[ROE-INBOX-PROVISION-CHECKLIST.md](../inbox-provision/ROE-INBOX-PROVISION-CHECKLIST.md)** stages 0–7. Summary:

1. Merge §9 / kickoff → `delivery-intake.json`
2. `inbox preflight` (exit 0)
3. **`inbox size`** when monthly envelope is known
4. `engagement start --playbook standard-engine --sow-signed` / `stage run intake`
5. **`inbox screen --format markdown`** → CT approves **CLEAR** + prices → `selected_domains`
6. **Namecheap provision runner** (or `stage run inbox-provision --dry-run`)
7. **`inbox smartlead-sync --until-done`**
8. **`emit_send_estate_register.py --write`** + Notion
9. Parallel: `signal-pack`, `mmf`

Seed script (Build only): `ops/delivery/scripts/seed_intake_from_create.py`

## Pipeline Proof

```bash
./ops/delivery/run.sh engagement start --client <slug> --playbook proof --sow-signed
./ops/delivery/run.sh stage run signal-pack --client <slug>
```

No inbox fleet on Proof.

## Trigger.dev

`./ops/delivery/run.sh trigger start --client <slug> --dry-run` — `ops/delivery/trigger/DEPLOY.md`

## Hard rules

- Primary domain never a sender.
- **`inbox size` before domain pick** when client bought a monthly send envelope.
- **`inbox_platform_split` confirmed in intake** before any `mailboxes/buy` — never implicit 100% Google.
- **`roe_preflight_check.py` exit 0** before live provision.
- `domain_count` × 3 inboxes; ask domain count before provision (or derive from sizer).
- **`sender_identity_mode`** set before provision; confirm founder vs generic with client.
- Domain shape + estate CLEAR before any registrar purchase.
- InboxKit/Smartlead: curl + browser UA.
- Never START standby campaign or load leads.
- **Send estate Notion:** dual-relation DBs only (`Sending domain` ↔ `Inboxes`); drop any v1 `Domain` select after backfill.
- State: Supabase `delivery_engagements` or `./ops/delivery/run.sh` (venv).

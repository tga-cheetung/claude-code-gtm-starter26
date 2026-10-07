# ROE inbox provision — stage checklist

**Purpose:** Multi-stage ROE work loses steps when everything lives in one skill thread. This file is the **canonical runbook**. Agents run **one stage at a time**, write outputs to named paths, then stop or hand off.

**Skill index (short):** `ops/delivery/tga-delivery/SKILL.md` — preflight decisions, command cheatsheet, hard rules. **Do not duplicate this checklist inside the skill.**

**Playbook:** `standard-engine` → stage `inbox-provision`. Canon: `os/delivery/build-phase.md`.

**SURBL / DNSBL rotation (2026-10-06):** secondary-domain retire + replace is **not** this checklist — use [`DNSBL-ROTATION-SHAIRA-INSTRUCTIONS-2026-10-06.md`](DNSBL-ROTATION-SHAIRA-INSTRUCTIONS-2026-10-06.md), tracker [`DOMAIN-DNSBL-ROTATION-2026-10-06.md`](DOMAIN-DNSBL-ROTATION-2026-10-06.md), Stage D [`../tga-delivery/references/dnsbl-rotation-operator.md`](../tga-delivery/references/dnsbl-rotation-operator.md) (COS-161). Retire Smartlead → InboxKit → Namecheap; replacements reverse ROE 4→5.

---

## How to use (agents + CT)

| Discipline | Rule |
|------------|------|
| Stage order | Do not skip gates. If a stage fails, fix intake or env before the next stage. |
| One stage per turn | Prefer completing one checklist section, saving artifacts, then a fresh message for the next stage. |
| CT decisions | Preflight gaps, domain shortlist approval, sender identity, platform split — **wait on CT** when `roe_preflight_check` or screen output requires it. |
| Money / API | Default `--dry-run` until CT approves domain list and registrar step. |
| Standby | **Never START** `{client_slug}_standby` or load leads from this runbook. |

**State anchors**

| Artifact | Path |
|----------|------|
| Intake | `Clients/<slug>/delivery-intake.json` |
| Domain rules | `ops/delivery/_lib/inbox_provision/domain-rules.yaml` |
| Sizer math | `ops/delivery/_lib/inbox_provision/send_estate_sizer.yaml` |
| Namecheap NS map | `Clients/<slug>/build/infra/inboxkit-nameservers.json` |
| Smartlead sync state | `ops/delivery/.state/<slug>-smartlead-sync.json` |
| Custom tracking state | `ops/delivery/.state/<slug>-smartlead-tracking.json` (Hypertide: `<slug>-hypertide-smartlead-tracking.json`) |
| Tracking runner | `ops/delivery/_lib/inbox_provision/smartlead_tracking_domain.py` via `inbox smartlead-tracking` |

**Inbox provision order (after mailboxes exist):** Stage 4 buy → **Stage 5** `smartlead-sync` → **Stage 5b** `smartlead-tracking` → **Stage 6** send-estate register. Do not skip 5b before register.

---

## Stage 0 — Client folder + intake

- [ ] `Clients/<slug>/` exists (not `/client-create` in the same breath as provision).
- [ ] `delivery-intake.json` from `intake-template.yaml`: `primary_domain`, `monthly_send_target` (when sold), `redirect_target`, `inboxkit_workspace_id`, `smartlead_client_id`, `standby_campaign_id`, `registrar` (default `namecheap`).
- [ ] `stack_ownership`: `tga_roe` unless custom SOW (`os/delivery/roe-stack-ownership.md`).
- [ ] **Hybrid clients** (e.g. Reply.io quality lane + ROE volume lane): document existing live domains in CSM / intake notes; **do not** register or Smartlead-sync Lane A domains without an explicit migration decision.

**Exit:** intake file on disk.

---

## Stage 1 — ROE preflight (mandatory)

```bash
./ops/delivery/run.sh inbox preflight --client <slug>
# python3 ops/delivery/scripts/roe_preflight_check.py --client <slug>
```

- [ ] Exit **0** before sizing, screen, or buys.
- [ ] Exit **1** → print every `gaps[].question` to CT; update intake; re-run.

**Decisions to lock in intake (never implicit):**

- Monthly first-touch envelope → drives Stage 2.
- `inbox_platform_split` (`google_pct` / `microsoft_pct` + `confirmed_at`).
- `sender_identity_mode` (+ `sender_identities` if founder / explicit).
- Smartlead subaccount + standby campaign id.
- `redirect_target` for 301 on secondaries.
- **Redirect ≠ DNSBL shield:** 301/307 from a secondary to `primary_domain` does **not** auto-list the root on SURBL/DBL when the secondary is listed — but it does **not** protect the root either. Keep **`primary_domain` out of cold From and out of body URLs/signatures**; send and link on secondaries (or dedicated tracking hosts) only. Re-check root on DNSBL separately after secondary incidents.

**Exit:** preflight green.

---

## Stage 2 — Send-estate size

When the client bought a monthly send envelope:

```bash
./ops/delivery/run.sh inbox size --monthly-sends <N> --client <slug>
```

- [ ] `domain_count` and `send_estate_sizer` written to intake.
- [ ] CT aware of ~monthly estate cost (sizer uses **renewal** planning rates; `.com` and `.co` differ in `send_estate_sizer.yaml`).

**Exit:** `domain_count` set (or explicitly overridden by CT with rationale in intake).

---

## Stage 3 — Domain candidates + screen (CT sees prices)

**Shape (canonical):** apex **`.com` and `.co`**, ASCII letters only, no dashes/digits. Primary domain **never** a sender. Estate **CLEAR** (blocklist + InboxKit). **DNSBL CLEAR** (SURBL multi + Spamhaus DBL via `surblclient`, dig fallback — `pip install -r ops/delivery/requirements.txt`; see `domain-rules.yaml` → `dnsbl`).

**Candidate generation:** propose `domain_count` labels (or more for choice); screening **expands each label to both `.com` and `.co`** unless `--no-pair-com-co`. Candidates may be bare labels (`meetbrand`) or FQDNs (`meetbrand.com`).

```bash
./ops/delivery/run.sh inbox rules
./ops/delivery/run.sh inbox blocklist --client <slug>
./ops/delivery/run.sh inbox screen --client <slug> \
  --candidates '["meetbrand.com","trybrand.com"]' \
  --format markdown \
  --out Clients/<slug>/build/infra/domain-screen-<date>.json
```

- [ ] Paste the **markdown table** to CT (Namecheap avail + **$/yr register**, InboxKit avail + price).
- [ ] Namecheap pricing/register requires **whitelisted egress IP** (see Stage 4 — use `NAMECHEAP_PROVISION_SSH`, not “whatever laptop is open”). Screen can run locally; if `Invalid request IP`, fix whitelist or run screen from the provision host.
- [ ] Markdown table shows **DNSBL control ok** (SURBL `test.surbl.org`) and no **LISTED** rows.
- [ ] CT picks **`domain_count` domains** from **CLEAR** rows (mix of `.com` / `.co` allowed). **REVIEW** = inconclusive DNSBL only — do not buy until re-run from provision host.
- [ ] Write `selected_domains` array to `delivery-intake.json`.

**Exit:** `selected_domains` approved and in intake; screen JSON saved under `build/infra/`.

---

## Stage 3b — InboxKit workspace (API, one per client)

Create a **dedicated workspace** per ROE client (PickFu pattern, 2026-09-15). Do not reuse `INBOXKIT_WORKSPACE_ID` from `.env` for production estate work.

```bash
# List existing
python3 ops/delivery/scripts/inboxkit_workspace.py list

# Create + write uid to delivery-intake.json
python3 ops/delivery/scripts/inboxkit_workspace.py create \
  --name "B2B Transerv" \
  --client b2b-transerv \
  --write-intake \
  --admins-only
```

- [ ] `inboxkit_workspace_id` + `inboxkit_workspace_name` on intake.
- [ ] API: `POST https://api.inboxkit.com/v1/api/workspaces/create` with `{"name":"<Client>","admins_only":true}` → response `uid` (UUID). Docs: [Create workspace](https://docs.inboxkit.com/create-workspace-18118364e0).
- [ ] List: `GET /v1/api/workspaces/list`.

**Exit:** intake has workspace uid; all later InboxKit calls use `X-Workspace-Id: <uid>` (provision runner reads intake).

---

## Stage 4 — Namecheap-first provision runner

ROE default: **TGA Namecheap** is registrar of record; InboxKit NS + mailboxes + forwarding.

**Namecheap API host (not email sending):** Registrar calls must egress from an IP on the Namecheap API whitelist. That is **admin traffic only** — it is **not** the IP recipients see on cold mail (Google/M365 via InboxKit).

1. Pick a fixed host whose egress is whitelisted (office box, small VPS, etc.).
2. Set `NAMECHEAP_PROVISION_SSH=user@that-host` in workspace `.env` (see `.env.example`).
3. On that host once: `python3 -c "from ops.delivery._lib.inbox_provision.namecheap_registrar import client_ip,get_balance; print(client_ip(), get_balance())"` — must succeed before bulk register.
4. Run steps through the wrapper (SSH when `NAMECHEAP_PROVISION_SSH` is set):

```bash
chmod +x ops/delivery/scripts/run_namecheap_provision_step.sh

./ops/delivery/scripts/run_namecheap_provision_step.sh <slug> nameservers
./ops/delivery/scripts/run_namecheap_provision_step.sh <slug> namecheap-register
./ops/delivery/scripts/run_namecheap_provision_step.sh <slug> forwarding
./ops/delivery/scripts/run_namecheap_provision_step.sh <slug> mailboxes
# or: python3 ops/delivery/scripts/provision_inbox_estate_namecheap.py --client <slug> --step all
```

InboxKit nameserver / mailbox steps may run **locally** (no Namecheap IP gate) once `inboxkit_workspace_id` is on intake.

| Step | Done when |
|------|-----------|
| nameservers | `inboxkit-nameservers.json` populated |
| namecheap-register | domains in Namecheap portfolio, client tag |
| forwarding | 301 to `redirect_target` via InboxKit |
| mailboxes | `mailboxes/buy` per platform split |

- [ ] **Forwarding is browser-only hygiene** — not deliverability isolation. Listed secondaries still poison cold mail that uses them as From or link hosts; redirect to primary does not delist the secondary or immunize the root (see preflight redirect note).

- [ ] Do **not** use InboxKit bundled `POST /api/orders` for new ROE estates unless listed in `inboxkit_purchased_domains`.
- [ ] **InboxKit wallet (flat-rate / quarterly):** if `mailboxes/buy` errors on subscription slots, use wallet credits: `provision_inbox_estate_namecheap.py --step mailboxes --use-wallet` (see `mailbox-buy-result.json`).
- [ ] `stage run inbox-provision --dry-run` optional checkpoint before live steps.

**Exit:** all selected domains registered + mailboxes ordered.

---

## Stage 5 — Smartlead sync (resumable; not in-chat wait)

**Scope:** Every save and attach uses `smartlead_client_id` from intake. Standby campaign must live in that subclient (`GET /campaigns/{id}` → `client_id` matches).

```bash
./ops/delivery/run.sh inbox smartlead-sync --client <slug> --once
./ops/delivery/run.sh inbox smartlead-sync --client <slug> --until-done --interval 300
```

- [ ] Poller uses InboxKit `GET /api/mailboxes/show-credentials` → `POST /email-accounts/save` with `client_id` + platform SMTP/IMAP hosts (Google vs Microsoft).
- [ ] State file `ops/delivery/.state/<slug>-smartlead-sync.json` — safe to re-run; **never START** standby.

### Microsoft inboxes (InboxKit + Smartlead)

Observed on **PickFu** and **B2B Transerv** (2026-09); not Google-specific.

| Layer | What to expect |
|-------|----------------|
| **InboxKit** | Microsoft domains often stay `scheduled` / `processing` longer than Google. DNS (MX → `*.mail.protection.outlook.com`, SPF) can be correct while mailboxes are still not `active`. |
| **Smartlead save** | First attempts may return **SMTP 535 5.7.3 Authentication unsuccessful** on `smtp.office365.com` — often transient on fresh M365 tenants; retry over hours. |
| **Main vs subclient** | Microsoft saves sometimes land on the **TGA main** Smartlead tenant (`client_id: null`) even when the save payload includes `client_id`. Google saves usually respect subclient immediately. Sync code merges **main + subclient** email-account listings; state `failed` can be a **false negative** if accounts already exist on main. |

**When sync stalls with MS in `failed` but InboxKit shows `active`:**

1. **Audit both scopes** (same API key):
   - `GET /email-accounts?offset=0&limit=200` (main — includes `client_id: null` rows)
   - `GET /email-accounts?offset=0&limit=200&client_id=<smartlead_client_id>`
2. For each Microsoft `from_email` on the estate, confirm `is_smtp_success` (or equivalent) on main list.
3. **Move to subclient** (required for client isolation and campaign attach hygiene):

   ```bash
   curl -s -X POST "https://server.smartlead.ai/api/v1/email-accounts/<email_account_id>?api_key=$SMARTLEAD_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"client_id": <smartlead_client_id>}'
   ```

   Response: `{"ok": true, "message": "Email account details updated successfully!", ...}`. Re-`GET` the account; `client_id` must match intake.

4. **Attach to standby** (bulk — CLI `mailboxes add-to-campaign` only moves one id):

   ```bash
   curl -s -X POST "https://server.smartlead.ai/api/v1/campaigns/<standby_campaign_id>/email-accounts?api_key=$SMARTLEAD_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email_account_ids": [<id1>, <id2>, ...]}'
   ```

5. Re-run `./ops/delivery/run.sh inbox smartlead-sync --client <slug> --once` until `complete: true` and `on_standby` = mailbox count.

**Manual provision path:** If automated save never succeeds, add the inbox in Smartlead UI (or save API with full Microsoft SMTP/IMAP fields from InboxKit credentials), then steps 3–5 above. Do not leave Microsoft senders on the main tenant for a subclient campaign.

**Exit:** sync `complete: true`; all estate mailboxes on standby with `client_id` = intake subclient; do not START campaign.

---

## Stage 5b — Smartlead custom tracking domain (per sending domain)

**Scope:** Open/click tracking must use a **branded CNAME** on each sending domain, not Smartlead’s shared tracker. Automation: **`./ops/delivery/run.sh inbox smartlead-tracking`** (implementation: `ops/delivery/_lib/inbox_provision/smartlead_tracking_domain.py`).

| Estate | DNS provider | Intake keys | CNAME host | Smartlead `custom_tracking_url` |
|--------|--------------|-------------|------------|----------------------------------|
| ROE canvas (default) | InboxKit `POST /api/dns/add` | `selected_domains` (+ optional `smartlead_tracking`) | `emailtracking` (default) | `emailtracking.<domain>` |
| InboxKit extras (not in `selected_domains`) | InboxKit | `smartlead_tracking.extra_domains` | same as ROE | same |
| Hypertide backup | Hypertide v1 API `X-API-Key` | `hypertide_tracking.domains` | `smart` (playbook) | `smart.<domain>` |

Default ROE (Smartlead help center): host `emailtracking` → CNAME `open.sleadtrack.com`; mailbox field `emailtracking.<sending-domain>`. Hypertide playbook uses host `smart` → same target (`tool-docs/cheatsheets/hypertide.md`).

```bash
# Pilot one domain
./ops/delivery/run.sh inbox smartlead-tracking --client <slug> --domain meetbrand.com

# Full ROE estate (selected_domains + smartlead_tracking.extra_domains)
./ops/delivery/run.sh inbox smartlead-tracking --client <slug> --verify-dns

# Hypertide backup domains only (separate state file)
./ops/delivery/run.sh inbox smartlead-tracking --client tga --estate hypertide --verify-dns

# Flags: --dry-run, --skip-dns, --skip-smartlead
```

- [ ] `INBOXKIT_API_KEY` + workspace (`inboxkit_workspace_id` on intake or `INBOXKIT_WORKSPACE_ID`) for ROE / extra_domains.
- [ ] `HYPERTIDE_API_KEY` (`hk_…`, header **`X-API-Key`**, routes **`/api/v1/...`**) for `--estate hypertide` DNS — not Bearer `/api/apikey/status`.
- [ ] **TGA main tenant:** no `smartlead_client_id` — intake uses `smartlead_workspace: tga_main`; script scopes mailboxes to domain lists on intake (`client_id` null only).
- [ ] Intake overrides: `smartlead_tracking: { dns_provider, cname_host, cname_target, extra_domains[] }`; `hypertide_tracking: { domains[], smartlead_tracking }`.
- [ ] State: `ops/delivery/.state/<slug>-smartlead-tracking.json` (safe to re-run; skips existing CNAME / already-set URLs).
- [ ] DNS propagation can take 30 min–24 h; Smartlead UI “Verify CNAME” is the final check if alerts linger.

**Exit:** every mailbox on each target domain has `custom_tracking_domain` set; each domain has the tracking CNAME at the DNS provider (InboxKit or Hypertide).

**TGA reference (2026-09):** ROE 11 canvas domains + `extra_domains` `ruthckhan.com`, `ruthkhan.com`; Hypertide `gtmarchitectshq.com`, `gtmarchitectsgroup.com` via `--estate hypertide`.

---

## Stage 6 — Send estate register + Notion

```bash
python3 ops/delivery/scripts/emit_send_estate_register.py --client <slug> --write
```

- [ ] Repo outputs under `Clients/<slug>/build/infra/`.
- [ ] Notion push per `ops/delivery/docs/send-estate-notion.md` (dual-relation DBs).
- [ ] `send_estate_notion` URLs in intake.

**Exit:** client-visible register published.

---

## Stage 7 — Warmup gates + instance retro

- [ ] Warmup on standby only; monitor 24/24 + 48h stable per `roe-instance-review.md`.
- [ ] First live slug: `Clients/<slug>/build/infra/roe-instance-review-<date>.md` + `loop_roe_instance_review.py`.

**Exit:** warmup stable → retro agenda; promote process fixes to this checklist or `domain-rules.yaml`.

---

## Appendix A — Skill / thread hygiene (why this file exists)

| Problem | Mitigation |
|---------|------------|
| Long `tga-delivery` threads drop steps | Run checklist stages sequentially; link artifact paths in handoff. |
| Skill duplicates runbook | Skill = index + preflight + commands; **this file = stages**. |
| Domain rules drift | Edit `ops/delivery/_lib/inbox_provision/domain-rules.yaml`; mirror `inbox-provision/domain-rules.yaml`. |
| .com-only habit | Screen pairs `.com`/`.co`; sizer includes `.co` renewal planning rate. |

## Appendix B — Dual-lane clients (example: B2B Transerv)

| Lane | Stack | Rule |
|------|-------|------|
| A — quality | Reply.io + existing Zapmail domains | Leave live; no Smartlead duplicate without migration call. |
| B — volume | Namecheap + InboxKit + Smartlead | New secondaries only; own `delivery-intake.json` + blocklist slug `b2b-transerv`. |

Provision Lane B using Stages 0–7; never put `b2btranserv.com` (primary) on cold send.

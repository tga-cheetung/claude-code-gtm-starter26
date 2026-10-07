# DNSBL domain rotation — surgical runbook (2026-10-06)

**Ticket:** COS-161 · **Trigger:** Ruth SURBL "Domain Status" email (2026-10-06)  
**Operator:** Shaira Abdul (Smartlead → InboxKit → Namecheap UI) · **Stage D (replacement):** `/tga-delivery` + `references/dnsbl-rotation-operator.md`  
**Notion mirror:** [DNSBL domain rotation — Shaira operator guide](https://app.notion.com/p/3f18d40b6221817cb58de9c195a75027)

Program **done** when **15/15** listed domains are retired (A–C) and replacements are on standby only (or CT documents an exception).

**Source:** Ruth `Domain Status` email, 2026-10-06 (SURBL multi; align with Spamhaus DBL before any **new** buy via `inbox screen`).

**Scope:** 15 **LISTED** secondary sending domains across four Smartlead standby pools. Primary domains (`thegtmarchitects.com`, `pickfu.com`, `b2btranserv.com`, `ioliteventures.co`) are **not** on this list.

**Rule:** Never **START** a live campaign on standby. Detach listed domains from campaigns and warmup first; provision replacements only after DNSBL **CLEAR** on candidates.

---

## How to use this doc

1. Work **one client at a time** (or one domain at a time inside a client) so Namecheap / InboxKit / Smartlead state stays aligned.
2. **Retire order (listed domain out):** Smartlead → InboxKit → Namecheap (see below).
3. **Bring-up order (replacement domain in):** Namecheap → InboxKit → Smartlead (normal ROE Stage 4→5).
4. Tick `- [ ]` → `- [x]` in git as each step completes; add `done YYYY-MM-DD` in the Notes column when useful.

**Intake anchors:** `Clients/<Client>/delivery-intake.json` · ROE: [`ROE-INBOX-PROVISION-CHECKLIST.md`](ROE-INBOX-PROVISION-CHECKLIST.md)

**Operator guide (Shaira, manual UI):** [`DNSBL-ROTATION-SHAIRA-INSTRUCTIONS-2026-10-06.md`](DNSBL-ROTATION-SHAIRA-INSTRUCTIONS-2026-10-06.md) · Agent Ticket on [Agents Home](https://www.notion.so/3318d40b622180749543d32f57717f92) (search ticket name below).

---

## Consolidated per-domain status (COS-161 tracker)

Update **Retire A–C** and **Replace D** as Shaira completes each domain. Smartlead account ids: fill from Smartlead UI when removing from standby (Iolite `iolitegrowth.com` pre-filled from kickoff).

| Phase | Client | Domain | Smartlead account ids (if known) | Retire A–C | Replace FQDN | Replace D | Notes |
|------:|--------|--------|----------------------------------|------------|--------------|-----------|-------|
| 1 | Iolite | `iolitegrowth.com` | 23119532, 23119533, 23119536 | pending | — | pending | **Start here** |
| 2 | TGA | `gtmarchitectshub.com` | — | pending | — | pending | |
| 2 | TGA | `gtmarchitectslab.com` | — | pending | — | pending | |
| 2 | TGA | `gtmarchitectsteam.com` | — | pending | — | pending | |
| 2 | TGA | `joingtmarchitects.com` | — | pending | — | pending | |
| 2 | TGA | `meetgtmarchitects.com` | — | pending | — | pending | |
| 2 | TGA | `workgtmarchitects.com` | — | pending | — | pending | |
| 3 | PickFu | `hellopickfu.com` | — | pending | — | pending | |
| 3 | PickFu | `joinpickfu.com` | — | pending | — | pending | |
| 3 | PickFu | `meetpickfu.com` | — | pending | — | pending | **Ask CT** before registrar — InboxKit purchase / transfer |
| 3 | PickFu | `pickfuhq.com` | — | pending | — | pending | |
| 3 | PickFu | `pickfuhub.com` | — | pending | — | pending | |
| 3 | PickFu | `pickfuteam.com` | — | pending | — | pending | |
| 4 | B2B | `meettranserv.com` | — | pending | — | pending | Lane B only |
| 4 | B2B | `trytranserv.com` | — | pending | — | pending | Lane B only |

### Domains explicitly **keep** (not in SURBL rotation set)

- **Iolite:** growwithiolite, meetiolite, helloiolite, teamiolite, goiolite, joiniolite, partneriolite  
- **TGA:** hellogtmarchitects, gotogtmarchitects, trygtmarchitects, teamgtmarchitects, withgtmarchitects, gtmarchitectshq, gtmarchitectsgroup  
- **PickFu:** withpickfu.com, pickfugo.com  
- **B2B:** connecttranserv, freighttranserv, gotranserv, hellotranserv, shiptranserv, withtranserv · **Lane A Reply.io unchanged**

## Client reference (Smartlead / standby)

| Client slug | Namecheap tag | Smartlead subclient | Standby campaign | Standby id |
|-------------|---------------|---------------------|------------------|------------|
| `iolite-ventures` | Iolite | 582826 | `iolite_ventures_standby` | 3937881 |
| `tga` | TGA | main tenant (null) | `TGA_Standby` | 3908219 |
| `pickfu` | PickFu | 587678 | `PickFu_standby` | 3971185 |
| `b2b-transerv` | B2B Transerv | 588623 | `b2b_transerv_standby` | 3972078 |

**InboxKit workspace ids:** PickFu `cb536e2f-4003-4d50-9c40-95d45eaefb13` · B2B Transerv `8bdd3b65-122c-4ba0-8022-9b115cf3a2b1` · Iolite — use Iolite-labeled workspace in InboxKit UI.

**Primary roots (never rotate as senders):** `thegtmarchitects.com`, `pickfu.com`, `b2btranserv.com`, `ioliteventures.co`.

## After each domain retire (A–C)

1. Slack CT: domain + client + Smartlead ids removed.  
2. CT/engineering: update blocklist / send-estate register when instructed (usually after replacement or batch retire).

---

## Per-domain retire pipeline (listed → out)

Do these in order for **each** domain row in the inventory below.

### A — Smartlead (stop send + detach)

- [ ] **A1** List mailboxes: `GET /email-accounts` on **main** and `client_id=<smartlead_client_id>` from intake; filter `from_email` `@<domain>`.
- [ ] **A2** Note `email_account_id` for each inbox (typically 3 per domain).
- [ ] **A3** Remove from **standby** campaign (`standby_campaign_id` in intake):  
  `POST /campaigns/{standby_id}/email-accounts/remove` or API equivalent — confirm in [`tool-docs/cheatsheets/smartlead.md`](../../../tool-docs/cheatsheets/smartlead.md).
- [ ] **A4** Remove from **any active** campaigns (grep campaign names in Ruth’s tags; check subclient campaigns).
- [ ] **A5** Disable warmup / pause sending on those accounts (UI or API per Smartlead).
- [ ] **A6** Delete or archive email accounts **only after** A3–A5 confirmed (keep IDs in Notes until deleted).
- [ ] **A7** Re-run attach audit: no remaining `@domain` on standby or live campaigns.

### B — InboxKit (mailboxes + domain slot)

Workspace: `inboxkit_workspace_id` on intake (PickFu / B2B / Iolite); TGA uses env default or intake if set.

- [ ] **B1** InboxKit UI or API: list mailboxes on `<domain>`; export UIDs if scripted.
- [ ] **B2** Cancel/delete mailboxes on the domain (all seats).
- [ ] **B3** If domain is only used for sending: remove forwarding / tracking DNS hooks per ROE Stage 5b docs.
- [ ] **B4** Domain status in workspace: note whether domain stays parked or is removed from workspace (policy: **park until Namecheap step** if NS still needed for redirect).

### C — Namecheap (registrar)

- [ ] **C1** Confirm domain in TGA Namecheap portfolio (`namecheap_client_tag` on intake).
- [ ] **C2** Turn off **auto-renew** for listed domain (do not delete zone on day one — avoids accidental send if something still points here).
- [ ] **C3** Add domain to estate **blocklist** sources:  
  `ops/delivery/_lib/inbox_provision/blocklist-config.yaml` + client `build/infra/` screen artifact if you maintain one.
- [ ] **C4** Remove from `selected_domains` / `google_domains_*` / `microsoft_domains_*` in `delivery-intake.json` (commit when client batch is consistent).
- [ ] **C5** Optional later: let expire or transfer out after 30d quarantine (no mailboxes, no Smartlead).

### D — Replacement (if this domain is in active estate count)

- [ ] **D1** Screen **new** label:  
  `./ops/delivery/run.sh inbox screen --client <slug> --candidates '["newlabel"]' --format markdown --out Clients/<Client>/build/infra/domain-screen-replace-<domain>-<date>.json`
- [ ] **D2** CT pick from **CLEAR** rows only (DNSBL + estate).
- [ ] **D3** Namecheap register → InboxKit mailboxes → `inbox smartlead-sync` (ROE Stages 4–5).
- [ ] **D4** Attach new inboxes to standby; update sender rotation / Notion register if used.
- [ ] **D5** Record replacement mapping in **Notes** column below.

---

## One-time program prep

- [ ] **P0** `pip install -r ops/delivery/requirements.txt` on the machine that runs `inbox screen` (surblclient).
- [ ] **P1** Re-run Ruth-style check; save artifact:  
  `./ops/delivery/run.sh inbox screen --client tga --candidates '[...all listed...]' --no-availability --out ops/delivery/.state/dnsbl-ruth-rerun-2026-10-06.json`  
  (Repeat per client slug or one combined candidate list.)
- [ ] **P2** Confirm no listed domain is on a **live** (non-standby) campaign sending volume.
- [ ] **P3** PickFu: note `meetpickfu.com` is **InboxKit-purchased** / transfer-out pending — see [`Clients/PickFu/build/infra/meetpickfu-namecheap-transfer.md`](../../../Clients/PickFu/build/infra/meetpickfu-namecheap-transfer.md).
- [ ] **P4** B2B Transerv: listed domains are **Lane B Smartlead** only; Lane A Reply.io/Zapmail unchanged.

---

## Client program trackers

### TGA (`tga`)

| Smartlead | `standby_campaign_name` **TGA_Standby** · id **3908219** · main tenant (`smartlead_client_id` null on intake) |
|-----------|------------------------------------------------------------------------------------------------------------------|

| Domain | SURBL (Ruth) | Replace with | A Smartlead | B InboxKit | C Namecheap | D Replacement | Notes |
|--------|--------------|--------------|-------------|------------|-------------|---------------|-------|
| gtmarchitectshub.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | Was `google_domains_existing` / warming |
| gtmarchitectslab.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | |
| gtmarchitectsteam.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | |
| joingtmarchitects.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | |
| meetgtmarchitects.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | |
| workgtmarchitects.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | |

**TGA client batch**

- [ ] All six domains through pipeline A→C
- [ ] `Clients/TGA/delivery-intake.json` domain lists updated
- [ ] `sender-rotation.json` regenerated or hand-edited for new domains
- [ ] `domain_count` / sizer reconciled

**TGA clean (no rotation)** — Ruth CLEAN: `hellogtmarchitects`, `gotogtmarchitects`, `trygtmarchitects`, `teamgtmarchitects`, `withgtmarchitects`, `gtmarchitectshq`, `gtmarchitectsgroup` (re-verify on next audit).

---

### PickFu (`pickfu`)

| Smartlead | **PickFu_standby** · id **3971185** · `smartlead_client_id` **587678** |
|-----------|---------------------------------------------------------------------------|
| InboxKit | workspace **cb536e2f-4003-4d50-9c40-95d45eaefb13** |

| Domain | SURBL (Ruth) | Replace with | A | B | C | D | Notes |
|--------|--------------|--------------|---|---|---|---|-------|
| hellopickfu.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | Microsoft domain |
| joinpickfu.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | |
| meetpickfu.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | InboxKit purchase; transfer runbook |
| pickfuhq.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | |
| pickfuhub.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | |
| pickfuteam.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | |

**PickFu clean (hold):** `withpickfu.com`, `pickfugo.com`

**PickFu client batch**

- [ ] All six listed through A→C
- [ ] `Clients/PickFu/delivery-intake.json` + `inboxkit_provision.domains_active` updated
- [ ] Replacement domains provisioned (D) to restore domain count **8**

---

### B2B Transerv (`b2b-transerv`)

| Smartlead | **b2b_transerv_standby** · id **3972078** · `smartlead_client_id` **588623** |
|-----------|--------------------------------------------------------------------------------|

| Domain | SURBL (Ruth) | Replace with | A | B | C | D | Notes |
|--------|--------------|--------------|---|---|---|---|-------|
| meettranserv.com | PH, ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | Google domain |
| trytranserv.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | Microsoft domain |

**B2B clean (hold):** `connecttranserv`, `freighttranserv`, `gotranserv`, `hellotranserv`, `shiptranserv`, `withtranserv`

**B2B client batch**

- [ ] Both listed through A→C
- [ ] `Clients/B2B Transerv/delivery-intake.json` updated
- [ ] Two replacements provisioned (maintain 8 domains / 24 inboxes)

---

### Iolite Ventures (`iolite-ventures`)

| Smartlead | **iolite_ventures_standby** · id **3937881** · `smartlead_client_id` **582826** |
|-----------|-------------------------------------------------------------------------------------|

| Domain | SURBL (Ruth) | Replace with | A | B | C | D | Notes |
|--------|--------------|--------------|---|---|---|---|-------|
| iolitegrowth.com | ABUSE | | - [ ] | - [ ] | - [ ] | - [ ] | **In progress** · Smartlead IDs 23119532–36 · tracker [`Clients/Iolite Ventures/build/infra/DNSBL-ROTATION-iolitegrowth-2026-10-06.md`](../../../Clients/Iolite%20Ventures/build/infra/DNSBL-ROTATION-iolitegrowth-2026-10-06.md) |

**Iolite clean (hold):** `goiolite`, `growwithiolite`, `helloiolite`, `joiniolite`, `meetiolite`, `partneriolite`, `teamiolite`

**Iolite client batch**

- [ ] One listed through A→C
- [ ] One replacement provisioned
- [ ] `Clients/Iolite Ventures/delivery-intake.json` updated

---

## Program completion

- [ ] **15/15** listed domains retired (A→C) or documented exception
- [ ] Replacement count matches retired count per client (or deliberate lower estate + sizer update)
- [ ] Second full-estate DNSBL screen — zero **LISTED** on active + standby inventory
- [ ] Ruth (or `inbox screen`) sign-off email archived under `Clients/*/build/infra/`
- [ ] Session note in `vault/log.md` or client CSM when client-visible

---

## Suggested work order

**Shaira program order (CT 2026-10-06):** Iolite → TGA → PickFu → B2B Transerv.

1. **Iolite** (1 listed) — **started 2026-10-06** (pilot retire; lowest blast radius).
2. **TGA** (6 listed).
3. **PickFu** (6 listed).
4. **B2B Transerv** (2 listed).

Within a client: start with domains **not** currently carrying the most warmup reputation if unsure; otherwise alphabetical is fine.

---

## Commands cheat sheet

```bash
# DNSBL re-check (before buying replacements)
./ops/delivery/run.sh inbox screen --client <slug> \
  --candidates '["candidate1","candidate2"]' \
  --format markdown \
  --out Clients/<Client>/build/infra/domain-screen-<date>.json

# Smartlead sync (after InboxKit mailboxes exist)
./ops/delivery/run.sh inbox smartlead-sync --client <slug> --once

# Namecheap provision step (from ROE)
./ops/delivery/scripts/run_namecheap_provision_step.sh <slug> mailboxes
```

Smartlead detach/attach details: ROE **Stage 5** § Microsoft + bulk attach (`ROE-INBOX-PROVISION-CHECKLIST.md`).

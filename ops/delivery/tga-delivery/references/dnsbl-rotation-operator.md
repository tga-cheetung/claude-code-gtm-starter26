# DNSBL rotation — operator reference (retire + replace)

Companion to `/tga-delivery`. **Scripts live in `tgaworkspace`** (`ops/delivery/run.sh`, provision runners). This file ships in `tga-skills` for Shaira; open the same path under your workspace clone when using CLI steps.

**Program order:** Iolite → TGA → PickFu → B2B Transerv.  
**Per domain retire:** Smartlead → InboxKit → Namecheap.  
**Per domain replace:** Namecheap → InboxKit → Smartlead (ROE Stages 4–5b).

**Tracker:** `ops/delivery/inbox-provision/DOMAIN-DNSBL-ROTATION-2026-10-06.md`  
**Shaira UI checklist:** `ops/delivery/inbox-provision/DNSBL-ROTATION-SHAIRA-INSTRUCTIONS-2026-10-06.md`  
**Full ROE:** `ops/delivery/inbox-provision/ROE-INBOX-PROVISION-CHECKLIST.md` · **Skill index:** `ops/delivery/tga-delivery/SKILL.md`

## When to invoke

| Step | Use `/tga-delivery`? |
|------|----------------------|
| A–C Retire (Smartlead / InboxKit / Namecheap off) | No — Notion + UI |
| D1 Domain screen (DNSBL) | Yes — after CT gives candidate **label** |
| D2–D5 Provision + Smartlead + tracking | Yes — only after CT approves **CLEAR** row |
| D6 Intake / blocklist git commit | Ask CT — usually CT or engineering |

## Stage D order (checklist)

Run from **tgaworkspace** root with workspace `.env` (Smartlead, InboxKit, Namecheap). Never paste keys into Notion or chat.

- [ ] **D1 Screen** — `./ops/delivery/run.sh inbox screen --client <slug> --candidates '["<label>"]' --format markdown` → paste table to CT → wait for **CLEAR** on exact FQDN  
- [ ] **D2 Namecheap + InboxKit** — `python3 ops/delivery/scripts/provision_inbox_estate_namecheap.py --client <slug> --step nameservers|namecheap-register|forwarding|mailboxes`  
- [ ] **D3 Smartlead** — `./ops/delivery/run.sh inbox smartlead-sync --client <slug> --until-done`  
- [ ] **D4 Tracking** — `./ops/delivery/run.sh inbox smartlead-tracking --client <slug> --domain <fqdn> --verify-dns`  
- [ ] **D5 Standby** — attach all new inboxes to **standby campaign only** (never START live campaigns)  
- [ ] **D6 Register** — `python3 ops/delivery/scripts/emit_send_estate_register.py --write` + Notion send-estate if you own it  

---

## Before you start

1. Clone or pull **`tgaworkspace`** (you need `ops/delivery/` on disk for CLI).
2. Install skill: `git pull` in `tga-skills` → `bash install.sh --category delivery --target ~/.claude/skills` (or project `.claude/skills`).
3. Workspace env: root `.env` with `SMARTLEAD_API_KEY`, `INBOXKIT_API_KEY`, `NAMECHEAP_*` (CT provides access; never paste keys in Notion).
4. **Replacement hostname:** only after CT approves a **CLEAR** row from domain screen (DNSBL + estate). Do not register on your own.

```bash
cd ~/Apps/claude-code/workspace   # or your tgaworkspace path
pip install -r ops/delivery/requirements.txt   # surblclient for screen
```

---

## Phase A–C — Retire (manual UI)

See Notion **Shaira operator guide** or `ops/delivery/inbox-provision/DNSBL-ROTATION-SHAIRA-INSTRUCTIONS-2026-10-06.md` in git.

---

## Phase D — Replace one domain (full ROE)

Use client slug from intake: `iolite-ventures`, `tga`, `pickfu`, `b2b-transerv`.

### D0 — CT gate

- CT names the **label** (e.g. `getiolite` → buys `getiolite.com` and `.co` screen pair unless told otherwise).
- Confirm domain is not already in `delivery-intake.json` `selected_domains` or blocklist.

### D1 — Screen (DNSBL + estate + price)

```bash
./ops/delivery/run.sh inbox screen --client <slug> \
  --candidates '["<label>"]' \
  --format markdown \
  --out Clients/<ClientFolder>/build/infra/domain-screen-replace-<label>-<YYYY-MM-DD>.json
```

Paste markdown table to CT. Proceed only on **CLEAR** for the exact FQDN you will register (usually `.com`).

### D2 — Namecheap + InboxKit provision (runner)

Requires `inboxkit_workspace_id` on intake (PickFu, B2B, Iolite if set). Namecheap API must run from **whitelisted IP** (often CT’s Mac or provision host).

```bash
# 1) InboxKit nameservers JSON
python3 ops/delivery/scripts/provision_inbox_estate_namecheap.py --client <slug> --step nameservers

# 2) Register on Namecheap (tag client in UI)
python3 ops/delivery/scripts/provision_inbox_estate_namecheap.py --client <slug> --step namecheap-register

# 3) 301 forwarding via InboxKit (redirect_target on intake)
python3 ops/delivery/scripts/provision_inbox_estate_namecheap.py --client <slug> --step forwarding

# 4) Mailboxes (GOOGLE / MICROSOFT per inbox_platform_split on intake)
python3 ops/delivery/scripts/provision_inbox_estate_namecheap.py --client <slug> --step mailboxes
```

**Manual fallback:** ROE checklist Stage 4 — register in Namecheap UI, add domain to InboxKit workspace, buy 3 mailboxes with same **sender_identity_mode** as sibling domains (founder locals from intake).

**Exception:** `inboxkit_purchased_domains` on intake (e.g. PickFu `meetpickfu.com`) — do not re-buy via Namecheap without CT runbook.

### D3 — Smartlead sync (Stage 5)

Do not wait in chat; use poller:

```bash
./ops/delivery/run.sh inbox smartlead-sync --client <slug> --once
# or until all new mailboxes attach:
./ops/delivery/run.sh inbox smartlead-sync --client <slug> --until-done --interval 120
```

**Microsoft:** accounts may land on TGA **main** tenant first; ROE Stage 5 — move to subclient `smartlead_client_id` if needed. PickFu/B2B/Iolite have subclient ids on intake.

**Manual fallback:** Smartlead UI → add inbox with SMTP/IMAP from InboxKit credentials → assign to **standby campaign only** (`standby_campaign_id` on intake).

### D4 — Custom tracking (Stage 5b)

After sync, before closing the domain:

```bash
./ops/delivery/run.sh inbox smartlead-tracking --client <slug> --domain <new-domain.com> --verify-dns
```

CNAME: `emailtracking.<domain>` → `open.sleadtrack.com` (see ROE Stage 5b).

### D5 — Standby attach

Confirm new `@<domain>` inboxes are on **standby** campaign only (not live sends). Bulk attach via API if UI only adds one (see `tool-docs/cheatsheets/smartlead.md`).

### D6 — Register + intake (CT or git)

```bash
python3 ops/delivery/scripts/emit_send_estate_register.py --client <slug> --write
```

CT updates `delivery-intake.json`: add new domain to `google_domains_new` / `microsoft_domains_new` / `selected_domains`; remove retired domain; commit. Add retired domain to blocklist in `ops/delivery/_lib/inbox_provision/blocklist-config.yaml`.

### D7 — Notion send-estate (if client uses it)

Push domain + inbox rows per `ops/delivery/docs/send-estate-notion.md` (linked DBs on client workspace).

---

## Client IDs (quick)

| Client | slug | Smartlead `client_id` | Standby id | Standby name |
|--------|------|----------------------|------------|--------------|
| Iolite | `iolite-ventures` | 582826 | 3937881 | iolite_ventures_standby |
| TGA | `tga` | (main tenant) | 3908219 | TGA_Standby |
| PickFu | `pickfu` | 587678 | 3971185 | PickFu_standby |
| B2B | `b2b-transerv` | 588623 | 3972078 | b2b_transerv_standby |

---

## Escalate to CT

- Replacement screen returns **LISTED** or **REVIEW**
- Namecheap `Invalid request IP`
- InboxKit slot / wallet errors
- Smartlead SMTP 535 persists after 24h on Microsoft
- Any live campaign still using the domain

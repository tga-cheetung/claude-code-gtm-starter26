# DNSBL domain rotation — operator guide (Shaira)

Git copy of the Notion operator guide. **Notion stays canonical for CT edits:**  
https://app.notion.com/p/3f18d40b6221817cb58de9c195a75027

**Human executor:** Shaira Abdul · **Sponsor:** CT · **Ticket:** COS-161

## Governing thought

Rotate every SURBL-listed secondary domain in order **Iolite → TGA → PickFu → B2B Transerv**, using **Smartlead → InboxKit → Namecheap** to retire each domain, then the reverse to bring in CT-approved replacements.

**Audience:** Shaira Abdul (manual execution in Smartlead, InboxKit, Namecheap).  
**Source:** Ruth “Domain Status” email, 2026-10-06 (SURBL).  
**Engineering runbook (IDs, git checkboxes):** [`DOMAIN-DNSBL-ROTATION-2026-10-06.md`](DOMAIN-DNSBL-ROTATION-2026-10-06.md)

## Reprovision inboxes with `/tga-delivery` (Stage D)

**Notion (live):** [Shaira operator guide](https://app.notion.com/p/3f18d40b6221817cb58de9c195a75027) — full setup, when to use the skill, session brief template, D1–D6 checklist, example prompts.

**Summary:** Retire A–C = manual UIs. Replace D = open **tgaworkspace** in Claude Code → `/tga-delivery` → run commands the skill prints. Requires both repos:

```bash
git pull   # in tgaworkspace and tga-skills
cd /path/to/tga-skills && bash install.sh --category delivery --target ~/.claude/skills
```

Reference on disk: `~/.claude/skills/tga-delivery/references/dnsbl-rotation-operator.md`

**Session brief template:**

```
DNSBL replacement — Stage D only.
Client slug: <iolite-ventures|tga|pickfu|b2b-transerv>
Retired domain: <fqdn> (A–C done)
Replacement label CT approved: <label>
FQDN to register: <name>.com
Walk D1–D5 with exact run.sh commands; I run them and paste errors.
```

Do not register or buy mailboxes until CT approves a **CLEAR** screen row.

---

## What you are doing

Fifteen **secondary cold-email domains** are listed on SURBL (spam blocklists). They must come **out** of Smartlead and InboxKit, auto-renew off in Namecheap, then each retired domain gets **one replacement** domain (CT approves the label; you run the same three platforms in reverse).

**Never** turn on a **live** outbound campaign on a standby pool. These steps are for **standby** estates only.

**Primary domains are not on this list** (do not touch): `thegtmarchitects.com`, `pickfu.com`, `b2btranserv.com`, `ioliteventures.co`.

---

## Golden rules

1. **One domain at a time** inside a client. Finish Smartlead → InboxKit → Namecheap for that domain before starting the next.
2. **Retire order:** Smartlead → InboxKit → Namecheap.
3. **Replacement order:** Namecheap register → InboxKit mailboxes → Smartlead sync and attach to standby.
4. **Do not delete** Namecheap DNS on day one. Turn off auto-renew; let CT decide on expiry later.
5. **Do not buy** a replacement until CT confirms the candidate is **CLEAR** on DNSBL (CT or CT’s script run).
6. **Slack CT** when: a domain is on a **live** campaign, Microsoft mailboxes won’t save to Smartlead, `meetpickfu.com` transfer questions, or B2B Lane A (Reply.io) overlap.

---

## Priority order (whole program)

| Phase | Client | Listed domains | Count |
|-------|--------|----------------|-------|
| **1** | Iolite Ventures | `iolitegrowth.com` | 1 |
| **2** | TGA | `gtmarchitectshub`, `gtmarchitectslab`, `gtmarchitectsteam`, `joingtmarchitects`, `meetgtmarchitects`, `workgtmarchitects` | 6 |
| **3** | PickFu | `hellopickfu`, `joinpickfu`, `meetpickfu`, `pickfuhq`, `pickfuhub`, `pickfuteam` | 6 |
| **4** | B2B Transerv (Lane B only) | `meettranserv`, `trytranserv` | 2 |

Complete **Phase 1** (retire + replace) before Phase 2. Within a phase, alphabetical domain order is fine unless CT says otherwise.

**B2B:** Only **Lane B** (Namecheap + InboxKit + Smartlead). Do **not** change Reply.io / Zapmail Lane A domains.

---

## Client reference card

### Phase 1 — Iolite (`iolite-ventures`)

| Item | Value |
|------|--------|
| Namecheap tag | **Iolite** |
| InboxKit workspace | Confirm with CT (intake may use default TGA workspace env; label **Iolite** in UI) |
| Smartlead subclient | **582826** |
| Standby campaign | **iolite_ventures_standby** · id **3937881** |
| Inboxes per domain | 3 (David: `david`, `david.varnai`, `dvarnai`) |
| Listed | `iolitegrowth.com` |
| Keep (do not retire) | `growwithiolite`, `meetiolite`, `helloiolite`, `teamiolite`, `goiolite`, `joiniolite`, `partneriolite` |
| Git tracker | `Clients/Iolite Ventures/build/infra/DNSBL-ROTATION-iolitegrowth-2026-10-06.md` |
| Pre-filled Smartlead IDs (`iolitegrowth.com`) | 23119532, 23119533, 23119536 |

### Phase 2 — TGA (`tga`)

| Item | Value |
|------|--------|
| Namecheap tag | **TGA** (or default portfolio tag CT uses) |
| Smartlead | **Main tenant** (no subclient id on intake) |
| Standby | **TGA_Standby** · id **3908219** |
| Inboxes per domain | 3 (CT locals: `cheetung`, `ct`, `chee.tung`) |
| Listed (6) | See priority table |
| Keep | `hellogtmarchitects`, `gotogtmarchitects`, `trygtmarchitects`, `teamgtmarchitects`, `withgtmarchitects`, `gtmarchitectshq`, `gtmarchitectsgroup` |

### Phase 3 — PickFu (`pickfu`)

| Item | Value |
|------|--------|
| Namecheap tag | **PickFu** |
| InboxKit workspace id | `cb536e2f-4003-4d50-9c40-95d45eaefb13` |
| Smartlead subclient | **587678** |
| Standby | **PickFu_standby** · id **3971185** |
| Inboxes per domain | 3 (John / Justin locals per intake) |
| Listed (6) | See priority table |
| Keep | `withpickfu.com`, `pickfugo.com` |
| Special | **`meetpickfu.com`** was bought via InboxKit; transfer runbook: `Clients/PickFu/build/infra/meetpickfu-namecheap-transfer.md` — ask CT before registrar steps |

### Phase 4 — B2B Transerv (`b2b-transerv`)

| Item | Value |
|------|--------|
| Namecheap tag | **B2B Transerv** |
| InboxKit workspace id | `8bdd3b65-122c-4ba0-8022-9b115cf3a2b1` |
| Smartlead subclient | **588623** |
| Standby | **b2b_transerv_standby** · id **3972078** |
| Inboxes per domain | 3 (Cale Pearson locals) |
| Listed | `meettranserv.com` (Google), `trytranserv.com` (Microsoft) |
| Keep | `connecttranserv`, `freighttranserv`, `gotranserv`, `hellotranserv`, `shiptranserv`, `withtranserv` |

---

## Per-domain checklist (copy for each domain)

Use this for **every** listed domain. Check boxes in Notion or the client tracker; note date completed.

### A — Smartlead

1. Log into Smartlead with TGA credentials. Switch to the correct **client** (subclient) when the table above lists a `client_id`; TGA main has no subclient switch.
2. **Email Accounts** (or API): find all accounts where the address ends in `@<domain>`. Write down each **email account id** (usually 3).
3. Open the **standby** campaign (name + id from reference card). **Remove** those accounts from the campaign (Campaign → Email Accounts → remove). Do not delete accounts yet.
4. Search **all campaigns** on that client for the same domain. Remove from any **active** campaign (if any — escalate to CT if you find volume).
5. For each account: **pause warmup** / stop sending per Smartlead UI.
6. After InboxKit mailboxes are deleted (step B): **delete** the email accounts in Smartlead (or archive per CT).
7. Confirm: no `@<domain>` addresses left on standby or live campaigns.

**API reference (if CT asks you to use curl):** `tool-docs/cheatsheets/smartlead.md` — detach uses `DELETE /campaigns/{standby_id}/email-accounts` with body `{"email_account_ids": [...]}`.

### B — InboxKit

1. Open the correct **workspace** (PickFu / B2B / Iolite — see reference card).
2. **Mailboxes** → filter domain `<domain>`. Confirm count matches estate (usually 3).
3. **Delete or cancel** every mailbox on that domain.
4. If the domain had **email tracking** for Smartlead: note `emailtracking.<domain>` CNAME (CT or automation may remove later). Do not break other domains’ DNS.
5. Leave the **domain** in the workspace parked until Namecheap step is done unless CT says remove.

### C — Namecheap

1. Log into TGA Namecheap account. Find `<domain>`. Confirm client tag matches reference card.
2. **Auto-renew → Off** for that domain.
3. Do **not** delete the domain or wipe DNS on day one.
4. Slack **CT** that the domain is retired so git blocklist + `delivery-intake.json` can be updated (or CT delegates a git commit to engineering).

### D — Replacement (after CT picks a CLEAR label)

1. CT confirms replacement hostname (DNSBL clear + available).
2. **Namecheap:** Register the new `.com` (use provision host / whitelist if CT directs — see ROE Stage 4).
3. **InboxKit:** Point nameservers, create 3 mailboxes with the same sender naming pattern as sibling domains on that client.
4. **Smartlead:** Add accounts to the subclient (main+subclient quirk for Microsoft — see ROE). Run sync if CT provides: `./ops/delivery/run.sh inbox smartlead-sync --client <slug> --once`
5. **Attach** new inboxes to the **standby** campaign only.
6. Update client **Notion send-estate** DB if you maintain it (Iolite/PickFu/B2B have Notion links in intake).

---

## Platform tips (UI)

### Smartlead

- Subclients: use the client switcher; PickFu / Iolite / B2B each have their own id.
- Bulk attach: UI sometimes only adds one inbox; for multiple ids CT may use API `POST /campaigns/{id}/email-accounts` with `email_account_ids` array.
- Microsoft inboxes may appear under **main** tenant first; CT documented in ROE Stage 5.

### InboxKit

- Always verify **workspace** in the top bar before deleting mailboxes.
- Credentials for Smartlead import: mailbox → credentials (Google SMTP/IMAP).

### Namecheap

- Tag domains consistently (**Iolite**, **PickFu**, **B2B Transerv**, **TGA**).
- Registration for replacements may need to run from CT’s **whitelisted IP** server; if Namecheap says invalid IP, stop and ping CT.

---

## Phase 1 walkthrough — `iolitegrowth.com` (start here)

1. Smartlead client **582826** → standby **3937881** → remove accounts **23119532, 23119533, 23119536** from campaign → pause warmup.
2. InboxKit (Iolite workspace) → delete 3 mailboxes on `iolitegrowth.com`.
3. Namecheap → auto-renew off for `iolitegrowth.com`.
4. Slack CT: “Iolite iolitegrowth retired A–C done.”
5. Wait for CT replacement label → then D (register + provision + standby attach).

---

## Escalate to CT

- Any listed domain still on a **non-standby** campaign sending mail.
- Cannot find mailboxes or accounts (count ≠ 3).
- `meetpickfu.com` registrar / transfer lock.
- B2B Reply.io domains or Zapmail.
- Replacement registration blocked (DNSBL listed, Namecheap IP error, InboxKit out of slots).

---

## Done criteria (whole program)

- 15/15 listed domains: Smartlead detached, InboxKit mailboxes gone, Namecheap auto-renew off.
- 15 replacement domains provisioned and on standby (or CT documents an intentional lower count).
- CT signs off second DNSBL screen on the estate.

**Git mirror (engineering):** `ops/delivery/inbox-provision/DOMAIN-DNSBL-ROTATION-2026-10-06.md`

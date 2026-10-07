# Iolite — retire `iolitegrowth.com` (DNSBL)

**Parent runbook:** [`ops/delivery/inbox-provision/DOMAIN-DNSBL-ROTATION-2026-10-06.md`](../../../../ops/delivery/inbox-provision/DOMAIN-DNSBL-ROTATION-2026-10-06.md)

**Why this domain:** Ruth 2026-10-06 SURBL **ABUSE**. Re-check 2026-10-06: `listed=True` (surbl_multi ABUSE; dig backend — install `surblclient` in venv before replacement buys).

| Field | Value |
|-------|--------|
| Client slug | `iolite-ventures` |
| Smartlead `client_id` | **582826** |
| Standby | **iolite_ventures_standby** · campaign id **3937881** (only campaign on subclient; **DRAFTED**) |
| Inboxes | 3 × David locals on domain |
| Estate after retire | 7 domains / 21 inboxes until **D** replacement |

---

## Pre-flight (Iolite)

- [x] **P2-Iolite** No live (non-standby) campaign on subclient — verified API 2026-10-06.
- [ ] **P0** `surblclient` in venv used for `inbox screen` (optional for retire; required for **D**).
- [ ] Confirm `INBOXKIT_WORKSPACE_ID` (or add `inboxkit_workspace_id` to intake) points at **Iolite** workspace before **B**.

---

## A — Smartlead

| Step | Done | Detail |
|------|------|--------|
| A1 List `@iolitegrowth.com` | [x] | 2026-10-06 |
| A2 Account IDs | [x] | See table below |
| A3 Remove from standby **3937881** | [ ] | `email_account_ids`: 23119532, 23119533, 23119536 |
| A4 Other campaigns | [x] | None besides standby |
| A5 Warmup / pause | [ ] | After detach, disable warmup on the 3 accounts (UI or API) |
| A6 Delete/archive accounts | [ ] | Only after B mailboxes gone |
| A7 Audit | [ ] | No `@iolitegrowth.com` on standby or live |

### Mailbox IDs (pre-filled)

| `email_account_id` | `from_email` | On standby? |
|--------------------|--------------|-------------|
| 23119532 | david@iolitegrowth.com | yes |
| 23119533 | david.varnai@iolitegrowth.com | yes |
| 23119536 | dvarnai@iolitegrowth.com | yes |

**A3 command** (from repo root, `.env` has `SMARTLEAD_API_KEY`):

```bash
curl -s -X DELETE \
  'https://server.smartlead.ai/api/v1/campaigns/3937881/email-accounts?api_key='"$SMARTLEAD_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"email_account_ids": [23119532, 23119533, 23119536]}'
```

---

## B — InboxKit

- [ ] **B1** List mailboxes on `iolitegrowth.com` (expect 3).
- [ ] **B2** Delete/cancel all mailboxes on domain.
- [ ] **B3** Remove tracking CNAME if present (`emailtracking.iolitegrowth.com` → check ROE 5b).
- [ ] **B4** Note domain left in workspace vs removed (park until **C**).

---

## C — Namecheap

- [ ] **C1** Domain in portfolio, tag **Iolite**.
- [ ] **C2** Auto-renew **off**.
- [ ] **C3** Add to `blocklist-config.yaml` (+ client screen artifact if used).
- [ ] **C4** Remove `iolitegrowth.com` from `google_domains_new` / `infra_approval.domains_approved` / register JSON — commit with batch.
- [ ] **C5** Optional: expire after quarantine.

**Hold (do not touch):** `growwithiolite`, `meetiolite`, `helloiolite`, `teamiolite`, `goiolite`, `joiniolite`, `partneriolite`.

---

## D — Replacement (restore 8 domains)

- [ ] **D1** Screen candidates (CLEAR only), e.g. labels from David’s form not yet in estate:

```bash
./ops/delivery/run.sh inbox screen --client iolite-ventures \
  --candidates '["getiolite","tryiolite","withiolite"]' \
  --format markdown \
  --out Clients/Iolite\ Ventures/build/infra/domain-screen-replace-iolitegrowth-2026-10-06.json
```

- [ ] **D2** CT pick one CLEAR domain.
- [ ] **D3** Namecheap → InboxKit (3 inboxes, David locals) → `./ops/delivery/run.sh inbox smartlead-sync --client iolite-ventures --once`
- [ ] **D4** Attach new inboxes to standby **3937881**.
- [ ] **D5** Update Notion send-estate DB + note mapping here.

---

## Client batch sign-off

- [ ] `iolitegrowth.com` through **A→C**
- [ ] One replacement through **D**
- [ ] `delivery-intake.json` + `send-estate-register.json` reconciled
- [ ] Master runbook Iolite row ticked

#!/usr/bin/env python3
"""Screen secondary sending domains: shape rules + estate blocklist + registrar availability."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

WORKSPACE = Path(__file__).resolve().parents[4]
if str(WORKSPACE) not in sys.path:
    sys.path.insert(0, str(WORKSPACE))

from ops.delivery._lib.env import load_env, require_env
from ops.delivery._lib.inbox_provision.dnsbl_check import (
    check_dnsbl as lookup_dnsbl,
    dnsbl_blocks_purchase,
    run_dnsbl_self_test,
)
from ops.delivery._lib.inbox_provision.domain_rules import (
    expand_com_co_pairs,
    load_rules,
    normalize_domain,
    validate_against_blocklist,
)
from ops.delivery._lib.inbox_provision.estate_blocklist import collect_estate_domains, read_intake

INBOXKIT_BASE = "https://api.inboxkit.com/v1"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)


def _ik_available(domain: str, workspace_id: str | None = None) -> dict[str, Any]:
    import urllib.parse

    key = require_env("INBOXKIT_API_KEY")
    ws = workspace_id or require_env("INBOXKIT_WORKSPACE_ID")
    url = f"{INBOXKIT_BASE}/api/domains/available?" + urllib.parse.urlencode({"domain": domain})
    cmd = [
        "curl",
        "-sS",
        url,
        "-H",
        f"Authorization: Bearer {key}",
        "-H",
        f"X-Workspace-Id: {ws}",
        "-H",
        f"User-Agent: {UA}",
    ]
    raw = subprocess.run(cmd, capture_output=True, text=True).stdout
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"available": False, "_raw": raw}


def _namecheap_lookup(domains: list[str]) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """Namecheap check + catalog register prices for .com / .co."""
    import os

    os.environ.setdefault("NAMECHEAP_USER", "cheetung")
    meta: dict[str, Any] = {"catalog_register_usd_y1": {}, "error": None}
    try:
        from ops.delivery._lib.inbox_provision.namecheap_registrar import check_domains, get_register_price_usd

        for tld in ("com", "co"):
            meta["catalog_register_usd_y1"][tld] = get_register_price_usd(tld)
        return check_domains(domains), meta
    except Exception as exc:
        meta["error"] = str(exc)
        return {}, meta


def _register_price_for_row(
    domain: str,
    nc_row: dict[str, Any] | None,
    catalog: dict[str, float | None],
) -> float | None:
    if nc_row and nc_row.get("is_premium") and nc_row.get("premium_register_usd"):
        return float(nc_row["premium_register_usd"])
    tld = domain.rsplit(".", 1)[-1].lower()
    if nc_row and nc_row.get("available") and catalog.get(tld) is not None:
        return catalog[tld]
    return catalog.get(tld)


def screen_domains(
    client_slug: str,
    candidates: list[str],
    *,
    check_availability: bool = True,
    pair_com_co: bool = True,
    dnsbl_enabled: bool = True,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    load_env()
    intake = read_intake(client_slug)
    primary = intake.get("primary_domain")
    workspace_id = intake.get("inboxkit_workspace_id")
    blocklist = collect_estate_domains(client_slug)
    rules = load_rules()
    if pair_com_co and rules.get("shape", {}).get("pair_com_and_co_on_screen"):
        candidates = expand_com_co_pairs(candidates, rules)
    else:
        candidates = [normalize_domain(c) for c in candidates]

    nc_checks, nc_meta = _namecheap_lookup(candidates) if check_availability else ({}, {})
    catalog = nc_meta.get("catalog_register_usd_y1") or {}

    dnsbl_meta: dict[str, Any] = {}
    if dnsbl_enabled and rules.get("reputation", {}).get("block_if_dnsbl_listed", True):
        ok, msg = run_dnsbl_self_test()
        dnsbl_meta["control_ok"] = ok
        dnsbl_meta["control_detail"] = msg
        if not ok:
            dnsbl_meta["warning"] = "DNSBL control query failed; listed checks may be unreliable"

    results: list[dict[str, Any]] = []

    for raw in candidates:
        verdict = validate_against_blocklist(
            raw, blocklist, primary_domain=primary, check_dnsbl=False
        )
        row: dict[str, Any] = {
            "domain": verdict.domain,
            "shape_ok": verdict.ok,
            "estate": "CLEAR" if verdict.ok else "BLOCKED",
            "code": verdict.code,
            "detail": verdict.detail,
        }
        if not verdict.ok:
            results.append(row)
            continue

        if dnsbl_enabled and rules.get("reputation", {}).get("block_if_dnsbl_listed", True):
            db = lookup_dnsbl(verdict.domain)
            row["dnsbl"] = db.summary
            row["dnsbl_listed"] = db.listed
            row["dnsbl_inconclusive"] = db.inconclusive
            if db.hits:
                row["dnsbl_hits"] = [
                    {
                        "provider": h.provider_id,
                        "labels": list(h.labels),
                        "return_codes": list(h.return_codes),
                    }
                    for h in db.hits
                ]
            if dnsbl_blocks_purchase(db):
                row["estate"] = "LISTED"
                row["code"] = "dnsbl_listed"
                row["detail"] = db.summary
                results.append(row)
                continue
            if db.inconclusive:
                row["estate"] = "REVIEW"
                row["code"] = "dnsbl_inconclusive"
                row["detail"] = db.summary
                results.append(row)
                continue

        if rules.get("reputation", {}).get("block_if_in_inboxkit") and verdict.domain in blocklist:
            row["estate"] = "BLOCKED"
            row["code"] = "inboxkit_or_estate"
            row["detail"] = "Already in workspace or estate"
            results.append(row)
            continue

        if check_availability and rules.get("reputation", {}).get("require_registrar_available"):
            nc = nc_checks.get(verdict.domain, {})
            row["namecheap_available"] = nc.get("available") if nc else None
            row["namecheap_premium"] = nc.get("is_premium", False) if nc else False
            row["namecheap_register_usd_y1"] = _register_price_for_row(verdict.domain, nc, catalog)

            avail = _ik_available(verdict.domain, workspace_id)
            row["inboxkit_available"] = bool(avail.get("available"))
            row["inboxkit_price"] = avail.get("price")

            if nc_meta.get("error"):
                row["namecheap_skipped"] = nc_meta["error"]

            nc_ok = row["namecheap_available"] is True
            ik_ok = row["inboxkit_available"] is True
            if nc_meta.get("error"):
                available = ik_ok
            else:
                available = nc_ok and ik_ok

            if row["namecheap_available"] is False:
                row["estate"] = "UNAVAILABLE"
                row["code"] = "namecheap_taken"
                row["detail"] = nc.get("description") or "Taken at Namecheap"
            elif not ik_ok:
                row["estate"] = "UNAVAILABLE"
                row["code"] = "inboxkit_unavailable"
                row["detail"] = avail.get("message", "Not available in InboxKit check")
            elif not available:
                row["estate"] = "UNAVAILABLE"
                row["code"] = "registrar_unavailable"
                row["detail"] = "Failed availability checks"
            else:
                row["estate"] = "CLEAR"
        results.append(row)

    nc_meta["dnsbl"] = dnsbl_meta
    return results, nc_meta


def format_ct_markdown(payload: dict[str, Any]) -> str:
    client = payload.get("client_slug", "")
    lines = [
        f"## Domain screen — {client}",
        "",
        payload.get("rules", "").strip(),
        "",
    ]
    pricing_note = (payload.get("pricing") or {}).get("note")
    if pricing_note:
        lines.extend([pricing_note.strip(), ""])

    catalog = (payload.get("pricing") or {}).get("catalog_register_usd_y1") or {}
    if catalog:
        cat_parts = [f".{tld} ${price:.2f}/yr catalog" for tld, price in sorted(catalog.items()) if price]
        if cat_parts:
            lines.append("**Namecheap register catalog (1yr):** " + ", ".join(cat_parts))
            lines.append("")

    dnsbl = (payload.get("pricing") or {}).get("dnsbl") or {}
    if dnsbl.get("control_detail"):
        status = "ok" if dnsbl.get("control_ok") else "FAILED"
        lines.append(f"**DNSBL control (SURBL):** {status} — {dnsbl.get('control_detail')}")
        if dnsbl.get("warning"):
            lines.append(f"_{dnsbl['warning']}_")
        lines.append("")

    lines.append(
        "| Domain | Estate | DNSBL | NC avail | NC $/yr | IK avail | IK price |"
    )
    lines.append("| --- | --- | --- | --- | --- | --- | --- |")
    for r in payload.get("results", []):
        nc_a = r.get("namecheap_available")
        nc_a_s = "—" if nc_a is None else ("yes" if nc_a else "no")
        nc_p = r.get("namecheap_register_usd_y1")
        nc_p_s = f"${nc_p:.2f}" if isinstance(nc_p, (int, float)) else "—"
        ik_a = r.get("inboxkit_available")
        ik_a_s = "—" if ik_a is None else ("yes" if ik_a else "no")
        ik_p = r.get("inboxkit_price")
        ik_p_s = str(ik_p) if ik_p is not None else "—"
        dnsbl_s = r.get("dnsbl") or "—"
        lines.append(
            f"| {r.get('domain', '')} | {r.get('estate', '')} | {dnsbl_s} | {nc_a_s} | {nc_p_s} | {ik_a_s} | {ik_p_s} |"
        )

    clear = payload.get("clear") or []
    if clear:
        total = sum(
            float(r.get("namecheap_register_usd_y1") or 0)
            for r in clear
            if isinstance(r.get("namecheap_register_usd_y1"), (int, float))
        )
        lines.extend(
            [
                "",
                f"**CLEAR ({len(clear)}):** "
                + ", ".join(f"`{r['domain']}`" for r in clear),
            ]
        )
        if total > 0:
            lines.append(f"**Est. Namecheap year-1 register (CLEAR rows with catalog price):** ${total:.2f}")
    nc_err = (payload.get("pricing") or {}).get("namecheap_error")
    if nc_err:
        lines.extend(["", f"_Namecheap pricing skipped: {nc_err}_"])
    lines.append("")
    lines.append("_Pick `domain_count` names from CLEAR; write to `selected_domains` in delivery-intake.json._")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Screen secondary sending domains")
    p.add_argument("--client", required=True)
    p.add_argument("--candidates", help="JSON array of domain strings")
    p.add_argument("--file", help="JSON file with candidates array or {candidates:[]}")
    p.add_argument("--out", help="Write full screen result JSON")
    p.add_argument("--no-availability", action="store_true")
    p.add_argument("--skip-dnsbl", action="store_true", help="Skip SURBL/Spamhaus/URIBL lookups (dev only)")
    p.add_argument("--no-pair-com-co", action="store_true", help="Do not expand each label to .com and .co")
    p.add_argument(
        "--format",
        choices=("both", "markdown", "json"),
        default="both",
        help="CT markdown table, JSON payload, or both (default: both)",
    )
    args = p.parse_args(argv)

    if args.file:
        data = json.loads(Path(args.file).read_text(encoding="utf-8"))
        candidates = data if isinstance(data, list) else data.get("candidates", [])
    elif args.candidates:
        candidates = json.loads(args.candidates)
    else:
        raise SystemExit("Provide --candidates or --file")

    rules = load_rules()
    blocklist = collect_estate_domains(args.client)
    results, nc_meta = screen_domains(
        args.client,
        candidates,
        check_availability=not args.no_availability,
        pair_com_co=not args.no_pair_com_co,
        dnsbl_enabled=not args.skip_dnsbl,
    )
    clear = [r for r in results if r.get("estate") == "CLEAR"]

    payload = {
        "client_slug": args.client,
        "rules": rules["presentation"]["summary"].strip(),
        "pricing": {
            "note": (rules.get("presentation") or {}).get("pricing_note", "").strip(),
            "catalog_register_usd_y1": nc_meta.get("catalog_register_usd_y1"),
            "namecheap_error": nc_meta.get("error"),
            "dnsbl": nc_meta.get("dnsbl") or {},
        },
        "blocklist_size": len(blocklist),
        "pair_com_co": not args.no_pair_com_co,
        "results": results,
        "clear": clear,
    }
    text = json.dumps(payload, indent=2)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    if args.format in ("both", "markdown"):
        print(format_ct_markdown(payload))
        if args.format == "both":
            print("---")
            print("```json")
    if args.format in ("both", "json"):
        print(text)
        if args.format == "both":
            print("```")
    return 0 if clear else 1


if __name__ == "__main__":
    raise SystemExit(main())

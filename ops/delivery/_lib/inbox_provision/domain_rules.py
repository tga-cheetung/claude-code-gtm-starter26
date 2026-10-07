"""Validate secondary sending domain shape (canonical rules in domain-rules.yaml)."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

RULES_PATH = Path(__file__).with_name("domain-rules.yaml")


@dataclass(frozen=True)
class DomainVerdict:
    domain: str
    ok: bool
    code: str
    detail: str


def load_rules() -> dict[str, Any]:
    return yaml.safe_load(RULES_PATH.read_text(encoding="utf-8"))


def expand_com_co_pairs(candidates: list[str], rules: dict[str, Any] | None = None) -> list[str]:
    """Expand each hostname label to every allowlisted TLD (default .com + .co)."""
    rules = rules or load_rules()
    shape = rules.get("shape", {})
    if not shape.get("pair_com_and_co_on_screen", False):
        return list(dict.fromkeys(normalize_domain(c) for c in candidates))

    allow = shape.get("tld_allowlist") or [".com"]
    labels: set[str] = set()
    for raw in candidates:
        d = normalize_domain(raw)
        if not d:
            continue
        if "." in d:
            labels.add(d.rsplit(".", 1)[0])
        else:
            labels.add(d)

    expanded: list[str] = []
    seen: set[str] = set()
    for label in sorted(labels):
        for tld in allow:
            token = tld if str(tld).startswith(".") else f".{tld}"
            name = f"{label}{token}"
            if name not in seen:
                seen.add(name)
                expanded.append(name)
    return expanded


def normalize_domain(domain: str) -> str:
    d = domain.strip().lower()
    if d.startswith("http://") or d.startswith("https://"):
        d = d.split("://", 1)[1]
    d = d.split("/", 1)[0]
    if d.startswith("www."):
        d = d[4:]
    return d


def validate_shape(domain: str, rules: dict[str, Any] | None = None) -> DomainVerdict:
    rules = rules or load_rules()
    shape = rules["shape"]
    d = normalize_domain(domain)
    if not d or "." not in d:
        return DomainVerdict(d, False, "invalid_format", "Not a hostname")

    host, tld = d.rsplit(".", 1)
    tld_token = f".{tld}"
    if tld_token not in shape.get("tld_allowlist", [".com"]):
        return DomainVerdict(d, False, "tld_not_allowed", f"TLD must be {shape['tld_allowlist']}")

    if host.count(".") > 0:
        return DomainVerdict(d, False, "subdomain_not_allowed", "Use apex domain only, not subdomains")

    label = host
    if len(label) < int(shape.get("min_label_length", 4)):
        return DomainVerdict(d, False, "label_too_short", f"Label shorter than {shape['min_label_length']}")
    if len(label) > int(shape.get("max_label_length", 63)):
        return DomainVerdict(d, False, "label_too_long", f"Label longer than {shape['max_label_length']}")

    for ch in shape.get("forbid_chars", []):
        if ch in label:
            return DomainVerdict(d, False, "forbidden_char", f"Character '{ch}' not allowed")

    if shape.get("forbid_digits") and any(c.isdigit() for c in label):
        return DomainVerdict(d, False, "forbidden_digit", "Digits not allowed in hostname")

    if not label.isascii() or not label.isalpha():
        return DomainVerdict(d, False, "label_charset", "Hostname must be ASCII letters only")

    return DomainVerdict(d, True, "shape_ok", "Passes shape rules")


def validate_against_blocklist(
    domain: str,
    blocklist: set[str],
    *,
    primary_domain: str | None = None,
    check_dnsbl: bool | None = None,
) -> DomainVerdict:
    d = normalize_domain(domain)
    shape = validate_shape(d)
    if not shape.ok:
        return shape

    primary = normalize_domain(primary_domain) if primary_domain else None
    if primary and d == primary:
        return DomainVerdict(d, False, "primary_domain", "Primary domain cannot be a secondary sender")

    if d in blocklist or f"www.{d}" in blocklist:
        return DomainVerdict(d, False, "estate_blocked", "Domain appears in client sending estate blocklist")

    rules = load_rules()
    rep = rules.get("reputation") or {}
    do_dnsbl = check_dnsbl if check_dnsbl is not None else rep.get("block_if_dnsbl_listed", False)
    if do_dnsbl:
        from ops.delivery._lib.inbox_provision.dnsbl_check import check_dnsbl, dnsbl_blocks_purchase

        verdict = check_dnsbl(d)
        if dnsbl_blocks_purchase(verdict):
            return DomainVerdict(d, False, "dnsbl_listed", verdict.summary)
        dnsbl_cfg = rules.get("dnsbl") or {}
        if verdict.inconclusive and dnsbl_cfg.get("block_if_inconclusive", False):
            return DomainVerdict(d, False, "dnsbl_inconclusive", verdict.summary)

    return DomainVerdict(d, True, "clear", "CLEAR — passes shape, estate, and DNSBL")


def validate_batch(
    domains: list[str],
    blocklist: set[str],
    *,
    primary_domain: str | None = None,
    check_dnsbl: bool | None = None,
) -> list[DomainVerdict]:
    return [
        validate_against_blocklist(
            d, blocklist, primary_domain=primary_domain, check_dnsbl=check_dnsbl
        )
        for d in domains
    ]


def assert_all_clear(verdicts: list[DomainVerdict]) -> None:
    bad = [v for v in verdicts if not v.ok]
    if bad:
        lines = [f"  {v.domain}: {v.code} — {v.detail}" for v in bad]
        raise ValueError("Domain validation failed:\n" + "\n".join(lines))

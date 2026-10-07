"""DNSBL / domain reputation lookups before inbox-provision purchase.

Primary: surblclient (SURBL multi + Spamhaus DBL) when installed.
Fallback: DNS A-record queries (dig, then socket) with RFC-aligned decoding.
"""
from __future__ import annotations

import re
import socket
import subprocess
from dataclasses import dataclass, field
from typing import Any

from ops.delivery._lib.inbox_provision.domain_rules import load_rules, normalize_domain

# URIBL returns 127.0.0.1–2 when the resolver is not authorized (common on public DNS).
_URIBL_POLICY_OCTETS = frozenset({1, 2})

_SURBL_OCTET_LABELS: dict[int, str] = {
    2: "SBL",
    4: "PH",
    8: "MW",
    16: "ABUSE",
    32: "CR",
    64: "ABUSE",
    128: "LISTED",
}

# Spamhaus DBL listings use 127.0.1.x (not 127.0.0.x). See Spamhaus DBL FAQ.
_SPAMHAUS_DBL_BAD = range(2, 100)
_SPAMHAUS_DBL_ABUSED_LEGIT = range(102, 200)
_SPAMHAUS_POLICY_PREFIX = ("127", "255", "255")


@dataclass(frozen=True)
class DnsblHit:
    provider_id: str
    zone: str
    query: str
    return_codes: tuple[str, ...]
    labels: tuple[str, ...]


@dataclass
class DnsblVerdict:
    domain: str
    listed: bool
    inconclusive: bool
    hits: list[DnsblHit] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    @property
    def summary(self) -> str:
        if self.errors and self.inconclusive:
            return "; ".join(self.errors)
        if not self.hits:
            return "CLEAR on configured DNSBLs"
        parts: list[str] = []
        for h in self.hits:
            label_s = ",".join(h.labels) if h.labels else ",".join(h.return_codes)
            parts.append(f"{h.provider_id} {label_s}")
        return "; ".join(parts)


def _parse_ipv4_last_octet(answer: str) -> int | None:
    answer = answer.strip()
    if not re.match(r"^127\.0\.0\.\d+$", answer):
        return None
    return int(answer.rsplit(".", 1)[-1])


def _surbl_labels(octet: int) -> list[str]:
    labels: list[str] = []
    for bit, name in sorted(_SURBL_OCTET_LABELS.items()):
        if octet & bit:
            labels.append(name)
    if not labels:
        labels.append(f"LISTED-{octet}")
    return labels


def _spamhaus_dbl_from_answers(answers: list[str]) -> DnsblHit | str | None:
    """Parse Spamhaus DBL A records (127.0.1.x listings, 127.255.255.x errors)."""
    labels: list[str] = []
    codes: list[str] = []
    for ans in answers:
        octets = ans.strip().split(".")
        if len(octets) != 4:
            continue
        if octets[:3] == list(_SPAMHAUS_POLICY_PREFIX):
            return (
                "spamhaus_dbl: policy block (return {ans}) — "
                "use a non-public recursive resolver or retry from provision host"
            ).replace("{ans}", ans)
        if octets[:3] != ["127", "0", "1"]:
            continue
        codes.append(ans)
        code = int(octets[3])
        if code in _SPAMHAUS_DBL_BAD:
            labels.append("BAD")
        elif code in _SPAMHAUS_DBL_ABUSED_LEGIT:
            labels.append("ABUSED-LEGIT")
    if not codes:
        return None
    seen: set[str] = set()
    uniq = [lb for lb in labels if lb not in seen and not seen.add(lb)]
    return DnsblHit(
        provider_id="spamhaus_dbl",
        zone="dbl.spamhaus.org",
        query="",
        return_codes=tuple(codes),
        labels=tuple(uniq),
    )


def _dig_a(qname: str, timeout_sec: int = 5) -> tuple[list[str], str | None]:
    try:
        proc = subprocess.run(
            ["dig", "+short", "+time=3", "+tries=1", "A", qname],
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            check=False,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        return _socket_a(qname, timeout_sec), str(exc)

    if proc.returncode != 0 and not proc.stdout.strip():
        err = (proc.stderr or proc.stdout or "dig failed").strip()
        return _socket_a(qname, timeout_sec), err or None

    answers = [ln.strip() for ln in proc.stdout.splitlines() if ln.strip()]
    ipv4 = [a for a in answers if re.match(r"^\d+\.\d+\.\d+\.\d+$", a)]
    return ipv4, None


def _socket_a(qname: str, timeout_sec: int) -> list[str]:
    prev = socket.getdefaulttimeout()
    socket.setdefaulttimeout(timeout_sec)
    try:
        infos = socket.getaddrinfo(qname, None, socket.AF_INET, socket.SOCK_STREAM)
        return list({info[4][0] for info in infos})
    except OSError:
        return []
    finally:
        socket.setdefaulttimeout(prev)


def _load_dnsbl_config() -> dict[str, Any]:
    rules = load_rules()
    return rules.get("dnsbl") or {}


def _providers() -> list[dict[str, Any]]:
    cfg = _load_dnsbl_config()
    if not cfg.get("enabled", True):
        return []
    providers = cfg.get("providers") or []
    return [p for p in providers if p.get("zone")]


def _query_provider_dig(domain: str, provider: dict[str, Any]) -> DnsblHit | str | None:
    """Return DnsblHit if listed, error str if inconclusive, None if clean."""
    zone = str(provider["zone"]).strip().lstrip(".")
    qname = f"{domain}.{zone}"
    answers, dig_err = _dig_a(qname)
    if dig_err and not answers:
        return f"{provider.get('id', zone)}: {dig_err}"

    provider_id = str(provider.get("id") or zone)

    if provider_id == "spamhaus_dbl" or zone.endswith("spamhaus.org"):
        hit = _spamhaus_dbl_from_answers(answers)
        if isinstance(hit, str):
            return hit
        if hit is not None:
            return DnsblHit(
                provider_id=hit.provider_id,
                zone=zone,
                query=qname,
                return_codes=hit.return_codes,
                labels=hit.labels,
            )
        return None

    listed_codes: list[str] = []
    labels: list[str] = []

    for ans in answers:
        octet = _parse_ipv4_last_octet(ans)
        if octet is None:
            continue
        listed_codes.append(ans)
        if provider_id == "surbl_multi" or zone.endswith("surbl.org"):
            labels.extend(_surbl_labels(octet))
        elif provider_id == "uribl_multi" or zone.endswith("uribl.com"):
            if octet in _URIBL_POLICY_OCTETS:
                return (
                    f"{provider_id}: policy block (return {ans}) — "
                    "URIBL requires an authorized resolver; enable only on provision host"
                )
            labels.append(f"URIBL-{octet}")
        else:
            labels.append(f"LISTED-{octet}")

    if not listed_codes:
        return None
    seen: set[str] = set()
    uniq_labels: list[str] = []
    for lb in labels:
        if lb not in seen:
            seen.add(lb)
            uniq_labels.append(lb)
    return DnsblHit(
        provider_id=provider_id,
        zone=zone,
        query=qname,
        return_codes=tuple(listed_codes),
        labels=tuple(uniq_labels),
    )


def _query_provider(domain: str, provider: dict[str, Any]) -> DnsblHit | str | None:
    from ops.delivery._lib.inbox_provision.dnsbl_surblclient import (
        query_provider_surblclient,
        surblclient_available,
    )

    if surblclient_available():
        sc = query_provider_surblclient(domain, provider)
        if sc != "use_fallback":
            return sc
    return _query_provider_dig(domain, provider)


def check_dnsbl(domain: str, *, providers: list[dict[str, Any]] | None = None) -> DnsblVerdict:
    d = normalize_domain(domain)
    prov = providers if providers is not None else _providers()
    verdict = DnsblVerdict(domain=d, listed=False, inconclusive=False)

    if not prov:
        return verdict

    for p in prov:
        if p.get("optional") and p.get("skip"):
            continue
        result = _query_provider(d, p)
        if isinstance(result, str):
            verdict.errors.append(result)
            verdict.inconclusive = True
            continue
        if isinstance(result, DnsblHit):
            verdict.hits.append(result)
            verdict.listed = True

    return verdict


def check_dnsbl_batch(domains: list[str]) -> dict[str, DnsblVerdict]:
    prov = _providers()
    return {normalize_domain(d): check_dnsbl(d, providers=prov) for d in domains if normalize_domain(d)}


def dnsbl_backend_name() -> str:
    from ops.delivery._lib.inbox_provision.dnsbl_surblclient import surblclient_available

    return "surblclient" if surblclient_available() else "dns"


def run_dnsbl_self_test() -> tuple[bool, str]:
    """Verify SURBL control query (test.surbl.org) before batch screen."""
    cfg = _load_dnsbl_config()
    control = cfg.get("control") or {}
    domain = control.get("domain", "test.surbl.org")
    expect = control.get("expect_a", "127.0.0.254")
    zone = control.get("zone", "multi.surbl.org")

    from ops.delivery._lib.inbox_provision.dnsbl_surblclient import (
        run_surblclient_control_test,
        surblclient_available,
    )

    if surblclient_available():
        ok, msg = run_surblclient_control_test(domain)
        if ok:
            return True, f"{msg} [backend=surblclient]"
        return False, f"{msg} [backend=surblclient]"

    qname = f"{domain}.{zone}"
    answers, err = _dig_a(qname)
    if expect in answers:
        return True, f"control {qname} → {expect} [backend=dns]"
    if err:
        return False, f"control {qname} failed: {err} (got {answers}) [backend=dns]"
    return False, f"control {qname} expected {expect}, got {answers} [backend=dns]"


def dnsbl_blocks_purchase(verdict: DnsblVerdict) -> bool:
    cfg = _load_dnsbl_config()
    if not cfg.get("enabled", True) or not cfg.get("block_if_listed", True):
        return False
    if verdict.listed:
        return True
    if verdict.inconclusive and cfg.get("block_if_inconclusive", False):
        return True
    return False

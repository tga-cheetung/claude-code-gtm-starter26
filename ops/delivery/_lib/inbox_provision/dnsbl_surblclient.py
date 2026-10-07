"""Optional surblclient backend for DNSBL screening (SURBL multi + Spamhaus DBL)."""
from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from ops.delivery._lib.inbox_provision.dnsbl_check import DnsblHit

if TYPE_CHECKING:
    from surblclient.surbl import SURBL
    from surblclient.spamhausdbl import SpamhausDBL

_SURBLCLIENT_PROVIDER_IDS = frozenset({"surbl_multi", "spamhaus_dbl"})


def surblclient_available() -> bool:
    try:
        import surblclient  # noqa: F401
    except ImportError:
        return False
    return True


def _client_for_provider(provider_id: str) -> SURBL | SpamhausDBL | None:
    if provider_id == "surbl_multi":
        from surblclient import surbl

        return surbl
    if provider_id == "spamhaus_dbl":
        from surblclient import spamhausdbl

        return spamhausdbl
    return None


def query_provider_surblclient(
    domain: str,
    provider: dict,
) -> DnsblHit | str | None | Literal["use_fallback"]:
    """Query via surblclient. Return use_fallback when provider is not supported."""
    provider_id = str(provider.get("id") or "")
    if provider_id not in _SURBLCLIENT_PROVIDER_IDS:
        return "use_fallback"

    client = _client_for_provider(provider_id)
    if client is None:
        return "use_fallback"

    zone = str(provider["zone"]).strip().lstrip(".")
    qname = f"{domain}.{zone}"
    result = client.lookup(domain)

    if result is None:
        return (
            f"{provider_id}: query refused or DNS error (surblclient) — "
            "retry from provision host / non-public resolver"
        )
    if result is False:
        return None

    _listed_domain, lists = result
    labels = tuple(lbl.upper() for lbl in lists)
    return DnsblHit(
        provider_id=provider_id,
        zone=zone,
        query=qname,
        return_codes=tuple(labels),
        labels=labels,
    )


def run_surblclient_control_test(domain: str = "test.surbl.org") -> tuple[bool, str]:
    from surblclient import surbl

    result = surbl.lookup(domain)
    if result is None:
        return False, f"surblclient control {domain}: unknown/refused"
    if result is False:
        return False, f"surblclient control {domain}: expected listed, got clean"
    _d, lists = result
    return True, f"surblclient control {domain} → {','.join(lists)}"

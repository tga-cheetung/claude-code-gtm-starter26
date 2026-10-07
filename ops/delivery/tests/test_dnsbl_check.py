"""Unit tests for DNSBL parsing (no live DNS required)."""
from __future__ import annotations

from ops.delivery._lib.inbox_provision.dnsbl_check import (
    DnsblHit,
    DnsblVerdict,
    _parse_ipv4_last_octet,
    _spamhaus_dbl_from_answers,
    _surbl_labels,
    dnsbl_blocks_purchase,
)


def test_parse_ipv4_last_octet():
    assert _parse_ipv4_last_octet("127.0.0.64") == 64
    assert _parse_ipv4_last_octet("8.8.8.8") is None


def test_surbl_abuse_bitmask():
    assert "ABUSE" in _surbl_labels(64)
    assert "PH" in _surbl_labels(4)


def test_spamhaus_dbl_127_0_1_range():
    hit = _spamhaus_dbl_from_answers(["127.0.1.2"])
    assert hit is not None and not isinstance(hit, str)
    assert hit.labels == ("BAD",)
    abused = _spamhaus_dbl_from_answers(["127.0.1.102"])
    assert abused is not None and not isinstance(abused, str)
    assert abused.labels == ("ABUSED-LEGIT",)


def test_spamhaus_dbl_policy_response():
    err = _spamhaus_dbl_from_answers(["127.255.255.254"])
    assert isinstance(err, str)
    assert "policy" in err


def test_dnsbl_blocks_purchase_listed():
    v = DnsblVerdict(
        domain="example.com",
        listed=True,
        inconclusive=False,
        hits=[
            DnsblHit(
                provider_id="surbl_multi",
                zone="multi.surbl.org",
                query="example.com.multi.surbl.org",
                return_codes=("127.0.0.16",),
                labels=("ABUSE",),
            )
        ],
    )
    assert dnsbl_blocks_purchase(v) is True


def test_dnsbl_inconclusive_does_not_block_by_default():
    v = DnsblVerdict(domain="example.com", listed=False, inconclusive=True, errors=["timeout"])
    assert dnsbl_blocks_purchase(v) is False

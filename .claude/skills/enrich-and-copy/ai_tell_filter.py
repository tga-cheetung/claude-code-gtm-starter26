#!/usr/bin/env python3
"""
AI-Tell Filter — deterministic post-processing for cold email copy.

Usage:
    python3 ai_tell_filter.py <input.json> [output.json]

Input JSON: list of dicts with keys: name, email, subject, body, ps, linkedin_dm
Output JSON: same structure with cleaned copy + a `filter_flags` field per lead.

If output path is omitted, overwrites input file.
"""

import json
import re
import sys
from copy import deepcopy

# ---------------------------------------------------------------------------
# Rule tables
# ---------------------------------------------------------------------------

EM_DASH_RE = re.compile(r"\s*—\s*")
EXCLAMATION_RE = re.compile(r"!")

# Hard replacements: (pattern, replacement, description)
HARD_REPLACEMENTS = [
    # Em dash → regular dash (with surrounding spaces normalized)
    (re.compile(r"\s*—\s*"), " - ", "em dash"),

    # Double question marks → single
    (re.compile(r"\?\?+"), "?", "multiple question marks"),

    # Subject line: strip trailing punctuation
    # (applied to subject field only in the subject-specific pass)
]

# Banned phrases: (regex pattern, suggestion)
# These are flagged in `filter_flags` but NOT auto-replaced (require judgment).
BANNED_PHRASES = [
    # Openers
    (re.compile(r"hope this (email )?finds you well", re.I), "remove opener"),
    (re.compile(r"just reaching out", re.I), "remove filler"),
    (re.compile(r"i wanted to introduce myself", re.I), "start with them, not you"),
    (re.compile(r"i came across .{0,40}and was impressed", re.I), "lazy non-personalization"),
    (re.compile(r"i noticed", re.I), "too AI-sounding — rewrite as an observation"),
    (re.compile(r"i came across", re.I), "too AI-sounding — start with what you see in their world"),

    # Closers
    (re.compile(r"looking forward to hearing from you", re.I), "empty filler — cut"),
    (re.compile(r"schedule a quick (call|meeting|chat)", re.I), "high-friction CTA — use softer ask"),
    (re.compile(r"touch base", re.I), "corporate noise — cut"),
    (re.compile(r"circle back", re.I), "corporate noise — cut"),

    # AI fingerprint openers
    (re.compile(r"curious how you'?re", re.I), "AI fingerprint opener — rewrite as direct question"),
    (re.compile(r"saw you'?re hiring", re.I), "clichéd — try 'any luck with the [role] search?'"),
    (re.compile(r"noticed you'?re hiring", re.I), "clichéd — try 'any luck with the [role] search?'"),
    (re.compile(r"i see you'?re hiring", re.I), "clichéd — try 'any luck with the [role] search?'"),

    # Buzzwords
    (re.compile(r"\bleverage\b", re.I), "replace with plain verb"),
    (re.compile(r"\bsynergy\b", re.I), "remove"),
    (re.compile(r"\bcutting-edge\b", re.I), "remove"),
    (re.compile(r"\binnovative\b", re.I), "remove"),
    (re.compile(r"\benhance\b", re.I), "replace with specific verb"),
    (re.compile(r"\bstreamline\b", re.I), "replace with specific verb"),
    (re.compile(r"\bscalable\b", re.I), "remove — describe what scales instead"),
    (re.compile(r"\brobust\b", re.I), "remove"),
    (re.compile(r"\bholistic\b", re.I), "remove"),
    (re.compile(r"\btransformative\b", re.I), "remove"),
    (re.compile(r"\bparadigm\b", re.I), "remove"),
    (re.compile(r"\butilize\b", re.I), "replace with 'use'"),
    (re.compile(r"\bunlock\b", re.I), "replace with specific outcome"),
    (re.compile(r"\brevolutionize\b", re.I), "remove"),
    (re.compile(r"\btrajectory\b", re.I), "replace with 'direction' or 'path'"),

    # TGA-specific bans
    (re.compile(r"GTM OS", re.I), "banned phrase — describe the system instead"),
    (re.compile(r"GTM infrastructure", re.I), "banned phrase — describe the system instead"),
    (re.compile(r"\bteams in\b", re.I), "generic segmentation tell — be specific"),
    (re.compile(r"\bcompanies in\b", re.I), "generic segmentation tell — be specific"),
    (re.compile(r"\bfounders in\b", re.I), "generic segmentation tell — be specific"),
    (re.compile(r"\bbusinesses in\b", re.I), "generic segmentation tell — be specific"),
]

# Rhythmic threes detector: 3+ comma-separated adjectives/nouns
RHYTHMIC_THREE_RE = re.compile(
    r"\b(\w+),\s+(\w+),\s+(and\s+)?(\w+)\b"
)

SUBJECT_PUNCT_RE = re.compile(r"[!?.,:;]$")
SUBJECT_UPPERCASE_RE = re.compile(r"[A-Z]")


# ---------------------------------------------------------------------------
# Field-level checks
# ---------------------------------------------------------------------------

def count_words(text: str) -> int:
    return len(text.split())


def count_question_marks(text: str) -> int:
    return text.count("?")


def apply_hard_replacements(text: str) -> tuple[str, list[str]]:
    """Apply hard, safe substitutions. Return (cleaned_text, list_of_changes)."""
    changes = []
    for pattern, replacement, label in HARD_REPLACEMENTS:
        if pattern.search(text):
            text = pattern.sub(replacement, text)
            changes.append(f"auto-fixed: {label}")
    # Exclamation marks: replace with period (unless preceded by another sentence-ending char)
    if "!" in text:
        text = EXCLAMATION_RE.sub(".", text)
        # Clean up double periods
        text = re.sub(r"\.{2,}", ".", text)
        changes.append("auto-fixed: exclamation mark(s) → period")
    return text, changes


def check_banned_phrases(text: str, field: str) -> list[str]:
    flags = []
    for pattern, suggestion in BANNED_PHRASES:
        m = pattern.search(text)
        if m:
            flags.append(f"[{field}] banned phrase '{m.group(0)}' — {suggestion}")
    return flags


def check_rhythmic_threes(text: str, field: str) -> list[str]:
    flags = []
    for m in RHYTHMIC_THREE_RE.finditer(text):
        flags.append(f"[{field}] possible rhythmic three: '{m.group(0)}' — break to two items")
    return flags


def check_subject(subject: str) -> tuple[str, list[str]]:
    flags = []
    cleaned = subject.strip()

    # Strip trailing punctuation
    if SUBJECT_PUNCT_RE.search(cleaned):
        cleaned = SUBJECT_PUNCT_RE.sub("", cleaned).strip()
        flags.append("auto-fixed: subject trailing punctuation removed")

    # Lowercase
    if SUBJECT_UPPERCASE_RE.search(cleaned):
        cleaned = cleaned.lower()
        flags.append("auto-fixed: subject lowercased")

    # Length
    words = cleaned.split()
    if len(words) > 5:
        flags.append(f"[subject] too long ({len(words)} words) — target 3-5 words, all lowercase")

    return cleaned, flags


def check_body_word_count(body: str) -> list[str]:
    wc = count_words(body)
    if wc > 80:
        return [f"[body] {wc} words — must be ≤80. Cut {wc - 80} words."]
    return []


def check_dm_word_count(dm: str) -> list[str]:
    wc = count_words(dm)
    if wc > 50:
        return [f"[linkedin_dm] {wc} words — must be ≤50. Cut {wc - 50} words."]
    return []


def check_question_marks(text: str, field: str) -> list[str]:
    count = count_question_marks(text)
    if count > 1:
        return [f"[{field}] {count} question marks — must be exactly 1"]
    if count == 0 and field == "body":
        return [f"[{field}] 0 question marks — email needs exactly 1 CTA question"]
    return []


# ---------------------------------------------------------------------------
# Main filter
# ---------------------------------------------------------------------------

def filter_lead(lead: dict) -> dict:
    result = deepcopy(lead)
    all_flags = []
    auto_fixes = []

    # --- Subject ---
    subject = result.get("subject", "") or ""
    subject, subj_flags = check_subject(subject)
    result["subject"] = subject
    auto_fixes.extend([f for f in subj_flags if f.startswith("auto-fixed")])
    all_flags.extend([f for f in subj_flags if not f.startswith("auto-fixed")])

    # --- Hook ---
    hook = result.get("hook", "") or ""
    if hook:
        hook, hook_changes = apply_hard_replacements(hook)
        result["hook"] = hook
        auto_fixes.extend(hook_changes)
        all_flags.extend(check_banned_phrases(hook, "hook"))

    # --- Value Prop ---
    vp = result.get("value_prop", "") or ""
    if vp:
        vp, vp_changes = apply_hard_replacements(vp)
        result["value_prop"] = vp
        auto_fixes.extend(vp_changes)
        all_flags.extend(check_banned_phrases(vp, "value_prop"))

    # --- Body ---
    body = result.get("body", "") or ""
    body, body_changes = apply_hard_replacements(body)
    result["body"] = body
    auto_fixes.extend(body_changes)
    all_flags.extend(check_banned_phrases(body, "body"))
    all_flags.extend(check_rhythmic_threes(body, "body"))
    all_flags.extend(check_body_word_count(body))
    all_flags.extend(check_question_marks(body, "body"))

    # --- P.S. ---
    ps = result.get("ps", "") or result.get("P.S.", "") or ""
    if ps:
        ps, ps_changes = apply_hard_replacements(ps)
        result["ps"] = ps
        auto_fixes.extend(ps_changes)
        all_flags.extend(check_banned_phrases(ps, "ps"))

    # --- LinkedIn DM ---
    dm = result.get("linkedin_dm", "") or ""
    if dm:
        dm, dm_changes = apply_hard_replacements(dm)
        result["linkedin_dm"] = dm
        auto_fixes.extend(dm_changes)
        all_flags.extend(check_banned_phrases(dm, "linkedin_dm"))
        all_flags.extend(check_dm_word_count(dm))

    result["filter_flags"] = all_flags
    result["filter_auto_fixes"] = auto_fixes
    result["filter_passed"] = len(all_flags) == 0

    return result


def run(input_path: str, output_path: str | None = None):
    with open(input_path) as f:
        leads = json.load(f)

    if not isinstance(leads, list):
        leads = [leads]

    cleaned = [filter_lead(lead) for lead in leads]

    out = output_path or input_path
    with open(out, "w") as f:
        json.dump(cleaned, f, indent=2)

    # Summary to stdout
    total = len(cleaned)
    passed = sum(1 for l in cleaned if l["filter_passed"])
    flagged = total - passed
    total_flags = sum(len(l["filter_flags"]) for l in cleaned)
    total_fixes = sum(len(l["filter_auto_fixes"]) for l in cleaned)

    print(f"AI-tell filter complete: {total} leads processed")
    print(f"  Auto-fixed: {total_fixes} issues (em dashes, !, subject case/punctuation)")
    print(f"  Passed clean: {passed}/{total}")
    print(f"  Needs review: {flagged} leads ({total_flags} flags)")

    if flagged:
        print()
        for lead in cleaned:
            if lead["filter_flags"]:
                name = lead.get("name", "unknown")
                print(f"  {name}:")
                for flag in lead["filter_flags"]:
                    print(f"    - {flag}")

    print(f"\nOutput written to: {out}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 ai_tell_filter.py <input.json> [output.json]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    run(input_path, output_path)

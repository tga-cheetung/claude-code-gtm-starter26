---
globs:
  - ".claude/os/**"
  - "outbound-engine/**"
  - "Clients/**"
---

# Outbound Copy Rules

## Before writing cold email or LinkedIn DM
Load: `.claude/os/TOV.md` + `.claude/os/BRIEFING.md`

For offer specifics (pricing, modules, the offer ladder): reference `.claude/os/BRIEFING.md` Section 2.
For verbatim ICP language to mirror: reference `.claude/os/ICP.md` Section 3.

## Before writing a sequence
Also load the relevant template from `.claude/os/templates/` using the scoring guide below.

## Template selection scoring
| Signal strength | Temperature | Template |
|---|---|---|
| HOT — clear trigger event in last 30d | Hot | trigger-call-out, peer-story |
| WARM — firmographic fit + thin signal | Warm | curiosity-open, soft-question |
| COOL — fit but no fresh signal | Cool | industry-insight, low-lift-ask |

## Hard rules
- Never write "Hope this finds you well."
- Never open with a compliment about the prospect's company.
- One specific observation, one soft CTA. Not both.
- American English spelling. No emojis.

## After every campaign
Append the win/loss + the line that pulled the reply to `os/LEARNINGS.md`. Append-only — never edit prior entries.

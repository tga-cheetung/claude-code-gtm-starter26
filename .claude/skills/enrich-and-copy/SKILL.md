---
name: enrich-and-copy
description: "Read qualified leads from the 'Ready for Enrichment' Google Sheet tab, run the LeadMagic → AI Ark → Exa enrichment waterfall, score Exa context against your firm's value proposition, generate a cold email + LinkedIn DM per lead, and write 'Enriched & Verified' and 'Copy Ready' tabs back to the same sheet."
argument-hint: "[google-sheet-url]"
---

## Your Firm Context

> Edit this block to match your business before running the skill.
> If this section is empty or contains placeholder text, Claude will read `CLAUDE.md`
> from the project root and extract the business context, ICP description, and pain signals from there.

**Value Proposition:** We build signal-based outbound systems for B2B SaaS founders at $0–$10M ARR — done-for-you, fixed fee, no retainer. We hand the system off; they keep it.

**ICP:** CEOs and co-founders of B2B SaaS companies, pre-seed to Series A. The founder is the GTM team. Revenue is capped by their bandwidth.

**Top Pain Signals to watch for in Exa results:**
- Posting about hiring their first sales rep or AE
- Expressing frustration with pipeline, outbound, or agency results
- Just raised seed or Series A without a dedicated GTM hire
- Mentions of firing an agency or running outbound themselves
- Posts about doing cold email, LinkedIn outreach, or SDR work themselves

**Copy Angles:**
- "You're doing the selling yourself — we can take that off your plate"
- "Built for founders who are still the GTM team at [X ARR]"
- "Signal-based, not spray-and-pray — we identify intent before we reach out"

## Exa Context Scoring Rubric

Score each lead's Exa results against the Firm Context above.

**High** — Exa found one or more of the listed pain signals, OR direct evidence the founder is doing GTM themselves (cold email tool mentions, SDR job posts, agency frustration). Use rich, signal-specific copy.

**Medium** — Exa confirms they are a B2B SaaS founder at the right stage, but no specific pain signal found. Use moderate personalization (company + role context, light Exa detail).

**Low** — Exa returned generic results, off-ICP content, or nothing useful. Use baseline copy (headline + engagement type only, no Exa references).

For each lead output: `context_score` (high/medium/low) + `matched_signals` (comma-separated list of signals found, or "none").

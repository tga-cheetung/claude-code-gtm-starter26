# Learnings: Apify LinkedIn Actors

Things that broke when we built the LinkedIn post engager scraper. If you're building or modifying anything that uses `harvestapi/linkedin-post-reactions` or `harvestapi/linkedin-post-comments`, read this first — it'll save you an hour of debugging.

---

## Always test with 5 records before building anything

This is the #1 rule. Before writing any extraction logic, run both actors with `maxItems: 5` on a real post and **look at the raw JSON**. Claude will confidently use field names that don't exist (`actor.headline`, `actor.location`) unless you force it to verify first.

Prompt pattern that works:

> Before writing the skill, scrape 5 reactions and 5 comments from [post URL] and show me the raw JSON so we can verify the field names together.

---

## The two actors have different response shapes

This is the source of most bugs. They look similar but aren't.

| Field | Reactions actor | Comments actor |
|-------|----------------|----------------|
| `actor.headline` | **Does not exist** | **Does not exist** |
| `actor.position` | Present — this IS the headline | Present |
| `actor.location` | Not returned in short mode | Not returned in short mode |
| `actor.type` | Not present | `"profile"` or `"company"` |
| `actor.author` | Not present | `true` if post author |
| `actor.linkedinUrl` format | Internal ID (`/in/ACoAAA...`) | Vanity slug (`/in/firstname-lastname`) |

The two fields Claude hallucinates every time: **`actor.headline`** and **`actor.location`**. Neither exists. The headline is called `actor.position`. Location isn't returned at all in `profileScraperMode: "short"`.

---

## URL-based dedup doesn't work

The same person gets a different URL from each actor — reactions use internal IDs (`/in/ACoAAED1AnMB...`), comments use vanity slugs (`/in/obenyoung`). If someone liked AND commented, URL matching won't catch the overlap.

**What works:** Deduplicate by `actor.name.trim().toLowerCase()`. When merging, keep the vanity URL (the one without `ACoAAA`) for the output — it's the human-readable profile link.

---

## Company pages react to and comment on posts

LinkedIn company pages show up in both datasets. They look like people until you notice:
- Their URL contains `/company/` instead of `/in/`
- Their `actor.position` is a follower count (e.g., "7 followers")
- In comments, `actor.type === "company"` and `actor.id === null`

Filter them out early — before dedup.

---

## The post author shows up everywhere

Authors react to their own posts, reply to every comment, and sometimes post promotional comments. The comments actor has `actor.author: true` — use it. The reactions actor doesn't have this flag, so match by name instead.

---

## Short mode = no location data

`profileScraperMode: "short"` is fast and cheap but returns no location. If you need country filtering, switch to `"full"` — but expect slower runs and higher Apify costs.

---

## gws CLI: single-quoted `--params` breaks when `--json` uses `$(...)`

This fails intermittently:
```bash
gws sheets spreadsheets values update \
  --params '{"spreadsheetId": "ID", "range": "Sheet1!A1", "valueInputOption": "RAW"}' \
  --json "$(cat /tmp/data.json)"
```
Error: `Invalid --params JSON: invalid escape at line 1 column 81`

The `$(...)` expansion in `--json` somehow corrupts the single-quoted `--params` argument. Both `$(cat)` and `$(python3 -c "print(...)")` trigger it.

**What works:** Use escaped double quotes for `--params` instead of single quotes:
```bash
gws sheets spreadsheets values update \
  --params "{\"spreadsheetId\": \"ID\", \"range\": \"Sheet1!A1\", \"valueInputOption\": \"RAW\"}" \
  --json "$(cat /tmp/data.json)"
```
This has been reliable across all test runs.

---

## Set `scrapeReplies: false` on the comments actor

Otherwise you get the author's replies to every comment, which inflates the dataset and makes filtering harder.

---

## Test post

Verified (2026-03-23): `https://www.linkedin.com/posts/kenny-damian-90aba221a_ive-spent-600-hours-inside-claude-code-share-7441843439735865344-toe2`
- 49 reactions, 18 comments → 62 unique people after cleaning
- Good size for testing (not too small, not slow)

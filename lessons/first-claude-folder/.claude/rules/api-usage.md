# API & Tool Usage Rules

## Before calling any external API
1. Check the cheatsheet first: `~/tool-docs/cheatsheets/{tool}.md`
2. If the operation isn't there, run `/api-lookup {tool} {operation}` to pull the relevant docs.
3. Only fall back to web search if neither of the above turns up the right endpoint.

## Cheatsheet inventory (current)
- `notion.md` — pages, databases, data sources
- `hubspot.md` — contacts, deals, associations
- `instantly.md` — campaigns, leads, custom variables
- `clay.md` — table pushes, enrichment columns

## When to update a cheatsheet
- You discover a non-obvious response shape (e.g. paginated where docs say single object)
- An endpoint returned a 4xx that the docs didn't predict
- An auth header behaved differently than documented

Append findings to the existing cheatsheet — do not create a parallel doc.

## Never
- Log API keys to stdout, even when debugging.
- Commit `.env` files.
- Hit production endpoints from a `--dry-run` flow.

# [Product Name] — Architecture & Codebase Guide

> Fill this in as decisions get made, not after the fact. If a section feels
> empty, that's a sign the decision hasn't really been made yet — or it was
> made silently and needs to be said out loud once, here.

## What it is

One paragraph. What does this product do, for whom, and what's the one
sentence that explains its whole value prop? (e.g. "no-login AI-powered
website auditor that returns a shareable report in under 90 seconds.")

---

## Tech stack

| Layer | Choice | Why this one |
|---|---|---|
| Framework | | |
| Hosting | | |
| Database / cache | | |
| Background jobs / workers | | |
| AI provider (if any) | | |
| Email | | |
| Analytics | | |

The "Why this one" column is the part most docs skip — and the part you'll
actually need later. "Postgres" isn't useful to future-you. "Postgres
because we needed relational queries across audits" is.

---

## Request lifecycle / core flow

Draw the actual flow as it happens, step by step — not the ideal version,
the real one, including the awkward parts (polling loops, callbacks,
retries). This is the single most valuable section in the whole doc,
because code never shows you the *shape* of a flow, only its pieces.

```
Browser
  │
  ├─ ...
  │
  └─ ...
```

---

## Design constraints — the section that matters most

This is where you write down every decision that was forced by a limitation,
every "we tried X and rejected it," and every rule that isn't obvious from
reading the code. Future-you (or me, months later) will reach for this
section before anything else.

- **[Constraint]** — e.g. "Vercel function timeout is 10s, so the heavy
  work happens in GitHub Actions instead of inline."
- **[Rejected approach]** — e.g. "lighthouse-worker/ (Railway) is retired —
  kept for reference, excluded from builds."
- **[Hard rule]** — e.g. "AI is prose-only; the rule engine decides scoring,
  never the model."
- **[Non-obvious tradeoff]** — e.g. "Reports cached by deterministic hash of
  URL, not by request — same URL always returns the same report ID."

---

## File-by-file reference (optional, for bigger codebases)

Only worth doing once a product has enough surface area that "just read the
code" stops being faster than reading a paragraph about it. Keep entries to
2-3 sentences: what it does + any behavior that would surprise someone
reading the code cold.

### `path/to/file`

What it does. Any non-obvious behavior or gotcha.

---

## Environment variables

```
VAR_NAME                # what it's for, where it comes from
```

Flag anything env-sensitive: public vs. server-only vars, anything that
must match a secret in another system (e.g. a webhook secret that has to
match a value set in GitHub Actions), anything baked in at build time vs.
runtime.

---

## Known sharp edges / things to remember

A running list of "if you forget this, you'll lose an hour" notes. Update
this whenever something *does* cost you an hour — that's the signal it
belongs here.

-

---

*Last updated: [date] — update this whenever an architectural decision changes,
not on a schedule.*
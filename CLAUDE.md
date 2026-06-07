# ShipAudit — Claude Code Instructions

## What this project is

ShipAudit is an AI-powered website performance auditor. Phase 1 (shipping now): user pastes
a URL, gets an AI-generated performance report in under 60 seconds. No login, no accounts.

**Hard non-goal: ShipAudit is not an observability platform.** Do not add logging, tracing,
error tracking, or monitoring features. Every feature request passes this filter first.

---

## Project structure

```
shipaudit/
├── app/
│   ├── page.tsx                  ← Homepage: URL input form
│   ├── report/[id]/page.tsx      ← Report page (reads from Redis)
│   ├── dashboard/page.tsx        ← Phase 2 stub — do not touch
│   └── api/
│       ├── audit/route.ts        ← Main orchestration endpoint
│       ├── waitlist/route.ts     ← Email capture
│       ├── webhook/route.ts      ← Phase 2 stub — do not touch
│       └── sdk/route.ts          ← Phase 2 stub — do not touch
├── lib/
│   ├── types.ts                  ← All shared TypeScript types
│   ├── utils.ts                  ← cn(), generateReportId(), normalizeUrl()
│   ├── rule-engine.ts            ← Deterministic scoring + finding ranking
│   ├── framework-detect.ts       ← HTML/header-based framework detection
│   ├── vitals.ts                 ← Lighthouse JSON → typed WebVital[]
│   ├── summarize.ts              ← Claude API integration (prose only)
│   └── rca.ts                    ← Phase 2 stub — do not touch
├── components/
│   ├── ui/                       ← Shared UI primitives
│   └── report/                   ← Report section components
└── lighthouse-worker/            ← Separate Railway service (Node/Express)
    └── src/index.ts
```

---

## Architecture rules — read before writing any code

### The pipeline (audit/route.ts)
```
POST /api/audit { url }
  → normalizeUrl()
  → check Redis cache (return reportId if hit)
  → detectFramework() — fetch HTML + headers
  → POST lighthouse-worker/audit { url } — returns raw LHR JSON
  → parseVitals(lhr) — deterministic
  → runRuleEngine(lhr, framework) — deterministic
  → generateExecutiveSummary() — Claude prose only
  → generateCursorPrompt() — Claude prose only
  → cache report in Redis (6h TTL)
  → return { reportId }
```

### Claude's role is strictly prose
Claude (via `lib/summarize.ts`) writes the executive summary and the Cursor fix prompt.
**Claude never decides what is important.** The rule engine ranks findings. Claude writes
output from what the engine returns. Do not move any decision logic into summarize.ts.

### Rule engine is deterministic
`lib/rule-engine.ts` selects and ranks findings by `estimatedPointImpact`. This ensures
reports are reproducible. Do not add randomness, AI reranking, or dynamic weights.

### ShipAudit Score formula
- Performance: 50%
- Accessibility: 20%
- SEO: 15%
- Best Practices: 15%
Composite is 0–100. Achievable = current + top-3 impacts, capped at 100.

### Lighthouse worker lives on Railway
The worker is a separate Express service in `lighthouse-worker/`. It exists because Vercel
Hobby functions time out at 10s — Lighthouse needs 20–50s. Do not attempt to run Lighthouse
inside Next.js API routes.

---

## UI components

- Use Tailwind CSS for all styling
- Use `cn()` from `lib/utils.ts` for conditional classes
- Use lucide-react for icons
- Do NOT install shadcn/ui — the registry is unreachable in this build environment.
  Build custom components with Tailwind primitives instead.

---

## Environment variables

```
ANTHROPIC_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY
LIGHTHOUSE_WORKER_URL        ← http://localhost:3001 for local dev
GITHUB_APP_ID                ← Phase 2, leave empty
GITHUB_APP_PRIVATE_KEY       ← Phase 2, leave empty
```

All vars are in `.env.local` (gitignored). Reference `.env.example` for the full list.

---

## What NOT to build

These are explicitly out of scope for Phase 1. Do not implement them:

- Authentication or user accounts
- Billing or Stripe
- GitHub integration
- Deploy webhooks
- Browser SDK
- Real user monitoring
- Per-user saved report history
- Comparison between two audits
- JS exception tracking
- Percentile benchmarks ("slower than X% of websites") — use Google CWV thresholds only
- Revenue impact estimates

Phase 2 stubs (`dashboard/`, `api/webhook/`, `api/sdk/`, `lib/rca.ts`) already exist.
Do not fill them in.

---

## TODO — Phase 1 build order

Work through these in order. Do not skip ahead.

### 1. Homepage (`app/page.tsx`)
- [ ] URL input field with validation
- [ ] "Analyze" submit button
- [ ] Loading state (show progress — "Running Lighthouse...", "Analyzing findings...", "Writing report...")
- [ ] Error state (invalid URL, worker timeout)
- [ ] On success, redirect to `/report/[id]`
- [ ] Minimal, clean design — headline: *"Paste any URL and get an AI performance engineer in 30 seconds."*

### 2. Report page (`app/report/[id]/page.tsx`)
Replace the current JSON debug dump with the full report UI:
- [ ] **DetectedStack** — framework + deploy platform badges at top
- [ ] **ShipAuditScore** — current score, achievable score, top 3 opportunities with point impact
- [ ] **ExecutiveSummary** — Claude prose, displayed as a clean text block
- [ ] **CoreWebVitals** — 5 metrics in a grid, color-coded good/needs-improvement/poor
- [ ] **TopIssues** — ranked list, each with title, description, framework-aware fix
- [ ] **CopyCursorPrompt** — single button, copies to clipboard, tracks click (console.log for now)
- [ ] **ExportReport** — dropdown: GitHub Issue markdown / Linear ticket / raw .md download
- [ ] **WaitlistCTA** — contextual (references the finding count), email input, POST /api/waitlist

### 3. Report components (`components/report/`)
Extract each section above into its own component:
- [ ] `StackBadges.tsx`
- [ ] `ScoreCard.tsx`
- [ ] `ExecutiveSummary.tsx`
- [ ] `VitalsGrid.tsx`
- [ ] `FindingsList.tsx`
- [ ] `CursorPromptButton.tsx`
- [ ] `ExportButton.tsx`
- [ ] `WaitlistCTA.tsx`

### 4. Lighthouse worker (`lighthouse-worker/`)
- [ ] Install dependencies: `cd lighthouse-worker && npm install`
- [ ] Verify it runs locally: `npm run dev` — should log "Lighthouse worker listening on port 3001"
- [ ] Test with: `curl -X POST http://localhost:3001/audit -H "Content-Type: application/json" -d '{"url":"https://example.com"}'`
- [ ] Should return Lighthouse JSON within 60s

### 5. End-to-end test
- [ ] Fill in `.env.local` with real keys (Anthropic, Upstash, Resend)
- [ ] Run worker: `cd lighthouse-worker && npm run dev`
- [ ] Run Next.js: `npm run dev`
- [ ] Submit a real URL, verify full report renders
- [ ] Click "Copy Cursor Prompt" — verify clipboard
- [ ] Submit waitlist email — verify Resend confirmation arrives

### 6. Polish
- [ ] Add `<title>` and `<meta description>` to report page (for sharing)
- [ ] Add OG image for report sharing
- [ ] Handle edge cases: paywalled URLs, localhost URLs, non-HTML responses
- [ ] Add rate limiting to `/api/audit` (max 10 req/min per IP) to protect free tiers
- [ ] Verify mobile layout

---

## Success metrics to watch (Phase 1)

| Metric | Target |
|---|---|
| URLs audited in first week | 500 |
| Waitlist signups | 50 |
| "Copy Cursor Prompt" click rate | ≥ 20% |
| Organic shares | ≥ 1 |

The Cursor Prompt click rate is the single most important number.
If it's below 20%, the core Phase 2 assumption needs revisiting.

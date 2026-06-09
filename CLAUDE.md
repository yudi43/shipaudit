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
  → trigger GitHub Actions workflow (lighthouse-audit.yml) with url + auditId + callbackUrl
  → poll Redis every 3s (max 3 min) for lhr:{auditId} posted by the workflow
  → parseVitals(lhr) — deterministic
  → runRuleEngine(lhr, framework) — deterministic
  → analyzeThirdParties / analyzeImages / analyzeFonts — deterministic
  → generateExecutiveSummary() — Claude prose only
  → generateCursorPrompt() — Claude prose only
  → cache report in Redis (1h TTL)
  → return { reportId }
```

### GitHub Actions Lighthouse runner
Lighthouse runs inside a GitHub Actions workflow (`.github/workflows/lighthouse-audit.yml`).
The workflow is triggered via `workflow_dispatch` by `POST /api/audit`, runs Lighthouse on
the target URL, then POSTs the raw LHR JSON back to `/api/audit/callback` with the
`x-audit-secret` and `x-audit-id` headers. The callback stores the result in Redis so the
polling loop in `route.ts` can pick it up.

The `AUDIT_CALLBACK_SECRET` GitHub Actions secret must match the Vercel env var of the same
name. The GitHub token needs `actions:write` permission to trigger workflows.

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

### lighthouse-worker/ is retired
The `lighthouse-worker/` Express service is no longer used in production. Lighthouse runs
via GitHub Actions (see above). The directory is kept for reference but is excluded from
the Vercel build via `.vercelignore` and `tsconfig.json`.

---

## Frontend quality bar — non-negotiable

This UI must feel exceptional. Users should feel excited the moment they land on it.
Every interaction should feel considered and polished.

### Stack
- **Framer Motion** is installed and must be used for all animations
- **Tailwind CSS** for all styling
- **lucide-react** for icons
- **cn()** from `lib/utils.ts` for conditional classes
- Do NOT install shadcn/ui — registry unreachable. Build all components with Tailwind primitives.

### Motion principles
- Page elements must animate in on mount — staggered, not all at once
- Use `layout` animations for any list reordering
- Loading states must feel alive — not a spinner, but something that communicates progress
- Transitions between pages must be smooth (Framer Motion `AnimatePresence`)
- Micro-interactions on every interactive element: buttons scale on press, inputs have
  focus rings that animate in, cards lift on hover
- Score number must count up when it appears (animated counter)
- Progress steps during analysis must sequence with smooth transitions

### Color scheme — dark, premium, technical
- Background: near-black (`#0A0A0A` or `zinc-950`)
- Surface: `zinc-900` for cards, `zinc-800` for elevated elements
- Primary accent: a single vivid color — use **electric indigo / violet** (`#6366f1` / `indigo-500`)
  for CTAs, score highlights, active states
- Success: `emerald-400` (good vitals, passing scores)
- Warning: `amber-400` (needs improvement)
- Danger: `red-400` (poor vitals, failing scores)
- Text: `zinc-100` primary, `zinc-400` secondary, `zinc-600` muted
- Borders: `zinc-800` default, `zinc-700` on hover

### Typography
- Font: Inter (already in Next.js via `next/font`) — use font-feature-settings for numerics
- Headline: large, bold, tight tracking — this is a technical product, not a marketing site
- Monospace for scores, metrics, and code — use `font-mono`
- Never use font sizes below 12px

### Specific UI moments that must be exceptional
1. **Homepage hero** — the URL input should feel like the center of gravity on the page.
   Subtle animated background (slow-moving gradient or particle effect, not distracting).
   The input glows when focused.
2. **Analysis loading screen** — full-screen takeover. Animated progress steps sequence
   one by one. Show the URL being analyzed. Feel like something powerful is happening.
3. **Score reveal** — the ShipAudit Score should count up from 0 to its value when the
   report page loads. The score ring/arc animates in. This is the hero moment of the report.
4. **Vitals grid** — each metric card animates in with a stagger. Color status is immediate
   and unmistakable.
5. **Copy Cursor Prompt button** — on click: button animates to a checkmark state, then
   back. This is the most important button in the product.

---

## Environment variables

```
GROQ_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY
FOUNDER_EMAIL                ← Your personal email, must be verified in Resend dashboard
GITHUB_TOKEN                 ← Personal access token with actions:write scope
GITHUB_REPO_OWNER            ← e.g. buildwithyudi
GITHUB_REPO_NAME             ← e.g. shipaudit
AUDIT_CALLBACK_SECRET        ← Shared secret; must match the GitHub Actions secret of the same name
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

### 1. Install Framer Motion
- [ ] `npm install framer-motion`
- [ ] Verify it imports cleanly in a client component

### 2. Homepage (`app/page.tsx`)
- [ ] Dark background, full viewport height
- [ ] Animated headline — words fade/slide in with stagger
- [ ] URL input — glows on focus, subtle border animation, auto-focuses on load
- [ ] "Analyze" button — indigo, scales on hover/press, disabled state while loading
- [ ] Loading state — full-screen takeover with sequenced progress steps:
      "Fetching page..." → "Running Lighthouse..." → "Analyzing findings..." → "Writing report..."
      Each step animates in as the previous completes. Show the URL being analyzed.
- [ ] Error state — inline, animated in, clear message
- [ ] On success → router.push(`/report/${reportId}`)
- [ ] Subtle animated background — slow radial gradient drift or noise texture, not distracting
- [ ] Mobile responsive

### 3. Report page (`app/report/[id]/page.tsx`)
Replace the JSON debug dump with the full report UI. All sections animate in on mount (staggered):
- [ ] **StackBadges** — small pill badges for framework + platform, fade in at top
- [ ] **ScoreCard** — hero section. Animated arc/ring. Score counts up 0→N. Shows current
      and achievable score. Top 3 opportunities listed with +N pts each.
- [ ] **ExecutiveSummary** — Claude prose in a clean quoted block, subtle left border accent
- [ ] **VitalsGrid** — 5 metric cards in a responsive grid. Color-coded. Staggered entrance.
      Each shows metric name, value, unit, and good/needs-improvement/poor status pill.
- [ ] **FindingsList** — ranked by impact. Each finding has title, description, framework-aware
      fix in a code-style block, and the +N pts impact badge.
- [ ] **CursorPromptButton** — prominent. On click: animates to ✓ "Copied", reverts after 2s.
      console.log('cursor_prompt_copied') for click tracking.
- [ ] **ExportButton** — dropdown with three options: GitHub Issue / Linear / Markdown download
- [ ] **WaitlistCTA** — at the bottom. Contextual copy referencing finding count.
      Email input + submit. POST /api/waitlist. Success state animated.

### 4. Report components (`components/report/`)
Each section above must be its own component file:
- [ ] `StackBadges.tsx`
- [ ] `ScoreCard.tsx`
- [ ] `ExecutiveSummary.tsx`
- [ ] `VitalsGrid.tsx`
- [ ] `FindingsList.tsx`
- [ ] `CursorPromptButton.tsx`
- [ ] `ExportButton.tsx`
- [ ] `WaitlistCTA.tsx`

### 5. Lighthouse worker (`lighthouse-worker/`)
- [ ] `cd lighthouse-worker && npm install`
- [ ] Verify: `npm run dev` → "Lighthouse worker listening on port 3001"
- [ ] Test: `curl -X POST http://localhost:3001/audit -H "Content-Type: application/json" -d '{"url":"https://example.com"}'`
- [ ] Should return Lighthouse JSON within 60s

### 6. End-to-end test
- [ ] Fill `.env.local` with real keys
- [ ] Run worker + Next.js simultaneously
- [ ] Submit a real URL end-to-end
- [ ] Verify score, vitals, findings, cursor prompt all render correctly
- [ ] Click Copy Cursor Prompt — verify clipboard + console.log fires
- [ ] Submit waitlist email — verify Resend confirmation

### 7. Polish
- [ ] `<title>` and `<meta description>` on report page
- [ ] OG image for report sharing (dynamic, shows score)
- [ ] Edge cases: paywalled URLs, localhost, non-HTML responses
- [ ] Rate limiting on `/api/audit` — max 10 req/min per IP
- [ ] Full mobile audit of every screen

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

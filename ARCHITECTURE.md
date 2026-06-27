# ShipAudit — Architecture & Codebase Guide

## What it is

ShipAudit is a no-login AI-powered website performance auditor. A user pastes a URL, the system runs Lighthouse on it in a GitHub Actions runner, processes the results through a deterministic analysis pipeline, adds a short AI-written summary, and returns a shareable report — all in under 90 seconds.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) on Vercel |
| Database / cache | Upstash Redis (serverless REST) |
| Lighthouse runner | GitHub Actions (`workflow_dispatch`) |
| AI prose | Groq API (`llama-3.3-70b-versatile`) |
| Email | Resend |
| Analytics | PostHog (client + server) |
| UI animation | Framer Motion |
| Styling | Tailwind CSS v4 |

---

## Request lifecycle — the full audit flow

```
Browser
  │
  ├─ POST /api/audit  { url }
  │     │
  │     ├─ normalizeUrl()          strip fragment, ensure https://
  │     ├─ generateReportId(url)   SHA-256 → 16-char hex (deterministic per URL)
  │     ├─ Redis GET report:{id}   → cache hit? return { reportId, status:'complete' }
  │     ├─ detectFramework(url)    fetch HTML+headers, detect Next.js/Nuxt/etc.
  │     ├─ randomUUID()            fresh auditId for this run
  │     ├─ GitHub Actions dispatch → triggers lighthouse-audit.yml
  │     ├─ Redis SET audit-status:{auditId}  { status:'pending', url, stack }
  │     └─ return { auditId, reportId, status:'pending' }
  │
  ├─ Browser polls GET /api/audit/status/{auditId}  every 5s
  │
  │     Meanwhile, GitHub Actions:
  │     ├─ installs Lighthouse globally
  │     ├─ runs: lighthouse <url> --output=json
  │     └─ POST /api/audit/callback  (body=lhr.json, headers: x-audit-id, x-audit-secret)
  │
  ├─ POST /api/audit/callback
  │     ├─ verifies x-audit-secret matches AUDIT_CALLBACK_SECRET env var
  │     ├─ Redis SET lhr:{auditId}  (raw LHR JSON, 10min TTL)
  │     └─ Redis SET audit-status:{auditId}  { status:'processing' }
  │
  ├─ GET /api/audit/status/{auditId}  sees 'processing'
  │     ├─ updates status to 'running'  (prevents double-trigger on next poll)
  │     ├─ fire-and-forget: POST /api/audit/process/{auditId}
  │     └─ returns { status:'processing' } to browser
  │
  ├─ POST /api/audit/process/{auditId}
  │     ├─ Redis GET lhr:{auditId}   raw LHR
  │     ├─ Redis GET audit-status:{auditId}   url + stack
  │     ├─ parseVitals(lhr)          extract LCP/INP/CLS/FCP/TTFB
  │     ├─ runRuleEngine(lhr, fw)    score + ranked findings
  │     ├─ analyzeThirdParties(lhr)  blocking time by vendor
  │     ├─ analyzeImages(lhr)        wasted KB, format issues
  │     ├─ analyzeFonts(lhr)         render-blocking, missing font-display
  │     ├─ [parallel] generateExecutiveSummary()  Groq → 2-3 prose sentences
  │     ├─ [parallel] generateCursorPrompt()      Groq → paste-into-Cursor fix prompt
  │     ├─ Redis SET report:{reportId}  full AuditReport (1h TTL)
  │     ├─ Redis SET audit-status:{auditId}  { status:'complete', reportId }
  │     ├─ Redis DEL lhr:{auditId}
  │     └─ PostHog event: audit_completed
  │
  └─ Browser poll sees 'complete' → router.push(/report/{reportId})
```

---

## File-by-file reference

### `app/page.tsx` — Homepage

Client component. Manages the URL input form, the animated loading overlay, and the waitlist signup widget at the bottom.

**Key behaviors:**
- Auto-focuses the URL input on mount
- On submit: POST `/api/audit` → cache hit goes directly to report, otherwise enters polling loop
- Polling: 60 attempts × 5s = 5 min max before timeout error
- Step labels advance on timers (not API events) to give a live feel: step 2 at 8s, step 3 + first poll at 40s
- On complete: brief step-4 flash (600ms) then `router.push`
- Loading overlay is a Framer Motion `AnimatePresence` fullscreen takeover

### `app/report/[id]/page.tsx` — Report page

Server component. Fetches `report:{id}` from Redis on the server, calls `notFound()` if missing.

Renders these sections in order:
1. `StackBadges` — framework + platform pills
2. `MeasurementContext` — explains mobile throttling methodology
3. `ScoreCard` — animated arc + score counter, top 3 opportunities
4. `ExecutiveSummary` — Groq prose
5. `VitalsGrid` — LCP/INP/CLS/FCP/TTFB color-coded cards
6. `ThirdPartyAudit` — blocking time by vendor (only if services found)
7. `ImageAudit` — wasted KB per image (only if >50KB total wasted)
8. `FontAudit` — render-blocking and missing font-display
9. `FindingsList` — ranked by impact, framework-aware fix per finding
10. `CursorPromptButton` — copy-to-clipboard with animated checkmark
11. `ExportButton` — GitHub Issue / Linear / Markdown download
12. `WaitlistCTA` — email capture

Also generates dynamic `<title>`, `<meta description>`, and OG tags per report.

### `app/api/audit/route.ts` — Audit trigger

Validates URL, checks cache, detects framework, fires GitHub Actions workflow, writes `audit-status:{auditId}` to Redis. Returns immediately with `auditId` + `reportId`.

`maxDuration = 10` — this is a short-lived Vercel serverless function; the heavy work happens in GitHub Actions.

### `app/api/audit/callback/route.ts` — Lighthouse result receiver

Receives the raw LHR JSON POSTed by the GitHub Actions workflow. Authenticates via `x-audit-secret` header. Stores LHR in Redis and advances status to `'processing'`.

### `app/api/audit/status/[auditId]/route.ts` — Status poller

The browser polls this every 5s. State machine:

```
pending → processing → running → complete
                              ↘ error
```

The `processing → running` transition is the key one: it fires the process endpoint as a fire-and-forget fetch so the short-TTL status endpoint doesn't block on the full analysis pipeline.

### `app/api/audit/process/[auditId]/route.ts` — Analysis pipeline

The heart of the backend. Reads LHR + metadata from Redis, runs all analysis in sequence, calls Groq in parallel for both prose outputs, assembles the `AuditReport`, and writes it to Redis. Also fires the `audit_completed` PostHog event.

`maxDuration = 10` — designed to complete well within Vercel's function timeout.

### `app/api/waitlist/route.ts` — Email capture

Validates email, sends a notification to the founder via Resend, captures a PostHog `waitlist_signup_completed` event.

### `app/api/feedback/route.ts` — In-app feedback

Accepts `{ mood, message, page }` from the `FeedbackWidget`, emails the founder via Resend.

### `app/api/og/report/[id]/route.tsx` — Dynamic OG image

Generates a `1200×630` OG image for report sharing showing the score and domain. Uses Next.js `ImageResponse`.

---

## Library modules

### `lib/types.ts`

All shared TypeScript types. Key ones:

- `AuditReport` — the full persisted report structure
- `LighthouseResult` — typed subset of LHR that the app reads
- `Finding` — a ranked performance issue with title, description, fix, and estimated point impact
- `ShipAuditScore` — current score, achievable score, top 3 opportunities, category breakdown
- `WebVital` — one of LCP/INP/CLS/FCP/TTFB with value, unit, and good/needs-improvement/poor status
- `ThirdPartyAudit`, `ImageAudit`, `FontAudit` — structured analysis outputs

### `lib/utils.ts`

- `cn()` — Tailwind class merging (`clsx` + `tailwind-merge`)
- `normalizeUrl(raw)` — strips fragment, ensures `https://`, removes trailing slash
- `generateReportId(url)` — SHA-256 of normalized URL → 16-char hex; deterministic so the same URL always maps to the same cache key
- `formatVitalValue(value, unit)` — renders ms values as `1.2s` above 1000ms

### `lib/framework-detect.ts`

Fetches the URL's HTML + response headers (10s timeout) and looks for known signals:

- **Framework**: HTML markers like `__NEXT_DATA__`, `__NUXT_DATA__`, `__remixContext`, `<astro-island>`, `ng-version`, `data-v-app`, `data-reactroot`, `wp-content`
- **Platform**: Response headers like `x-vercel-id`, `x-railway-request-id`, `x-nf-request-id`, `x-powered-by`, `server`
- **Tailwind**: Regex match on common utility class patterns in the HTML

Returns `DetectedStack` with `framework`, `deployPlatform`, `hasTailwind`, `rawSignals`.

### `lib/vitals.ts`

Extracts the 5 Core Web Vitals from the LHR `audits` object:

| Vital | LHR audit key | Good | Needs improvement |
|---|---|---|---|
| LCP | `largest-contentful-paint` | ≤2500ms | ≤4000ms |
| INP | `interaction-to-next-paint` | ≤200ms | ≤500ms |
| CLS | `cumulative-layout-shift` | ≤0.1 | ≤0.25 |
| FCP | `first-contentful-paint` | ≤1800ms | ≤3000ms |
| TTFB | `server-response-time` | ≤800ms | ≤1800ms |

Thresholds are Google's official CWV thresholds — never changed.

### `lib/rule-engine.ts`

The scoring and findings system. Fully deterministic — no AI involved.

**Score formula:**
```
ShipAuditScore = performance×0.5 + accessibility×0.2 + seo×0.15 + bestPractices×0.15
achievable = min(100, current + sum of top-3 finding impacts)
```

**Findings:** For each of ~25 known Lighthouse audit IDs, if the audit score is `< 0.9` (or null), a `Finding` is created with:
- A hardcoded `estimatedPointImpact` (e.g. render-blocking-resources = 18pts)
- A framework-aware fix instruction — `FIX_MAP[auditId][framework]` with a `'default'` fallback

Findings are sorted by `estimatedPointImpact` descending. The top 3 become `topOpportunities`.

### `lib/summarize.ts`

The only place AI (Groq) is used. Two functions:

- `generateExecutiveSummary()` — writes 2-3 plain English sentences describing the performance story. Prompt enforces: no bullet points, benchmark only against Google CWV thresholds, don't say "low score" (frame as real-world mobile conditions).
- `generateCursorPrompt()` — writes a single actionable prompt for pasting into Cursor or Claude Code. Includes the top 5 framework-aware fixes plus named third-party services to defer, specific image filenames, and font-display issues. Always ends with: *"Preserve all existing functionality and target an LCP below 2.5 seconds."*

Both functions have a hardcoded fallback string that returns if the Groq call fails.

### `lib/third-party-analyzer.ts`

Reads the `third-party-summary` Lighthouse audit. Maps service origins to a `SERVICE_MAP` of known vendors (GTM, GA4, Segment, Meta Pixel, Intercom, HubSpot, etc.). Returns `ThirdPartyAudit` with services sorted by blocking time and a `worstOffender` pointer.

### `lib/image-analyzer.ts`

Reads four Lighthouse audits (`uses-optimized-images`, `uses-webp-images`, `offscreen-images`, `uses-responsive-images`), deduplicates by URL (taking max wasted bytes), extracts filename and format, and computes a rough LCP impact estimate for the image that matches the LCP element's src. Returns top 10 issues sorted by wasted KB.

### `lib/font-analyzer.ts`

Reads `font-display` and `render-blocking-resources` audits. Extracts font URLs, identifies which are missing `font-display`, which are render-blocking, attempts to extract font family name from URL, and classifies source as `google-fonts`, `typekit`, `self-hosted`, or `other`.

### `lib/posthog-server.ts`

Singleton factory for the PostHog Node.js client. Used in the process route and waitlist route to capture server-side events. `flushAt: 1, flushInterval: 0` means events flush immediately, paired with `await posthog.shutdown()` to ensure delivery before the serverless function exits.

---

## GitHub Actions Lighthouse runner

`.github/workflows/lighthouse-audit.yml`

Triggered by `workflow_dispatch` with three inputs: `url`, `callback_url`, `audit_id`.

Steps:
1. Checkout repo (needed to satisfy `actions/checkout`)
2. Set up Node 18
3. `npm install -g lighthouse`
4. Run Lighthouse → `lhr.json` (`continue-on-error: true` so step 5 always runs)
5. POST `lhr.json` (or an error JSON) to `callback_url` with `x-audit-id` and `x-audit-secret` headers

Timeout: 5 minutes per job. The secret `AUDIT_CALLBACK_SECRET` in GitHub must match the Vercel env var.

---

## Redis key schema

| Key | TTL | Content |
|---|---|---|
| `report:{reportId}` | 1 hour | Full `AuditReport` JSON |
| `audit-status:{auditId}` | 10 min | `{ status, url, stack, reportId? }` |
| `lhr:{auditId}` | 10 min | Raw Lighthouse JSON (deleted after processing) |

`reportId` is deterministic (SHA-256 of URL). `auditId` is a random UUID per run.

---

## Components overview

All report components live in `components/report/`. They're client components with Framer Motion animations.

| Component | What it renders |
|---|---|
| `ScoreCard` | Animated arc ring, score counter (0→N), breakdown bars, top 3 opportunities |
| `VitalsGrid` | 5 metric cards, color-coded by good/needs-improvement/poor |
| `FindingsList` | Ranked findings, each with title, description, framework-aware fix, impact badge |
| `ExecutiveSummary` | Groq prose in a quoted block with left accent border |
| `ThirdPartyAudit` | Table of third-party services sorted by blocking time |
| `ImageAudit` | Per-image issues: wasted KB, format, lazy loading |
| `FontAudit` | Font issues: render-blocking, missing font-display, source |
| `CursorPromptButton` | Copy-to-clipboard with animated ✓ checkmark, fires PostHog event |
| `ExportButton` | Dropdown: GitHub Issue / Linear / Markdown download |
| `WaitlistCTA` | Email capture, POST `/api/waitlist` |
| `StackBadges` | Framework + platform pills |
| `MeasurementContext` | Explains mobile throttling methodology |
| `ReanalyzeButton` | Clears cache and re-runs the audit for the same URL |
| `ReportFadeIn` | Wraps the report in a staggered Framer Motion fade-in |

---

## Environment variables

```
GROQ_API_KEY                  # Groq API for prose generation
UPSTASH_REDIS_REST_URL        # Redis connection
UPSTASH_REDIS_REST_TOKEN      # Redis auth
RESEND_API_KEY                # Email sending
FOUNDER_EMAIL                 # Receives waitlist + feedback notifications
GITHUB_TOKEN                  # PAT with actions:write scope
GITHUB_REPO_OWNER             # e.g. buildwithyudi
GITHUB_REPO_NAME              # e.g. shipaudit
AUDIT_CALLBACK_SECRET         # Must match GitHub Actions secret of same name
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
NEXT_PUBLIC_POSTHOG_HOST
```

---

## Design constraints

**Claude/AI is prose-only.** The rule engine decides which findings matter and how impactful they are. Groq only writes the executive summary and Cursor prompt from what the engine already computed. No AI reranking or dynamic scoring.

**Reports are cached by URL.** The same URL always produces the same `reportId` (SHA-256 hash). A cache hit skips the entire pipeline and returns instantly.

**No auth, no accounts.** The report URL is the only access mechanism. Reports expire after 1 hour.

**Vercel function budget.** Both `/api/audit` and `/api/audit/process` have `maxDuration = 10`. The pipeline is designed to fit. The Groq calls run in parallel to minimize wall time.

**lighthouse-worker/ is retired.** The `lighthouse-worker/` Express service was an earlier design that ran Lighthouse on Railway. It's kept for reference but excluded from builds. GitHub Actions is now the runner.

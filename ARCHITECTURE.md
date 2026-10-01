# ShipAudit — Architecture & Codebase Guide

## What it is

ShipAudit is a no-login AI-powered website performance auditor. A user pastes a URL, the system runs Lighthouse on it in a GitHub Actions runner, processes the results through a deterministic analysis pipeline, adds a short AI-written summary, and returns a shareable report. Runner queues and page complexity affect completion time.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) on Vercel |
| Database / cache | Upstash Redis (serverless REST) |
| Lighthouse runner | GitHub Actions (`workflow_dispatch`) |
| AI prose | Groq API (`openai/gpt-oss-120b`, low reasoning effort) |
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
  │     ├─ Redis GET report:v2:{id}   → cache hit? return { reportId, status:'complete' }
  │     ├─ detectFramework(url)    fetch HTML+headers, detect Next.js/Nuxt/etc.
  │     ├─ randomUUID()            fresh auditId for this run
  │     ├─ Redis SET audit-request:{auditId}  { url, stack }
  │     ├─ Redis SET audit-status:{auditId}  { status:'pending', url, stack }
  │     ├─ GitHub Actions dispatch → triggers lighthouse-audit.yml
  │     └─ return { auditId, reportId, status:'pending' }
  │
  ├─ Browser polls GET /api/audit/status/{auditId}  every 4s
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
  │     ├─ acquires audit-lock:{auditId} with Redis SET NX (90s TTL)
  │     ├─ Next.js after: await POST /api/audit/process/{auditId}
  │     └─ returns { status:'processing' } to browser
  │
  ├─ POST /api/audit/process/{auditId}
  │     ├─ Redis GET lhr:{auditId}   raw LHR
  │     ├─ Redis GET audit-request:{auditId}  immutable url + stack
  │     ├─ parseVitals(lhr)          extract LCP/INP/CLS/FCP/TTFB
  │     ├─ runRuleEngine(lhr, fw)    score + ranked findings
  │     ├─ analyzeThirdParties(lhr)  blocking time by vendor
  │     ├─ analyzeImages(lhr)        wasted KB, format issues
  │     ├─ analyzeFonts(lhr)         render-blocking, missing font-display
  │     ├─ [parallel] generateExecutiveSummary()  Groq → 2-3 prose sentences
  │     ├─ [parallel] generateCursorPrompt()      Groq → paste-into-Cursor fix prompt
  │     ├─ Redis SET report:v2:{reportId}  full AuditReport (1h TTL)
  │     ├─ Redis SET audit-status:{auditId}  { status:'complete', reportId }
  │     ├─ Redis DEL lhr:{auditId}, audit-request:{auditId}
  │     └─ PostHog event: audit_completed
  │
  └─ Browser sees 'complete' → report page → IndexedDB snapshot → /history
```

---

## File-by-file reference

### Homepage, report, and history

`app/page.tsx` is a server component that reads optional URL/refresh search parameters and renders `components/HomeClient.tsx`. The client validates and normalizes the URL, dispatches an audit, polls every four seconds for up to five minutes, and renders `AuditLoading` with stages derived from API state. The elapsed timer and rotating educational notes do not represent measured progress.

`app/report/[id]/page.tsx` fetches `report:v2:{id}` from Redis and renders `ReportDashboard`. `/report/demo` is a clearly labeled illustrative report. Legacy `report:{id}` data remains readable but ambiguous measurements require a fresh run. The report includes prioritized failed checks, nullable vitals, passing/informational checks, filters, affected resources, an AI prompt, export, and a contextual Guard signup.

After a completed home-flow audit opens, `ReportDashboard` saves a full snapshot in IndexedDB through `lib/audit-history.ts`. A visitor can also save an online report explicitly. `/history` lists, searches, and deletes these records; `/history/[key]` renders a saved snapshot through `SavedReport`. Timestamped keys retain separate runs of the same URL. The latest 50 measured reports are kept; demo and failed measurements are excluded. Snapshots outlive Redis expiry but stay on the browser/origin where they were saved. No account, cross-device sync, or backend history table is required.

### `app/api/audit/route.ts` — Audit trigger

Validates URL, checks cache, detects framework, writes immutable request metadata and pending status to Redis before dispatching GitHub Actions. Returns immediately with `auditId` + `reportId`.

`maxDuration = 30`. Framework detection and workflow dispatch have explicit timeouts; Lighthouse runs in GitHub Actions.

### `app/api/audit/callback/route.ts` — Lighthouse result receiver

Receives the raw LHR JSON POSTed by the GitHub Actions workflow. Authenticates via `x-audit-secret` header. Stores LHR in Redis and advances status to `'processing'`.

### `app/api/audit/status/[auditId]/route.ts` — Status poller

The browser polls this every 4s. State machine:

```
pending → processing → complete
                     ↘ error
```

A Redis NX lock prevents duplicate processors. Next.js `after` awaits the processor after returning the polling response, keeping the invocation alive. The status remains `processing` while analysis runs. A built-in Vercel automation header allows the self-request on protected previews. `maxDuration = 60`.

### `app/api/audit/process/[auditId]/route.ts` — Analysis pipeline

The heart of the backend. Reads LHR + metadata from Redis, runs all analysis in sequence, calls Groq in parallel for both prose outputs, assembles the `AuditReport`, and writes it to Redis. Also fires the `audit_completed` PostHog event.

`maxDuration = 60`. Groq requests run in parallel with 20-second client timeouts and deterministic fallback text. Request metadata is stored separately so a status transition cannot discard URL/framework context. Invalid or blocked Lighthouse results produce an error rather than a misleading zero score.

### `app/api/waitlist/route.ts` — Email capture

Validates email and persists it in the Redis `guard-waitlist` set. Notification through Resend is optional; its failure does not discard the signup.

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
- `WebVital` — one of LCP/INP/CLS/FCP/TTFB with nullable value, unit, and good/needs-improvement/poor/unavailable status
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
- **Tailwind**: Tailwind CSS variables or multiple distinctive utility tokens in actual class attributes

Returns `DetectedStack` with `framework`, `deployPlatform`, `hasTailwind`, `rawSignals`.

### `lib/vitals.ts`

Extracts five performance metrics from the LHR `audits` object:

| Vital | LHR audit key | Good | Needs improvement |
|---|---|---|---|
| LCP | `largest-contentful-paint` | ≤2500ms | ≤4000ms |
| INP | `interaction-to-next-paint` | ≤200ms | ≤500ms |
| CLS | `cumulative-layout-shift` | ≤0.1 | ≤0.25 |
| FCP | `first-contentful-paint` | ≤1800ms | ≤3000ms |
| TTFB | `server-response-time` | ≤800ms | ≤1800ms |

LCP, INP, and CLS use Core Web Vitals thresholds; FCP and TTFB use their own published performance thresholds. Missing timings remain unavailable; genuine zero CLS stays valid. A navigation Lighthouse run does not provide field INP.

### `lib/rule-engine.ts`

The scoring and findings system. Fully deterministic — no AI involved.

**Score formula:**
```
ShipAuditScore = performance×0.5 + accessibility×0.2 + seo×0.15 + bestPractices×0.15
achievable = min(100, current + sum of top-3 finding impacts)
```

**Findings:** For each of ~25 known Lighthouse audit IDs, a failed numeric audit score `< 0.9` creates a `Finding` with:
- A hardcoded `estimatedPointImpact` (e.g. render-blocking-resources = 18pts)
- A framework-aware fix instruction — `FIX_MAP[auditId][framework]` with a `'default'` fallback

Findings are sorted by `estimatedPointImpact` descending. The top 3 become `topOpportunities`. Passing and informational/manual checks are retained separately with no problem-point value. Modern Lighthouse insight aliases map to the same rule definitions and supersede duplicate legacy rows. Missing categories make a partial measurement explicit.

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
2. Set up Node 22
3. `npm install -g lighthouse@12.8.2`
4. Run Lighthouse → `lhr.json` (`continue-on-error: true` so step 5 always runs)
5. POST `lhr.json` (or an error JSON) to `callback_url` with `x-audit-id` and `x-audit-secret` headers

Inputs are passed through environment variables rather than inserted into shell scripts. Callback HTTP failures fail the workflow step. Timeout: 5 minutes per job. The secret `AUDIT_CALLBACK_SECRET` in GitHub must match the Vercel env var.

---

## Redis key schema

| Key | TTL | Content |
|---|---|---|
| `report:v2:{reportId}` | 1 hour | Full version-2 `AuditReport` JSON |
| `report:{reportId}` | 1 hour | Legacy report, read-only fallback |
| `audit-request:{auditId}` | 10 min | Immutable `{ url, stack }` |
| `audit-lock:{auditId}` | 90 sec | Prevent duplicate processors |
| `audit-status:{auditId}` | 10 min | `{ status, url, stack, reportId? }` |
| `lhr:{auditId}` | 10 min | Raw Lighthouse JSON (deleted after processing) |

`reportId` is deterministic (SHA-256 of URL). `auditId` is a random UUID per run.

---

## Components overview

The current interface uses `HomeClient`, `AuditLoading`, `AuditHistory`, `SavedReport`, `ScoreGauge`, `GuardPanel`, `FeedbackWidget`, `report/ReportDashboard`, `report/ExportButton`, and `ui/CopyButton`. Older report components remain in the repository for reference. See [DESIGN.md](DESIGN.md) for tokens, screen behavior, motion, accessibility, and edge states.

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
AUDIT_CALLBACK_ORIGIN         # Optional public receiver for protected previews
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
NEXT_PUBLIC_POSTHOG_HOST
```

---

## Design constraints

**Claude/AI is prose-only.** The rule engine decides which findings matter and how impactful they are. Groq only writes the executive summary and Cursor prompt from what the engine already computed. No AI reranking or dynamic scoring.

**Reports are cached by URL.** The same URL always produces the same `reportId` (SHA-256 hash). A cache hit skips the entire pipeline and returns instantly.

**No auth, no accounts.** Online reports are accessible by URL and expire after one hour. Browser-local IndexedDB snapshots remain until removed, cleared, or evicted.

**Vercel function budget.** `/api/audit` allows 30 seconds; status and processing allow 60 seconds. Lighthouse runs outside Vercel. Parallel Groq calls have explicit timeouts.

**lighthouse-worker/ is retired.** The `lighthouse-worker/` Express service was an earlier design that ran Lighthouse on Railway. It's kept for reference but excluded from builds. GitHub Actions is now the runner.

# ⚡ ShipAudit

**Paste any URL. AI-powered audit. Human-readable fixes. 30 seconds.**

ShipAudit analyzes any website and returns a ranked performance report with framework-aware fix instructions — ready to paste directly into Cursor or Claude Code. No account. No setup. One URL in, one report out.

---

## What it does

You paste a URL. ShipAudit runs a full performance analysis and returns:

- **ShipAudit Score** — a weighted composite score (Performance 50%, Accessibility 20%, SEO 15%, Best Practices 15%) with an achievable score showing how much headroom you have
- **Core Web Vitals** — LCP, INP, CLS, FCP, TTFB benchmarked against Google's published thresholds
- **Ranked findings** — issues ordered by score impact, not Lighthouse's default order
- **Framework-aware fixes** — if you're on Next.js, you get `next/image`. If you're on Nuxt, you get `@nuxt/image`. Not generic advice
- **Cursor fix prompt** — one click copies a ready-to-paste prompt for your AI coding agent
- **Export** — GitHub Issue, Linear ticket, or raw Markdown

The rule engine decides what's important. The AI writes the explanation. Never the other way around.

---

## Demo

```
URL submitted:     https://yoursite.com
Framework:         Next.js · Vercel · Tailwind CSS

ShipAudit Score:   71 / 100
Achievable:        95 / 100

Top opportunities:
  1. Eliminate render-blocking resources    +18 pts
  2. Properly size images                   +16 pts
  3. Reduce unused JavaScript               +13 pts

LCP:   3.9s  ✕ Poor          (threshold: 2.5s)
INP:   0ms   ✓ Good
CLS:   0.00  ✓ Good
FCP:   1.4s  ✓ Good
TTFB:  78ms  ✓ Good
```

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| AI | Groq — `llama-3.3-70b-versatile` |
| Performance analysis | Lighthouse + headless Chromium |
| Report cache | Upstash Redis (6h TTL, force-refresh supported) |
| Email | Resend |
| Frontend deploy | Vercel |
| Lighthouse worker | Railway (separate service — no timeout constraints) |

---

## Architecture

The Lighthouse worker lives on Railway, not Vercel. Vercel Hobby functions timeout at 10 seconds. Lighthouse takes 20–50 seconds. Railway gives a persistent Node container with no timeout.

```
POST /api/audit { url }
  → normalizeUrl()
  → Redis cache check (hit → return immediately)
  → detectFramework() — HTML + response headers
  → POST railway-worker/audit { url }
      └── headless Chromium + Lighthouse → LHR JSON
  → parseVitals(lhr)
  → runRuleEngine(lhr, framework)   ← deterministic, no AI
  → generateExecutiveSummary()      ← AI prose only
  → generateCursorPrompt()          ← AI prose only
  → cache in Redis
  → return { reportId }
```

---

## Local development

### Prerequisites

- Node.js 18+
- npm

### 1. Clone and install

```bash
git clone https://github.com/yourusername/shipaudit.git
cd shipaudit
npm install
```

### 2. Install Lighthouse worker dependencies

```bash
cd lighthouse-worker
npm install
cd ..
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
# Groq (free at console.groq.com)
GROQ_API_KEY=

# Upstash Redis (free at console.upstash.com)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Resend (free at resend.com)
RESEND_API_KEY=

# Lighthouse worker (local)
LIGHTHOUSE_WORKER_URL=http://localhost:3001
```

### 4. Run both services

**Terminal 1 — Lighthouse worker:**
```bash
cd lighthouse-worker
npm run dev
# → Lighthouse worker listening on port 3001
```

**Terminal 2 — Next.js:**
```bash
npm run dev
# → Ready at http://localhost:3000
```

### 5. Test the pipeline

```bash
curl -X POST http://localhost:3001/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://vercel.com"}'
```

Should return Lighthouse JSON within 60 seconds. Then open `http://localhost:3000` and submit a URL end-to-end.

---

## Project structure

```
shipaudit/
├── app/
│   ├── page.tsx                  ← Homepage
│   ├── report/[id]/page.tsx      ← Report page
│   └── api/
│       ├── audit/route.ts        ← Orchestration pipeline
│       └── waitlist/route.ts     ← Email capture
├── components/
│   └── report/
│       ├── ScoreCard.tsx
│       ├── VitalsGrid.tsx
│       ├── FindingsList.tsx
│       ├── CursorPromptButton.tsx
│       ├── ExportButton.tsx
│       ├── WaitlistCTA.tsx
│       └── ...
├── lib/
│   ├── types.ts                  ← Shared types
│   ├── rule-engine.ts            ← Deterministic scoring
│   ├── framework-detect.ts       ← HTML/header detection
│   ├── vitals.ts                 ← LHR → WebVital[]
│   └── summarize.ts              ← AI prose generation
└── lighthouse-worker/            ← Railway service
    └── src/index.ts
```

---

## Deploying to production

### Lighthouse worker → Railway

1. Create a new project at [railway.app](https://railway.app)
2. Connect your GitHub repo, set the root directory to `lighthouse-worker`
3. Railway auto-detects Node and runs `npm start`
4. Copy the generated Railway URL

### Next.js app → Vercel

1. Push to GitHub
2. Import at [vercel.com](https://vercel.com)
3. Add environment variables — same as `.env.local` but set `LIGHTHOUSE_WORKER_URL` to your Railway URL
4. Deploy

That's it. The only difference between local dev and production is `LIGHTHOUSE_WORKER_URL`.

---

## Key design decisions

**The rule engine is always in charge.**
The AI never decides what is important. `lib/rule-engine.ts` ranks findings deterministically by estimated score impact. The AI receives the ranked output and writes prose. This keeps reports reproducible and consistent.

**ShipAudit is not an observability platform.**
No error tracking. No session replay. No logs. No traces. Every feature request passes this filter first.

**Framework detection is silent.**
ShipAudit detects Next.js, Nuxt, Astro, Angular, Vue, Svelte, Remix, and 7 others from HTML signals and response headers. It never tells you this is happening — it just makes the fix recommendations accurate.

**The Cursor prompt is the most important feature.**
Every report ends with a single button that copies a framework-specific, finding-specific fix prompt to your clipboard — ready to paste into Cursor or Claude Code. The target: ≥ 20% of report viewers click it. If that number is below 20%, the core Phase 2 assumption needs revisiting.

---

## Coming soon — ShipAudit Guard

Automatic performance analysis after every deployment.

```
Deploy webhook fires
  → ShipAudit fetches git diff
  → Browser SDK metrics stabilize (5–15 min)
  → Rule engine compares before vs after
  → AI generates root cause analysis
  → Slack / Discord / email notification
```

Notification example:
```
⚡ ShipAudit Guard — Deploy #248 analyzed

✕  LCP degraded     2.3s → 4.1s   (+78%)
✕  Bundle grew      210KB → 487KB  (+132%)
⚠  CLS worsened     0.04 → 0.14

Likely cause: components/Analytics.tsx

→ View full report + Cursor fix prompt
```

[Join the waitlist →](https://shipaudit.com)

---

## Contributing

Issues and PRs welcome. Before opening a PR, check that your change passes the filter: is this making ShipAudit a better deployment reviewer, or is it creeping toward observability?

---

*Built for AI-assisted engineers who ship fast and need to know when something breaks.*
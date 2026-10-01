# ShipAudit

Paste a public URL, run a Lighthouse lab audit, and get a prioritized report with framework-aware fixes and an AI coding prompt. No account required.

## What it does

- Measures performance, accessibility, SEO, and best practices with Lighthouse in GitHub Actions.
- Separates failed checks from passing and manual/informational checks.
- Shows LCP, CLS, FCP, and TTFB with thresholds; missing values remain unavailable. Navigation audits do not provide field INP.
- Ranks fixes deterministically and adds an executive summary and coding prompt through Groq.
- Exports Markdown and copies ticket text for GitHub or Linear.
- Keeps up to 50 full report snapshots in browser-local audit history.

Scores are lab measurements. Completion time depends on the runner queue and the page being tested. Estimated point improvements are heuristics rather than guaranteed gains.

## Stack and flow

Next.js 16.2 / React 19, TypeScript, Tailwind CSS 4, Framer Motion, Upstash Redis, GitHub Actions, Groq (`openai/gpt-oss-120b`), Resend, and PostHog.

```text
URL form → POST /api/audit → GitHub Actions Lighthouse
         → authenticated callback → Redis raw result
         → status polling / Next.js after → report processor
         → report:v2:{id} → report page → IndexedDB history
```

The deterministic rule engine determines findings and score impact. Groq writes prose from those results. The old `lighthouse-worker/` service is retained for reference; the current app uses GitHub Actions.

## Local development

Use Node.js 22.12 or later for the included data tests.

```bash
npm install
npm run dev
```

The homepage, `/report/demo`, and browser-local history work without server credentials. Real audits require these variables in an ignored `.env.local` or the deployment environment:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
GITHUB_TOKEN
GITHUB_REPO_OWNER
GITHUB_REPO_NAME
AUDIT_CALLBACK_SECRET
GROQ_API_KEY
```

`KV_REST_API_URL` and `KV_REST_API_TOKEN` are accepted Redis fallbacks. The GitHub token must be able to dispatch Actions in the configured repository. Its Actions secret `AUDIT_CALLBACK_SECRET` must match the app. Set `AUDIT_CALLBACK_ORIGIN` to a reachable callback receiver when developing locally or using a protected preview; the receiver must use the same Redis database and callback secret. A deployed public app receives its own callbacks by default.

Optional email configuration: `RESEND_API_KEY`, `FOUNDER_EMAIL`. Optional analytics: `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`. Guard signups are stored in Redis before optional notification email.

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Data tests cover missing measurements, genuine zero CLS, failed/passing/informational checks, Lighthouse checklist detail objects, duplicate insight aliases, Tailwind evidence, denied access, partial categories, legacy reports, and URL validation.

## Audit history without login

Completed home-flow audits save automatically when their report opens. Visitors can also select **Save to history** on an online report. `/history` provides URL search, reopening, individual deletion, and clearing all history with confirmation. Fresh runs of the same URL retain separate timestamped snapshots. Demo reports and failed measurements are excluded.

Online reports expire after one hour; local snapshots remain available until deleted, browser data is cleared, or storage is evicted. History belongs to the current browser and site origin, so it does not sync between devices. Preview and production origins have separate history. Markdown export provides a portable copy.

## Design and architecture

[DESIGN.md](DESIGN.md) covers the Signal Bench direction, design tokens, motion, screen specifications, accessibility, and edge states. [ARCHITECTURE.md](ARCHITECTURE.md) describes routes, request lifetimes, dependencies, and Redis keys.

New reports use the `report:v2:` Redis prefix to keep nullable measurements separate from older cached report data while the redesigned app is reviewed in preview.

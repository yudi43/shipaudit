<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into ShipAudit. This covers client-side initialization via `instrumentation-client.ts` (Next.js 15.3+ pattern), a shared server-side PostHog client in `lib/posthog-server.ts`, reverse-proxy rewrites in `next.config.ts`, and event capture across all key user flows — from URL submission through cursor prompt copy and waitlist signup. Both `posthog-js` and `posthog-node` packages were installed. Environment variables `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` were written to `.env.local`.

| Event | Description | File |
|---|---|---|
| `audit_submitted` | User submitted a URL for analysis | `app/page.tsx` |
| `audit_failed` | Audit failed and an error was shown to the user | `app/page.tsx` |
| `audit_completed` | Server: Lighthouse audit finished and report cached | `app/api/audit/route.ts` |
| `cursor_prompt_copied` | User copied the AI fix prompt (primary conversion) | `components/report/CursorPromptButton.tsx` |
| `report_exported` | User exported the report (GitHub Issue / Linear / Markdown) | `components/report/ExportButton.tsx` |
| `report_reanalyzed` | User forced a fresh Lighthouse run on a report | `components/report/ReanalyzeButton.tsx` |
| `waitlist_signup_submitted` | User submitted their email for ShipAudit Guard (client) | `app/page.tsx`, `components/report/WaitlistCTA.tsx` |
| `waitlist_signup_completed` | Server: waitlist email processed and notification sent | `app/api/waitlist/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/462228/dashboard/1687935)
- [Audit submissions over time](https://us.posthog.com/project/462228/insights/WQtCPMKo)
- [Cursor prompt copy rate](https://us.posthog.com/project/462228/insights/hXb9hLSD)
- [Waitlist signups over time](https://us.posthog.com/project/462228/insights/HUiO9YXX)
- [Audit failure rate](https://us.posthog.com/project/462228/insights/HS2BveFD)
- [Report exports](https://us.posthog.com/project/462228/insights/fbwLetBT)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

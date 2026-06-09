# lighthouse-worker

This Express worker is no longer used in production.

ShipAudit now runs Lighthouse via GitHub Actions. See `.github/workflows/lighthouse-audit.yml`.

The `POST /api/audit/callback` endpoint in the Next.js app receives the LHR result from the
workflow and stores it in Redis, where the main audit route polls for it.

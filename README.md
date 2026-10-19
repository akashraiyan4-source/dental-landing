# SmileWay Studio – Dental Landing Page

Next.js 16 (App Router) landing page. All forms and the AI concierge talk to the **Universal Backend**
(`automation backend`); the only per-niche input is `niche: 'dental'` in each request body.

## Quick start

```bash
npm install
cp .env.example .env.local     # set NEXT_PUBLIC_BACKEND_URL (optional – defaults to production)
npm run dev
```

| Script | Purpose |
| --- | --- |
| `npm run check` | `tsc --noEmit` + ESLint |
| `npm run build` | Production build |
| `npm run smoke` | Read-only contract/CORS smoke test against the backend (`BACKEND_URL=... npm run smoke`) |
| `npm run audit:prod` | Fails on critical production advisories |

## Architecture

- `app/apiEndpoints.ts` – single source of truth for backend URLs (validated `NEXT_PUBLIC_BACKEND_URL`).
- `app/lib/apiClient.ts` – never-throwing JSON client: timeout, safe retries with backoff, `Retry-After`,
  `Idempotency-Key`, understands `{ success, data, error }` and the legacy response shape.
- Booking submissions reuse one `Idempotency-Key` per logical submission (new key if the form content changes),
  plus in-flight guards, so double-clicks and network retries can never double-book.
- `next.config.js` – site-wide security headers (CSP restricted to first-party, Unsplash, Google Maps and the backend
  origin; HSTS in production; `frame-ancestors 'none'`; Permissions-Policy; no `X-Powered-By`).
- `proxy.ts` – Next 16 successor of `middleware.ts`: method allow-list (GET/HEAD/OPTIONS) + request id.
  Rate limiting, validation and CORS are enforced by the backend.

## Deployment (Vercel)

1. Set `NEXT_PUBLIC_BACKEND_URL` to the backend's URL.
2. On the **backend**, add this site's origin to `ALLOWED_ORIGINS` – otherwise browsers are blocked (CORS is fail-closed).
3. If the site must be embedded in an iframe elsewhere, relax `frame-ancestors` / `X-Frame-Options` in `next.config.js`.

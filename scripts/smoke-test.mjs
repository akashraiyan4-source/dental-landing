#!/usr/bin/env node
/**
 * Read-only smoke test: verifies that the Universal Backend this landing page talks to is reachable and
 * honours the contract the frontend relies on. It never creates bookings or sends messages.
 *
 *   npm run smoke                              # uses NEXT_PUBLIC_BACKEND_URL or the production default
 *   BACKEND_URL=http://localhost:4000 npm run smoke
 *   SMOKE_ORIGIN=https://my-site.com npm run smoke   # origin used for the CORS checks
 *
 * Exit code is non-zero if any check fails (including when the backend is unreachable).
 */

const DEFAULT_BACKEND_URL = 'https://smileway-backend.vercel.app';
const backend = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:3000';
const evilOrigin = 'https://evil.example';
const TIMEOUT_MS = 15_000;

let failures = 0;

async function call(path, { method = 'GET', headers = {}, body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${backend}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { response, json };
  } finally {
    clearTimeout(timer);
  }
}

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${name}\n        ${error instanceof Error ? error.message : error}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log(`Smoke-testing ${backend} (origin: ${origin})\n`);

await check('GET /api/health -> 200 { success: true }', async () => {
  const { response, json } = await call('/api/health');
  assert(response.status === 200, `status ${response.status}`);
  assert(json?.success === true, 'body.success is not true');
});

await check('Security headers present', async () => {
  const { response } = await call('/api/health');
  assert(response.headers.get('x-content-type-options') === 'nosniff', 'missing X-Content-Type-Options');
  assert(Boolean(response.headers.get('content-security-policy')), 'missing Content-Security-Policy');
  assert(Boolean(response.headers.get('x-request-id')), 'missing X-Request-ID');
});

await check('CORS preflight allowed for the landing-page origin', async () => {
  const { response } = await call('/api/booking', {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,idempotency-key',
    },
  });
  assert(response.status === 204 || response.status === 200, `status ${response.status} (is ${origin} in ALLOWED_ORIGINS?)`);
  assert(response.headers.get('access-control-allow-origin') === origin, 'Allow-Origin does not echo the origin');
});

await check('CORS preflight blocked for an unauthorised origin', async () => {
  const { response } = await call('/api/booking', {
    method: 'OPTIONS',
    headers: { Origin: evilOrigin, 'Access-Control-Request-Method': 'POST' },
  });
  assert(response.status === 403, `status ${response.status}, expected 403`);
  assert(!response.headers.get('access-control-allow-origin'), 'Allow-Origin leaked to unauthorised origin');
});

await check('POST /api/booking with empty body -> 400 { success: false, error }', async () => {
  const { response, json } = await call('/api/booking', { method: 'POST', headers: { Origin: origin }, body: {} });
  assert(response.status === 400, `status ${response.status}, expected 400`);
  assert(json?.success === false && typeof json.error === 'string', 'body does not follow { success:false, error } contract');
});

await check('POST /api/ai-chat with empty body -> 400 (validated, never 500)', async () => {
  const { response, json } = await call('/api/ai-chat', { method: 'POST', headers: { Origin: origin }, body: { niche: 'dental' } });
  assert(response.status === 400, `status ${response.status}, expected 400`);
  assert(json?.success === false, 'body.success is not false');
});

await check('Unknown route -> JSON 404', async () => {
  const { response, json } = await call('/api/definitely-not-a-route');
  assert(response.status === 404, `status ${response.status}, expected 404`);
  assert(json?.success === false, 'expected JSON error body');
});

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge guard for the landing page (Next.js 16 `proxy`, the successor of `middleware`).
 *
 * This site is purely presentational – every form/chat submission goes straight from the browser to the
 * Universal Backend, which owns rate limiting, validation and CORS. The proxy therefore only:
 *   1. rejects methods a static landing page never needs (cuts off probing/abuse early),
 *   2. tags each request with a correlation id for log tracing.
 * (The previous `/api/*` limiter was dead code: this project has no `/api` routes.)
 */
const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function proxy(request: NextRequest) {
  if (!ALLOWED_METHODS.has(request.method)) {
    return new NextResponse('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD, OPTIONS', 'Cache-Control': 'no-store' },
    });
  }

  const requestId = request.headers.get('x-request-id')?.slice(0, 64) || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

export const config = {
  // Everything except Next internals and static media (keeps large video range requests untouched).
  matcher: ['/((?!_next/static|_next/image|niches/|favicon.ico).*)'],
};

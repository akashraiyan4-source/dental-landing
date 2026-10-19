/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

// Keep in sync with DEFAULT_BACKEND_URL in app/apiEndpoints.ts
const DEFAULT_BACKEND_URL = 'https://smileway-backend.vercel.app';

function resolveBackend() {
  const candidate = (process.env.NEXT_PUBLIC_BACKEND_URL || '').trim() || DEFAULT_BACKEND_URL;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('unsupported protocol');
    return { value: url.origin + url.pathname.replace(/\/+$/, ''), origin: url.origin };
  } catch {
    console.warn(`[next.config] Invalid NEXT_PUBLIC_BACKEND_URL "${candidate}" - using ${DEFAULT_BACKEND_URL}`);
    return { value: DEFAULT_BACKEND_URL, origin: DEFAULT_BACKEND_URL };
  }
}

const backend = resolveBackend();

/**
 * Content-Security-Policy tuned to what this landing page really loads:
 *  - first-party scripts/styles (Next.js + styled-jsx need inline allowances),
 *  - first-party videos/images, Unsplash portrait, Google Maps embed,
 *  - XHR/fetch only to itself and the Universal Backend.
 */
function contentSecurityPolicy() {
  const connect = ["'self'", backend.origin];
  if (!isProd) connect.push('ws://localhost:*', 'http://localhost:*', 'ws://127.0.0.1:*', 'http://127.0.0.1:*');

  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
    'media-src': ["'self'", 'blob:', 'data:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': connect,
    'frame-src': ['https://maps.google.com', 'https://www.google.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  if (isProd) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
];

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  turbopack: { root: __dirname },

  // Guarantees client code always sees a validated backend URL (see app/apiEndpoints.ts).
  env: { NEXT_PUBLIC_BACKEND_URL: backend.value },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // Large first-party media: let browsers/CDN reuse it without making files un-replaceable forever.
        source: '/niches/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

module.exports = nextConfig;

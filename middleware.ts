import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// সিম্পল ইন-মেমোরি রেট লিমিটার ম্যাপ (হাজার হাজার ক্লায়েন্টের জন্য পরবর্তীতে এটি Redis-এ শিফট করা যাবে)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const LIMIT_WINDOW = 15 * 60 * 1000; // ১৫ মিনিট
const MAX_REQUESTS = 30; // প্রতি ১৫ মিনিটে সর্বোচ্চ ৩০টি রিকোয়েস্ট

export function middleware(request: NextRequest) {
  // কেবল /api/ রাউটগুলোর জন্য রেট লিমিট ও সিকিউরিটি চেক কার্যকর হবে
  if (request.nextUrl.pathname.startsWith('/api/')) {
    
    // ১. রেট লিটারিং চেক (আইপি বেজড - টাইপস্ক্রিপ্ট সেফ হেডার থেকে আইপি নেওয়া)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (request.headers.get('x-real-ip') || '127.0.0.1');
    
    const now = Date.now();
    const clientRecord = rateLimitMap.get(ip);

    if (clientRecord) {
      if (now - clientRecord.lastReset < LIMIT_WINDOW) {
        if (clientRecord.count >= MAX_REQUESTS) {
          return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
          );
        }
        clientRecord.count++;
      } else {
        clientRecord.lastReset = now;
        clientRecord.count = 1;
      }
    } else {
      rateLimitMap.set(ip, { count: 1, lastReset: now });
    }

    // ২. হ্যান্ডশেক বা রিকোয়েস্ট স্যানিটাইজেশন হেডার পাস করা
    const response = NextResponse.next();
    response.headers.set('X-Enterprise-Guard', 'Active');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
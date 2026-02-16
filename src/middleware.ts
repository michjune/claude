import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Skip auth for prototype UI routes
  const path = request.nextUrl.pathname;
  if (path.startsWith('/a') || path.startsWith('/b') || path.startsWith('/c') || path.startsWith('/d') || path.startsWith('/e') || path.startsWith('/compare') || path.startsWith('/design')) {
    return;
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

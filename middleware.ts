import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  console.log('Middleware executing for path:', request.nextUrl.pathname);

  // Skip middleware for static files, auth-related routes, and the initial dashboard redirect
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('/auth/') ||
    (request.nextUrl.pathname === '/dashboard' && request.headers.get('referer')?.includes('/auth/callback'))
  ) {
    console.log('Skipping middleware for:', request.nextUrl.pathname);
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Middleware session check:', {
      path: request.nextUrl.pathname,
      hasSession: !!session
    });

    // Only protect dashboard routes after initial auth
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      if (!session) {
        console.log('No session found, redirecting to home');
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return res;
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

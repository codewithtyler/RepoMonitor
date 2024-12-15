import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_ROUTES } from '@/lib/auth/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // With implicit flow, we just need to redirect to the client page
  // which will handle the hash fragment containing the session
  return NextResponse.redirect(new URL(AUTH_ROUTES.CALLBACK, request.url));
}
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { AUTH_ROUTES, AUTH_ERRORS } from '@/lib/auth/constants';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit',
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    );
    
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}${AUTH_ROUTES.CALLBACK}`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl,
        scopes: 'repo user',
        skipBrowserRedirect: true
      }
    });

    if (error) throw error;
    if (!data?.url) throw new Error(AUTH_ERRORS.OAUTH_FAILED);

    return NextResponse.json({ url: data.url });
  } catch (error) {
    return NextResponse.json({ 
      error: AUTH_ERRORS.OAUTH_FAILED,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 400 
    });
  }
}
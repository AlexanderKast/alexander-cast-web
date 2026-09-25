import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

// POST only: a GET logout can be triggered cross-site (<img src>, links).
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  // 303 so the browser follows with a GET to the login page.
  return NextResponse.redirect(new URL('/portal/login', request.url), 303);
}

export function GET() {
  return new NextResponse('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST' },
  });
}

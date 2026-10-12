import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isSameOriginStrict } from "@/lib/same-origin";

export async function POST(req: NextRequest) {
  if (isSameOriginStrict(req.headers)) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/comunidad/login", req.url), 303);
}

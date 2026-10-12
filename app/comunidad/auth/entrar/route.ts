import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isSameOriginStrict } from "@/lib/same-origin";

/** Canjea el token del correo por una sesión. Solo POST desde nuestra propia página. */
export async function POST(req: NextRequest) {
  const fallo = () => NextResponse.redirect(new URL("/comunidad/login?error=1", req.url), 303);

  if (!isSameOriginStrict(req.headers)) return fallo();

  const form = await req.formData();
  const tokenHash = form.get("token_hash");
  if (typeof tokenHash !== "string" || !tokenHash || tokenHash.length > 200) return fallo();

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) return fallo();

  return NextResponse.redirect(new URL("/comunidad", req.url), 303);
}

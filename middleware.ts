import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { COOKIE_REFERIDO, normalizarCodigo, VENTANA_REFERIDO_DIAS } from "@/lib/imt/pagos";

const PUBLIC_ADMIN_ROUTES = [
  "/admin/login",
  "/admin/invitacion",
  "/admin/sin-acceso",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let response = NextResponse.next({ request: { headers: new Headers(req.headers) } });

  if (!pathname.startsWith("/admin")) {
    // Referidos IA Master Tech: cualquier página con ?ref=CODIGO guarda la atribución 30 días.
    const ref = normalizarCodigo(req.nextUrl.searchParams.get("ref"));
    if (ref && req.cookies.get(COOKIE_REFERIDO)?.value !== ref) {
      response.cookies.set(COOKIE_REFERIDO, ref, {
        maxAge: VENTANA_REFERIDO_DIAS * 24 * 3600,
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response;
  }

  const isPublic = PUBLIC_ADMIN_ROUTES.some((r) => pathname.startsWith(r));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    if (!isPublic) return NextResponse.redirect(new URL("/admin/login?error=config", req.url));
    return response;
  }

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const userPromise = supabase.auth.getUser();
    const timeout = new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 5000),
    );
    const {
      data: { user },
    } = await Promise.race([userPromise, timeout]);

    if (!user && !isPublic) {
      const redirectUrl = new URL("/admin/login", req.url);
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    if (user && pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return response;
  } catch (err) {
    console.error("[middleware] supabase auth error:", err);
    if (!isPublic) return NextResponse.redirect(new URL("/admin/login?error=auth", req.url));
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico|mp4|webm|pdf|woff2?)).*)",
  ],
};

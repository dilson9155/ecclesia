import { type NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/recuperar-senha",
  "/redefinir-senha",
  "/manifest.webmanifest",
  "/sw.js",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_PATHS.has(pathname) || pathname.startsWith("/login");

  const secret = process.env.AUTH_SECRET;

  let isAuthenticated = false;
  let isPlatformAdmin = false;
  if (secret) {
    const secure =
      request.nextUrl.protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https";
    const prefix = secure ? "__Secure-" : "";
    const cookieName = `${prefix}authjs.session-token`;

    const cookie = request.cookies.get(cookieName)?.value;

    if (cookie) {
      try {
        const payload = await decode({ token: cookie, secret, salt: cookieName });
        isAuthenticated = Boolean(payload?.sub);
        isPlatformAdmin = payload?.isPlatformAdmin === true;
      } catch {
        isAuthenticated = false;
        isPlatformAdmin = false;
      }
    }
  }

  if (!isPublic && !isAuthenticated) {
    const url = new URL("/login", request.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // O administrador da plataforma não acessa áreas de igreja.
  if (isAuthenticated && isPlatformAdmin) {
    if (
      pathname === "/" ||
      pathname === "/login" ||
      pathname.startsWith("/login/") ||
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/")
    ) {
      return NextResponse.redirect(new URL("/super-admin", request.nextUrl));
    }
  }

  // Somente administradores da plataforma acessam o painel SaaS.
  if (isAuthenticated && !isPlatformAdmin && pathname.startsWith("/super-admin")) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  if (
    isAuthenticated &&
    (pathname === "/" || pathname === "/login" || pathname.startsWith("/login/"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

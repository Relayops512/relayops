import { NextResponse } from "next/server";
import { auth, isDispatcher } from "@/lib/auth";
import { getSamsaraConfig } from "@/lib/samsara/config";
import { buildAuthorizeUrl, createOAuthState, OAUTH_STATE_COOKIE, OAUTH_STATE_MAX_AGE } from "@/lib/samsara/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  const origin = new URL(req.url).origin;
  if (!session?.user) {
    const login = new URL("/login", origin);
    login.searchParams.set("callbackUrl", "/setup");
    return NextResponse.redirect(login);
  }
  if (!isDispatcher(session.user.role)) {
    return NextResponse.redirect(new URL("/setup?samsara=viewer", origin));
  }

  const config = getSamsaraConfig();
  if (!config.configured) {
    return NextResponse.redirect(new URL("/setup?samsara=not_configured", origin));
  }

  const { nonce, signed } = createOAuthState();
  const authorize = buildAuthorizeUrl(nonce);
  const response = NextResponse.redirect(authorize);
  response.cookies.set(OAUTH_STATE_COOKIE, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
  });
  return response;
}

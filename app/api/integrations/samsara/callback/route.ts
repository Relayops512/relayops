import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth, isDispatcher } from "@/lib/auth";
import { store } from "@/lib/store";
import { getSamsaraConfig } from "@/lib/samsara/config";
import { encryptTokens, exchangeAuthorizationCode, OAUTH_STATE_COOKIE, verifyOAuthState } from "@/lib/samsara/oauth";
import { friendlySamsaraError } from "@/lib/samsara/errors";
import { runSamsaraSync } from "@/lib/samsara/sync";

export const dynamic = "force-dynamic";

function setupRedirect(origin: string, status: string) {
  return NextResponse.redirect(new URL(`/setup?samsara=${encodeURIComponent(status)}`, origin));
}

function clearState(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error");
  const jar = await cookies();
  const signedState = jar.get(OAUTH_STATE_COOKIE)?.value;

  const session = await auth();
  if (!session?.user) {
    return clearState(setupRedirect(origin, "signed_out"));
  }
  if (!isDispatcher(session.user.role)) {
    return clearState(setupRedirect(origin, "viewer"));
  }

  if (error) {
    const message = friendlySamsaraError({
      code: error,
      message: url.searchParams.get("error_description") ?? "",
    });
    store.markSamsaraSynced({ summary: "", error: message });
    return clearState(
      setupRedirect(origin, error === "access_denied" || error === "scope_not_granted" ? "denied" : "error"),
    );
  }

  if (!getSamsaraConfig().configured) {
    return clearState(setupRedirect(origin, "not_configured"));
  }

  if (!verifyOAuthState(signedState, state)) {
    store.markSamsaraSynced({
      summary: "",
      error: friendlySamsaraError({ code: "invalid_state" }),
    });
    return clearState(setupRedirect(origin, "expired"));
  }

  if (!code) {
    store.markSamsaraSynced({
      summary: "",
      error: "Samsara didn't finish connecting. Try again.",
    });
    return clearState(setupRedirect(origin, "error"));
  }

  try {
    const tokens = await exchangeAuthorizationCode(code);
    store.setSamsaraTokens(encryptTokens(tokens), { orgName: "Samsara" });
    store.addAudit({
      kind: "SAMSARA_SYNC",
      actorId: session.user.id,
      message: `${session.user.name} connected Samsara. RelayOps only reads trucks, drivers, GPS, and hours.`,
    });
    await runSamsaraSync("merge");
    return clearState(setupRedirect(origin, "connected"));
  } catch (err) {
    const status = (err as { status?: number }).status;
    store.markSamsaraSynced({
      summary: "",
      error: friendlySamsaraError({
        status,
        message: err instanceof Error ? err.message : "token",
      }),
    });
    return clearState(setupRedirect(origin, "error"));
  }
}

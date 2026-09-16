import { cookies } from "next/headers";
import { store } from "./store";

export const ONBOARDING_COOKIE = "relayops_onboarded";

export async function hasOnboardingCookie(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ONBOARDING_COOKIE)?.value === "1";
}

export async function setOnboardingCookie() {
  const jar = await cookies();
  jar.set(ONBOARDING_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
  });
}

export async function shouldShowOnboarding(userId: string): Promise<boolean> {
  if (store.isOnboarded(userId)) return false;
  if (await hasOnboardingCookie()) return false;
  return true;
}

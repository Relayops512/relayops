import { randomBytes } from "crypto";
import { getSamsaraConfig, SAMSARA_AUTHORIZE_URL, SAMSARA_TOKEN_URL } from "./config";
import { decryptSecret, encryptSecret, signValue, verifySignedValue } from "./crypto";
import type { SamsaraTokens } from "./types";

export const OAUTH_STATE_COOKIE = "relayops_samsara_oauth";
export const OAUTH_STATE_MAX_AGE = 60 * 10;

export function createOAuthState(): { nonce: string; signed: string } {
  const nonce = randomBytes(24).toString("hex");
  return { nonce, signed: signValue(nonce) };
}

export function verifyOAuthState(signed: string | undefined, returned: string | undefined): boolean {
  if (!signed || !returned) return false;
  const nonce = verifySignedValue(signed);
  return Boolean(nonce && nonce === returned);
}

export function buildAuthorizeUrl(state: string): string {
  const config = getSamsaraConfig();
  const url = new URL(SAMSARA_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", config.redirectUri);
  return url.toString();
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<SamsaraTokens> {
  const config = getSamsaraConfig();
  const response = await fetch(SAMSARA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const json = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !json.access_token || !json.refresh_token) {
    const err = new Error(json.error_description || json.error || "token_exchange_failed") as Error & {
      status?: number;
    };
    err.status = response.status;
    throw err;
  }
  const expiresIn = Number(json.expires_in ?? 3599);
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + Math.max(30, expiresIn) * 1000,
    scope: json.scope ?? "admin:read",
  };
}

export async function exchangeAuthorizationCode(code: string): Promise<SamsaraTokens> {
  const config = getSamsaraConfig();
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<SamsaraTokens> {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export function encryptTokens(tokens: SamsaraTokens): string {
  return encryptSecret(JSON.stringify(tokens));
}

export function decryptTokens(blob: string): SamsaraTokens {
  const parsed = JSON.parse(decryptSecret(blob)) as Partial<SamsaraTokens>;
  if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) {
    throw new Error("decrypt");
  }
  return {
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    expiresAt: parsed.expiresAt,
    scope: parsed.scope ?? "admin:read",
  };
}

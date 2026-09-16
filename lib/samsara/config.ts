export const SAMSARA_AUTHORIZE_URL = "https://api.samsara.com/oauth2/authorize";
export const SAMSARA_TOKEN_URL = "https://api.samsara.com/oauth2/token";
export const SAMSARA_API_BASE_DEFAULT = "https://api.samsara.com";

export const SAMSARA_READ_SCOPES = [
  "Read Vehicles",
  "Read Drivers",
  "Read Assignments",
  "Read Vehicle Statistics",
  "Read ELD Compliance Settings (US)",
] as const;

export type SamsaraAppConfig = {
  configured: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBase: string;
  missing: string[];
};

export function samsaraRedirectUri(): string {
  const explicit = process.env.SAMSARA_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const authUrl = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${authUrl}/api/integrations/samsara/callback`;
}

export function getSamsaraConfig(): SamsaraAppConfig {
  const clientId = process.env.SAMSARA_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.SAMSARA_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = samsaraRedirectUri();
  const apiBase = (process.env.SAMSARA_API_BASE?.trim() || SAMSARA_API_BASE_DEFAULT).replace(
    /\/$/,
    "",
  );
  const missing: string[] = [];
  if (!clientId) missing.push("SAMSARA_CLIENT_ID");
  if (!clientSecret) missing.push("SAMSARA_CLIENT_SECRET");
  return {
    configured: missing.length === 0,
    clientId,
    clientSecret,
    redirectUri,
    apiBase,
    missing,
  };
}

export function isSamsaraConfigured(): boolean {
  return getSamsaraConfig().configured;
}

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

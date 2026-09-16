import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { isVercelRuntime } from "./config";

export type PersistedSamsara = {
  encryptedTokens: string;
  orgId: string;
  orgName: string;
  connectedAt: string | null;
  lastSyncAt: string | null;
};

function persistEnabled(): boolean {
  if (isVercelRuntime()) return false;
  if (process.env.NODE_TEST_CONTEXT) return false;
  return true;
}

export function samsaraPersistPath(): string {
  return process.env.SAMSARA_TOKEN_FILE?.trim() || path.join(process.cwd(), ".data", "samsara.json");
}

export function readPersistedSamsara(): PersistedSamsara | null {
  if (!persistEnabled()) return null;
  try {
    const raw = readFileSync(samsaraPersistPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedSamsara>;
    if (!parsed.encryptedTokens) return null;
    return {
      encryptedTokens: parsed.encryptedTokens,
      orgId: parsed.orgId ?? "",
      orgName: parsed.orgName ?? "",
      connectedAt: parsed.connectedAt ?? null,
      lastSyncAt: parsed.lastSyncAt ?? null,
    };
  } catch {
    return null;
  }
}

export function writePersistedSamsara(data: PersistedSamsara): void {
  if (!persistEnabled()) return;
  try {
    const file = samsaraPersistPath();
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
  } catch {
    // Local disk persist is best-effort; in-memory tokens still work for this process.
  }
}

export function clearPersistedSamsara(): void {
  if (!persistEnabled()) return;
  try {
    unlinkSync(samsaraPersistPath());
  } catch {
    // already gone
  }
}

export function samsaraPersistKind(): "memory" | "local-file" {
  return persistEnabled() ? "local-file" : "memory";
}

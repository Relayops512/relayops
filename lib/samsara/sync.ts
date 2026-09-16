import { store } from "../store";
import { friendlySamsaraError } from "./errors";
import { mapSamsaraPull } from "./map";
import { mergeSamsaraTrucks, resolveSamsaraMode, type SamsaraMergeMode } from "./merge";
import { decryptTokens, encryptTokens, refreshAccessToken } from "./oauth";
import { pullSamsaraFleet, SamsaraHttpError } from "./client";
import type { SamsaraTokens } from "./types";

const REFRESH_SKEW_MS = 60_000;

export type SamsaraSyncOutcome = {
  ok: boolean;
  message: string;
  created: number;
  updated: number;
  kept: number;
  vehicleCount: number;
};

async function freshTokens(): Promise<SamsaraTokens> {
  const blob = store.getEncryptedSamsaraTokens();
  if (!blob) {
    throw Object.assign(new Error("not_connected"), { code: "not_connected" });
  }
  let tokens: SamsaraTokens;
  try {
    tokens = decryptTokens(blob);
  } catch {
    throw Object.assign(new Error("decrypt"), { code: "decrypt" });
  }
  if (tokens.expiresAt - REFRESH_SKEW_MS > Date.now()) return tokens;
  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    store.setSamsaraTokens(encryptTokens(refreshed), { orgName: store.getIntegration().orgName });
    return refreshed;
  } catch (error) {
    const status = (error as { status?: number }).status;
    throw Object.assign(new Error("unauthorized"), { status: status ?? 401 });
  }
}

export async function runSamsaraSync(mode: SamsaraMergeMode = "merge"): Promise<SamsaraSyncOutcome> {
  try {
    const tokens = await freshTokens();
    const pull = await pullSamsaraFleet(tokens.accessToken);
    if (pull.vehicles.length === 0) {
      const message = "Samsara has no trucks to pull yet. CSV trucks were left as they are.";
      store.markSamsaraSynced({
        summary: message,
        error: null,
      });
      return { ok: true, message, created: 0, updated: 0, kept: store.listTrucks().length, vehicleCount: 0 };
    }
    const mapped = mapSamsaraPull(pull);
    const modeUsed = resolveSamsaraMode(mode, store.isDemoFleet());
    const merged = mergeSamsaraTrucks(store.listTrucks(), mapped, modeUsed);
    if (modeUsed === "replace") store.replaceTrucks(merged.trucks);
    else store.setTrucks(merged.trucks);

    const message =
      modeUsed === "replace"
        ? mode === "merge"
          ? `Replaced the sample fleet with ${merged.created} truck${merged.created === 1 ? "" : "s"} from Samsara.`
          : `Replaced the fleet with ${merged.created} truck${merged.created === 1 ? "" : "s"} from Samsara.`
        : merged.created + merged.updated === 0
          ? "Samsara sync finished. No truck changes."
          : `Updated ${merged.updated} and added ${merged.created} truck${merged.created === 1 ? "" : "s"} from Samsara.${
              merged.kept ? ` Kept ${merged.kept} CSV/manual truck${merged.kept === 1 ? "" : "s"}.` : ""
            }`;

    store.markSamsaraSynced({ summary: message, error: null });
    return {
      ok: true,
      message,
      created: merged.created,
      updated: merged.updated,
      kept: merged.kept,
      vehicleCount: pull.vehicles.length,
    };
  } catch (error) {
    const status = error instanceof SamsaraHttpError ? error.status : (error as { status?: number }).status;
    const code = (error as { code?: string }).code;
    const message = friendlySamsaraError({
      status,
      code,
      message: error instanceof Error ? error.message : String(error),
    });
    store.markSamsaraSynced({ summary: "", error: message });
    return { ok: false, message, created: 0, updated: 0, kept: 0, vehicleCount: 0 };
  }
}

const STALE_MS = 15 * 60 * 1000;

export async function maybeRefreshSamsara(): Promise<void> {
  if (!store.isSamsaraConnected()) return;
  const last = store.getIntegration().lastSyncAt;
  if (last && Date.now() - last.getTime() < STALE_MS) return;
  await runSamsaraSync("merge");
}

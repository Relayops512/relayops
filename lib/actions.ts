"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { store } from "@/lib/store";
import { rankTrucks } from "@/lib/matching";
import type { LoadPriority, TrailerType } from "@/lib/types";
import { CITIES } from "@/lib/cities";
import { setOnboardingCookie } from "@/lib/onboarding";

const trailerEnum = z.enum(["DRY_VAN", "REEFER", "FLATBED"]);
const priorityEnum = z.enum(["STANDARD", "HIGH"]);

async function requireDispatcher() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "DISPATCHER") {
    throw new Error("Viewer accounts are read-only.");
  }
  return session;
}

const loadSchema = z.object({
  customer: z.string().min(2),
  pickupCity: z.string().min(2),
  pickupState: z.string().min(2).max(2),
  pickupLat: z.coerce.number(),
  pickupLng: z.coerce.number(),
  pickupWindowStart: z.string(),
  pickupWindowEnd: z.string(),
  deliveryCity: z.string().min(2),
  deliveryState: z.string().min(2).max(2),
  deliveryLat: z.coerce.number(),
  deliveryLng: z.coerce.number(),
  deliveryWindowStart: z.string(),
  deliveryWindowEnd: z.string(),
  trailerType: trailerEnum,
  weightLbs: z.coerce.number().int().positive(),
  notes: z.string().optional().default(""),
  priority: priorityEnum.optional().default("STANDARD"),
});

function nextReference(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `RO-${n}`;
}

export async function createLoadAction(formData: FormData) {
  const session = await requireDispatcher();
  const parsed = loadSchema.parse({
    customer: formData.get("customer"),
    pickupCity: formData.get("pickupCity"),
    pickupState: String(formData.get("pickupState") ?? "").toUpperCase(),
    pickupLat: formData.get("pickupLat"),
    pickupLng: formData.get("pickupLng"),
    pickupWindowStart: formData.get("pickupWindowStart"),
    pickupWindowEnd: formData.get("pickupWindowEnd"),
    deliveryCity: formData.get("deliveryCity"),
    deliveryState: String(formData.get("deliveryState") ?? "").toUpperCase(),
    deliveryLat: formData.get("deliveryLat"),
    deliveryLng: formData.get("deliveryLng"),
    deliveryWindowStart: formData.get("deliveryWindowStart"),
    deliveryWindowEnd: formData.get("deliveryWindowEnd"),
    trailerType: formData.get("trailerType"),
    weightLbs: formData.get("weightLbs"),
    notes: formData.get("notes") ?? "",
    priority: formData.get("priority") || "STANDARD",
  });

  const load = store.createLoad({
    reference: nextReference(),
    customer: parsed.customer,
    pickupCity: parsed.pickupCity,
    pickupState: parsed.pickupState,
    pickupLat: parsed.pickupLat,
    pickupLng: parsed.pickupLng,
    pickupWindowStart: new Date(parsed.pickupWindowStart),
    pickupWindowEnd: new Date(parsed.pickupWindowEnd),
    deliveryCity: parsed.deliveryCity,
    deliveryState: parsed.deliveryState,
    deliveryLat: parsed.deliveryLat,
    deliveryLng: parsed.deliveryLng,
    deliveryWindowStart: new Date(parsed.deliveryWindowStart),
    deliveryWindowEnd: new Date(parsed.deliveryWindowEnd),
    trailerType: parsed.trailerType as TrailerType,
    weightLbs: parsed.weightLbs,
    notes: parsed.notes,
    priority: parsed.priority as LoadPriority,
  });

  store.addAudit({
    kind: "LOAD_CREATED",
    actorId: session.user.id,
    message: `${session.user.name} created ${load.reference} (${load.pickupCity} → ${load.deliveryCity}).`,
    metaJson: JSON.stringify({ loadId: load.id }),
  });

  revalidatePath("/board");
  revalidatePath("/loads/new");
  redirect(`/loads/${load.id}`);
}

export async function assignLoadAction(formData: FormData): Promise<{ error?: string }> {
  const session = await requireDispatcher();
  const loadId = String(formData.get("loadId") ?? "");
  const truckId = String(formData.get("truckId") ?? "");
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();
  const forceOverride = String(formData.get("isOverride") ?? "") === "true";

  const load = store.getLoad(loadId);
  const trucks = store.listTrucks();
  if (!load || load.status !== "OPEN") return { error: "Load is not open." };
  const truck = trucks.find((t) => t.id === truckId);
  if (!truck) return { error: "Truck not found." };

  const ranked = rankTrucks(load, trucks);
  const chosen = ranked.find((m) => m.truck.id === truckId);
  const top = ranked.find((m) => m.eligible) ?? ranked[0];
  const isOverride = forceOverride || !chosen?.eligible || (top && top.truck.id !== truckId);

  if (isOverride && overrideReason.length < 3) {
    return { error: "Add a short note for why this truck (a few words is enough)." };
  }

  store.assignLoad({
    loadId,
    truckId,
    assignedById: session.user.id,
    score: chosen?.score ?? 0,
    reasonsJson: JSON.stringify(chosen?.reasons ?? []),
    isOverride,
    overrideReason: isOverride ? overrideReason : null,
    topTruckId: top?.truck.id ?? null,
  });

  store.addAudit({
    kind: isOverride ? "OVERRIDE" : "ASSIGNMENT",
    actorId: session.user.id,
    message: isOverride
      ? `${session.user.name} assigned ${load.reference} to Truck ${truck.unitNumber} (${truck.driverName}) with a note: ${overrideReason}`
      : `${session.user.name} assigned ${load.reference} to Truck ${truck.unitNumber} (${truck.driverName}).`,
    metaJson: JSON.stringify({
      loadId,
      truckId,
      score: chosen?.score,
      isOverride,
      overrideReason,
    }),
  });

  revalidatePath("/board");
  revalidatePath("/fleet");
  revalidatePath("/audit");
  revalidatePath("/setup");
  revalidatePath(`/loads/${loadId}`);
  const returnTo = String(formData.get("returnTo") ?? "");
  redirect(returnTo === "board" ? "/board" : `/loads/${loadId}`);
}

export async function saveSamsaraSettingsAction(formData: FormData) {
  const session = await requireDispatcher();
  const enabled = formData.get("enabled") === "on";
  const demoMode = formData.get("demoMode") === "on";
  const orgId = String(formData.get("orgId") ?? "");
  const apiToken = String(formData.get("apiToken") ?? "");
  const existing = store.getIntegration();
  store.saveIntegration({
    enabled,
    demoMode,
    orgId,
    apiTokenHint: apiToken ? `••••${apiToken.slice(-4)}` : existing.apiTokenHint,
  });
  store.addAudit({
    kind: "SAMSARA_SYNC",
    actorId: session.user.id,
    message: `${session.user.name} updated Samsara connector settings (demo mode ${demoMode ? "on" : "off"}).`,
    metaJson: JSON.stringify({ enabled, demoMode, orgId }),
  });
  revalidatePath("/setup");
}

export async function syncSamsaraAction() {
  const session = await requireDispatcher();
  store.markSamsaraSynced();
  store.addAudit({
    kind: "SAMSARA_SYNC",
    actorId: session.user.id,
    message: `${session.user.name} ran a demo Samsara sync. Live API keys are not required for this pilot.`,
    metaJson: JSON.stringify({ demo: true }),
  });
  revalidatePath("/board");
  revalidatePath("/fleet");
  revalidatePath("/setup");
}

export type FleetImportState = {
  ok: boolean;
  mode: "replace" | "merge";
  imported: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
  message: string;
};

export async function importFleetCsvAction(
  _prev: FleetImportState | null,
  formData: FormData,
): Promise<FleetImportState> {
  const session = await requireDispatcher();
  const mode = formData.get("mode") === "merge" ? "merge" : "replace";
  const file = formData.get("file");
  const pasted = String(formData.get("csvText") ?? "");
  let text = pasted.trim();
  if (file instanceof File && file.size > 0) {
    if (file.size > 512 * 1024) {
      return {
        ok: false,
        mode,
        imported: 0,
        created: 0,
        updated: 0,
        errors: [{ row: 0, message: "File is larger than 512 KB." }],
        message: "Fleet was not changed.",
      };
    }
    text = (await file.text()).trim();
  }
  if (!text) {
    return {
      ok: false,
      mode,
      imported: 0,
      created: 0,
      updated: 0,
      errors: [{ row: 0, message: "Upload a CSV file or paste CSV text." }],
      message: "Fleet was not changed.",
    };
  }

  const { parseFleetCsv, parsedRowToTruck } = await import("@/lib/fleet-csv");
  const parsed = parseFleetCsv(text);
  if (parsed.rows.length === 0) {
    return {
      ok: false,
      mode,
      imported: 0,
      created: 0,
      updated: 0,
      errors: parsed.errors,
      message: "No valid rows — the live fleet was left unchanged.",
    };
  }

  const trucks = parsed.rows.map((row) => parsedRowToTruck(row));
  let created = trucks.length;
  let updated = 0;
  if (mode === "replace") {
    store.replaceTrucks(trucks);
  } else {
    const result = store.mergeTrucks(trucks);
    created = result.created;
    updated = result.updated;
  }

  store.addAudit({
    kind: "FLEET_IMPORT",
    actorId: session.user.id,
    message: `${session.user.name} ${mode === "replace" ? "replaced" : "merged"} the fleet from CSV (${trucks.length} valid truck${trucks.length === 1 ? "" : "s"}${parsed.errors.length ? `, ${parsed.errors.length} row error(s)` : ""}).`,
    metaJson: JSON.stringify({ mode, imported: trucks.length, errors: parsed.errors.length }),
  });

  revalidatePath("/fleet");
  revalidatePath("/board");
  revalidatePath("/audit");

  return {
    ok: true,
    mode,
    imported: trucks.length,
    created,
    updated,
    errors: parsed.errors,
    message:
      mode === "replace"
        ? `Replaced live fleet with ${trucks.length} truck${trucks.length === 1 ? "" : "s"}. Matching uses this set now.`
        : `Merged ${created} new and ${updated} updated truck${created + updated === 1 ? "" : "s"}. Matching uses the live fleet now.`,
  };
}

export type AddTruckState = {
  ok: boolean;
  message: string;
};

const addTruckSchema = z.object({
  unitNumber: z.string().trim().min(1).max(16),
  driverName: z.string().trim().min(2).max(80),
  cityKey: z.string().min(3),
  trailerType: trailerEnum,
});

export async function addTruckAction(
  _prev: AddTruckState | null,
  formData: FormData,
): Promise<AddTruckState> {
  await requireDispatcher();
  const parsed = addTruckSchema.safeParse({
    unitNumber: formData.get("unitNumber"),
    driverName: formData.get("driverName"),
    cityKey: formData.get("cityKey"),
    trailerType: formData.get("trailerType"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Add a truck number, driver, and city." };
  }
  const city = CITIES.find((c) => `${c.city}|${c.state}` === parsed.data.cityKey);
  if (!city) {
    return { ok: false, message: "Pick a city from the list." };
  }
  store.addTruck({
    id: `truck-${parsed.data.unitNumber}`,
    unitNumber: parsed.data.unitNumber,
    driverName: parsed.data.driverName,
    lat: city.lat,
    lng: city.lng,
    city: city.city,
    state: city.state,
    hosDriveMinutes: 480,
    hosDutyMinutes: 600,
    trailerType: parsed.data.trailerType,
    mpg: 7.2,
    readiness: "LEGAL_NOW",
    weeklyLoadCount: 0,
    fuelGallons: 80,
    lastPingAt: new Date(),
    locationKnown: true,
  });
  revalidatePath("/fleet");
  revalidatePath("/board");
  revalidatePath("/setup");
  return {
    ok: true,
    message: `Truck ${parsed.data.unitNumber} (${parsed.data.driverName}) is in the live pool.`,
  };
}

export async function createSampleLoadAction(): Promise<{ ok: boolean; loadId?: string; error?: string }> {
  const session = await requireDispatcher();
  const pickup = CITIES.find((c) => c.city === "Indianapolis") ?? CITIES[1];
  const drop = CITIES.find((c) => c.city === "Chicago") ?? CITIES[0];
  const load = store.createLoad({
    reference: nextReference(),
    customer: "Sample freight",
    pickupCity: pickup.city,
    pickupState: pickup.state,
    pickupLat: pickup.lat,
    pickupLng: pickup.lng,
    pickupWindowStart: new Date(Date.now() + 4 * 3600 * 1000),
    pickupWindowEnd: new Date(Date.now() + 12 * 3600 * 1000),
    deliveryCity: drop.city,
    deliveryState: drop.state,
    deliveryLat: drop.lat,
    deliveryLng: drop.lng,
    deliveryWindowStart: new Date(Date.now() + 18 * 3600 * 1000),
    deliveryWindowEnd: new Date(Date.now() + 28 * 3600 * 1000),
    trailerType: "DRY_VAN",
    weightLbs: 36500,
    notes: "Sample load to try covering.",
    priority: "STANDARD",
  });
  store.addAudit({
    kind: "LOAD_CREATED",
    actorId: session.user.id,
    message: `${session.user.name} added a sample load ${load.reference}.`,
    metaJson: JSON.stringify({ loadId: load.id, sample: true }),
  });
  revalidatePath("/board");
  revalidatePath("/loads/new");
  revalidatePath("/", "layout");
  return { ok: true, loadId: load.id };
}

export async function saveFairnessSettingsAction(formData: FormData) {
  await requireDispatcher();
  const enabled = formData.get("fairnessToolsEnabled") === "on";
  store.setFairnessToolsEnabled(enabled);
  revalidatePath("/setup");
  revalidatePath("/audit");
  revalidatePath("/board");
  revalidatePath("/fleet");
}

export async function completeOnboardingAction() {
  const session = await requireDispatcher();
  store.markOnboarded(session.user.id);
  await setOnboardingCookie();
  revalidatePath("/board");
  revalidatePath("/setup");
  revalidatePath("/", "layout");
}

export async function skipOnboardingAction() {
  const session = await requireDispatcher();
  store.markOnboarded(session.user.id);
  await setOnboardingCookie();
  revalidatePath("/board");
  revalidatePath("/", "layout");
}

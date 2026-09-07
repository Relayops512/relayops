"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";
import { auth, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rankTrucks } from "@/lib/matching";
import { TrailerType, LoadPriority, type Prisma } from "@prisma/client";

const trailerEnum = z.nativeEnum(TrailerType);

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/board");
  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect("/login?error=1");
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

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
  priority: z.nativeEnum(LoadPriority).optional().default("STANDARD"),
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

  const load = await prisma.load.create({
    data: {
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
      trailerType: parsed.trailerType,
      weightLbs: parsed.weightLbs,
      notes: parsed.notes,
      priority: parsed.priority,
      source: "manual",
      status: "OPEN",
    },
  });

  await prisma.auditEvent.create({
    data: {
      kind: "LOAD_CREATED",
      actorId: session.user.id,
      message: `${session.user.name} created ${load.reference} (${load.pickupCity} → ${load.deliveryCity}).`,
      metaJson: JSON.stringify({ loadId: load.id }),
    },
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

  const [load, trucks] = await Promise.all([
    prisma.load.findUnique({ where: { id: loadId } }),
    prisma.truck.findMany(),
  ]);
  if (!load || load.status !== "OPEN") return { error: "Load is not open." };
  const truck = trucks.find((t) => t.id === truckId);
  if (!truck) return { error: "Truck not found." };

  const ranked = rankTrucks(load, trucks);
  const chosen = ranked.find((m) => m.truck.id === truckId);
  const top = ranked.find((m) => m.eligible) ?? ranked[0];
  const isOverride = forceOverride || !chosen?.eligible || (top && top.truck.id !== truckId);

  if (isOverride && overrideReason.length < 8) {
    return { error: "Override requires a reason (at least 8 characters)." };
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.load.update({
      where: { id: loadId },
      data: { status: "ASSIGNED" },
    });
    await tx.assignment.create({
      data: {
        loadId,
        truckId,
        assignedById: session.user.id,
        score: chosen?.score ?? 0,
        reasonsJson: JSON.stringify(chosen?.reasons ?? []),
        isOverride,
        overrideReason: isOverride ? overrideReason : null,
        topTruckId: top?.truck.id,
      },
    });
    await tx.truck.update({
      where: { id: truckId },
      data: {
        weeklyLoadCount: { increment: 1 },
        readiness: "ON_LOAD",
      },
    });
    await tx.auditEvent.create({
      data: {
        kind: isOverride ? "OVERRIDE" : "ASSIGNMENT",
        actorId: session.user.id,
        message: isOverride
          ? `${session.user.name} overrode the recommended truck for ${load.reference} → Truck ${truck.unitNumber} (${truck.driverName}). Reason: ${overrideReason}`
          : `${session.user.name} assigned ${load.reference} to Truck ${truck.unitNumber} (${truck.driverName}) at score ${chosen?.score ?? 0}.`,
        metaJson: JSON.stringify({
          loadId,
          truckId,
          score: chosen?.score,
          isOverride,
          overrideReason,
        }),
      },
    });
  });

  revalidatePath("/board");
  revalidatePath("/fleet");
  revalidatePath("/audit");
  revalidatePath(`/loads/${loadId}`);
  redirect(`/loads/${loadId}`);
}

export async function saveSamsaraSettingsAction(formData: FormData) {
  const session = await requireDispatcher();
  const enabled = formData.get("enabled") === "on";
  const demoMode = formData.get("demoMode") === "on";
  const orgId = String(formData.get("orgId") ?? "");
  const apiToken = String(formData.get("apiToken") ?? "");
  const existing = await prisma.integrationSetting.findUnique({ where: { id: "samsara" } });
  await prisma.integrationSetting.upsert({
    where: { id: "samsara" },
    update: {
      enabled,
      demoMode,
      orgId,
      apiTokenHint: apiToken ? `••••${apiToken.slice(-4)}` : existing?.apiTokenHint ?? "",
      notes: "Pilot uses seeded demo fleet. Live Samsara pull is stubbed.",
    },
    create: {
      id: "samsara",
      provider: "samsara",
      enabled,
      demoMode,
      orgId,
      apiTokenHint: apiToken ? `••••${apiToken.slice(-4)}` : "",
      notes: "Pilot uses seeded demo fleet. Live Samsara pull is stubbed.",
    },
  });
  await prisma.auditEvent.create({
    data: {
      kind: "SAMSARA_SYNC",
      actorId: session.user.id,
      message: `${session.user.name} updated Samsara connector settings (demo mode ${demoMode ? "on" : "off"}).`,
      metaJson: JSON.stringify({ enabled, demoMode, orgId }),
    },
  });
  revalidatePath("/setup");
}

export async function syncSamsaraAction() {
  const session = await requireDispatcher();
  await prisma.integrationSetting.upsert({
    where: { id: "samsara" },
    update: { lastSyncAt: new Date(), demoMode: true },
    create: {
      id: "samsara",
      provider: "samsara",
      demoMode: true,
      lastSyncAt: new Date(),
      notes: "Demo sync — fleet positions refreshed from seed snapshot.",
    },
  });
  await prisma.auditEvent.create({
    data: {
      kind: "SAMSARA_SYNC",
      actorId: session.user.id,
      message: `${session.user.name} ran a demo Samsara sync. Live API keys are not required for this pilot.`,
      metaJson: JSON.stringify({ demo: true }),
    },
  });
  revalidatePath("/board");
  revalidatePath("/fleet");
  revalidatePath("/setup");
}

import type { Truck } from "../types";
import { HAZMAT_NONE } from "../equipment";
import type { MappedSamsaraTruck } from "./map";

export type SamsaraMergeMode = "merge" | "replace";

export function resolveSamsaraMode(requested: SamsaraMergeMode, fleetIsDemo: boolean): SamsaraMergeMode {
  if (requested === "replace" || fleetIsDemo) return "replace";
  return "merge";
}

export type SamsaraMergeResult = {
  trucks: Truck[];
  created: number;
  updated: number;
  kept: number;
};

function findMatchIndex(trucks: Truck[], incoming: Truck): number {
  if (incoming.samsaraVehicleId) {
    const byId = trucks.findIndex((t) => t.samsaraVehicleId === incoming.samsaraVehicleId);
    if (byId >= 0) return byId;
  }
  return trucks.findIndex((t) => t.unitNumber.toLowerCase() === incoming.unitNumber.toLowerCase());
}

export function applySamsaraTruck(existing: Truck | undefined, mapped: MappedSamsaraTruck): Truck {
  const incoming = mapped.truck;
  if (!existing) return incoming;

  const locationKnown = mapped.truck.locationKnown || existing.locationKnown;
  const lat = mapped.truck.locationKnown ? incoming.lat : existing.lat;
  const lng = mapped.truck.locationKnown ? incoming.lng : existing.lng;
  const city = mapped.truck.locationKnown ? incoming.city : existing.city;
  const state = mapped.truck.locationKnown ? incoming.state : existing.state;
  const hosDriveMinutes = mapped.hosKnown ? incoming.hosDriveMinutes : existing.hosDriveMinutes;
  const hosDutyMinutes = mapped.hosKnown ? incoming.hosDutyMinutes : existing.hosDutyMinutes;
  const trailerType = mapped.trailerInferred ? incoming.trailerType : existing.trailerType;
  const readiness =
    existing.readiness === "ON_LOAD" && incoming.readiness !== "HOS_BLOCKED"
      ? "ON_LOAD"
      : incoming.readiness === "HOS_BLOCKED"
        ? "HOS_BLOCKED"
        : existing.readiness === "MAINTENANCE"
          ? "MAINTENANCE"
          : incoming.readiness;

  return {
    ...incoming,
    id: existing.id,
    lat,
    lng,
    city,
    state,
    locationKnown,
    hosDriveMinutes,
    hosDutyMinutes,
    trailerType,
    hazmat: existing.hazmat && existing.hazmat !== HAZMAT_NONE ? existing.hazmat : incoming.hazmat || HAZMAT_NONE,
    mpg: existing.mpg,
    weeklyLoadCount: existing.weeklyLoadCount,
    fuelGallons: existing.fuelGallons,
    readiness,
    source: "samsara",
    samsaraVehicleId: incoming.samsaraVehicleId ?? existing.samsaraVehicleId,
  };
}

export function mergeSamsaraTrucks(
  existing: Truck[],
  mapped: MappedSamsaraTruck[],
  mode: SamsaraMergeMode,
): SamsaraMergeResult {
  if (mode === "replace") {
    const trucks = mapped.map((row) => applySamsaraTruck(undefined, row));
    return { trucks, created: trucks.length, updated: 0, kept: 0 };
  }

  const trucks = [...existing];
  let created = 0;
  let updated = 0;
  for (const row of mapped) {
    const idx = findMatchIndex(trucks, row.truck);
    if (idx >= 0) {
      trucks[idx] = applySamsaraTruck(trucks[idx], row);
      updated += 1;
    } else {
      trucks.push(applySamsaraTruck(undefined, row));
      created += 1;
    }
  }
  return { trucks, created, updated, kept: trucks.length - created - updated };
}

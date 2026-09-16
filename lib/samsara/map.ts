import type { TrailerType, Truck, TruckReadiness } from "../types";
import type {
  SamsaraAssignment,
  SamsaraDriver,
  SamsaraGpsStat,
  SamsaraHosClock,
  SamsaraPull,
  SamsaraVehicle,
} from "./types";

export type MappedSamsaraTruck = {
  truck: Truck;
  trailerInferred: boolean;
  hosKnown: boolean;
};

export function unitNumberFromVehicle(vehicle: {
  id: string;
  name?: string | null;
  licensePlate?: string | null;
}): string {
  const name = (vehicle.name ?? "").trim();
  if (name) {
    const truckMatch = name.match(/(?:truck|unit|tractor|pwr)\s*#?\s*([A-Z0-9-]+)/i);
    if (truckMatch?.[1]) return truckMatch[1].slice(0, 16);
    const hashMatch = name.match(/#\s*([A-Z0-9-]+)/i);
    if (hashMatch?.[1]) return hashMatch[1].slice(0, 16);
    if (/^[A-Z0-9-]{1,16}$/i.test(name)) return name;
    const lead = name.match(/^([A-Z0-9-]{1,16})\b/i);
    if (lead?.[1] && /\d/.test(lead[1])) return lead[1];
  }
  const plate = (vehicle.licensePlate ?? "").trim();
  if (plate) return plate.slice(0, 16);
  const id = String(vehicle.id);
  return `S${id.slice(-6)}`;
}

export function parseReverseGeo(formatted?: string | null): { city: string; state: string } | null {
  if (!formatted?.trim()) return null;
  const parts = formatted
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return { city: parts[0], state: "—" };

  let last = parts[parts.length - 1] ?? "";
  if (/^\d{5}(-\d{4})?$/.test(last)) {
    parts.pop();
    last = parts[parts.length - 1] ?? "";
  }
  const stateZip = last.match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
  if (stateZip?.[1] && parts.length >= 2) {
    return { city: parts[parts.length - 2] ?? "GPS", state: stateZip[1].toUpperCase() };
  }
  if (parts.length >= 2) {
    const city = parts[parts.length - 2] ?? "GPS";
    const state = last.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "—";
    return { city, state };
  }
  return { city: formatted.trim(), state: "—" };
}

export function trailerFromAttributes(
  attributes?: Array<{ name?: string | null; stringValues?: string[] | null }> | null,
): TrailerType | null {
  if (!attributes?.length) return null;
  const blob = attributes
    .flatMap((attr) => [attr.name ?? "", ...(attr.stringValues ?? [])])
    .join(" ")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (/(reefer|refrigerat)/.test(blob)) return "REEFER";
  if (/(flatbed|flat_bed|\bflat\b)/.test(blob)) return "FLATBED";
  if (/(dry_van|dryvan|\bvan\b|dryvan|dry_van)/.test(blob) || /\bdry\b/.test(blob)) return "DRY_VAN";
  return null;
}

function msToMinutes(ms?: number | null): number | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 60000);
}

function readinessFromHos(driveMinutes: number | null): TruckReadiness {
  if (driveMinutes != null && driveMinutes < 60) return "HOS_BLOCKED";
  return "LEGAL_NOW";
}

export function mapSamsaraPull(pull: SamsaraPull, now = new Date()): MappedSamsaraTruck[] {
  const drivers = new Map<string, string>();
  for (const d of pull.drivers) {
    if (d.id && d.name) drivers.set(String(d.id), d.name);
  }

  const gpsByVehicle = new Map<string, SamsaraGpsStat>();
  for (const stat of pull.stats) {
    if (stat.id) gpsByVehicle.set(String(stat.id), stat);
  }

  const clocksByVehicle = new Map<string, SamsaraHosClock>();
  const clocksByDriver = new Map<string, SamsaraHosClock>();
  for (const clock of pull.clocks) {
    if (clock.currentVehicle?.id) clocksByVehicle.set(String(clock.currentVehicle.id), clock);
    if (clock.driver?.id) clocksByDriver.set(String(clock.driver.id), clock);
    if (clock.driver?.id && clock.driver.name) {
      drivers.set(String(clock.driver.id), clock.driver.name);
    }
  }

  const assignmentByVehicle = new Map<string, SamsaraAssignment>();
  for (const row of pull.assignments) {
    const vehicleId = row.vehicle?.id;
    if (!vehicleId) continue;
    if (row.endTime) {
      const end = Date.parse(row.endTime);
      if (Number.isFinite(end) && end < now.getTime()) continue;
    }
    assignmentByVehicle.set(String(vehicleId), row);
    if (row.driver?.id && row.driver.name) {
      drivers.set(String(row.driver.id), row.driver.name);
    }
  }

  return pull.vehicles.map((vehicle) =>
    mapOneVehicle(vehicle, {
      drivers,
      gpsByVehicle,
      clocksByVehicle,
      clocksByDriver,
      assignmentByVehicle,
      now,
    }),
  );
}

function mapOneVehicle(
  vehicle: SamsaraVehicle,
  ctx: {
    drivers: Map<string, string>;
    gpsByVehicle: Map<string, SamsaraGpsStat>;
    clocksByVehicle: Map<string, SamsaraHosClock>;
    clocksByDriver: Map<string, SamsaraHosClock>;
    assignmentByVehicle: Map<string, SamsaraAssignment>;
    now: Date;
  },
): MappedSamsaraTruck {
  const vehicleId = String(vehicle.id);
  const unitNumber = unitNumberFromVehicle(vehicle);
  const assignment = ctx.assignmentByVehicle.get(vehicleId);
  const gps = ctx.gpsByVehicle.get(vehicleId)?.gps;

  let driverId =
    assignment?.driver?.id ??
    vehicle.staticAssignedDriver?.id ??
    null;
  let driverName =
    assignment?.driver?.name ??
    vehicle.staticAssignedDriver?.name ??
    (driverId ? ctx.drivers.get(String(driverId)) : undefined) ??
    "";

  let clock = ctx.clocksByVehicle.get(vehicleId) ?? null;
  if (!clock && driverId) clock = ctx.clocksByDriver.get(String(driverId)) ?? null;
  if (!driverName && clock?.driver?.name) driverName = clock.driver.name;
  if (!driverId && clock?.driver?.id) driverId = clock.driver.id;
  if (!driverName) driverName = "Unassigned";

  const drive = msToMinutes(clock?.clocks?.drive?.driveRemainingDurationMs);
  const duty = msToMinutes(clock?.clocks?.shift?.shiftRemainingDurationMs);
  const hosKnown = drive != null || duty != null;

  const lat = gps?.latitude;
  const lng = gps?.longitude;
  const locationKnown =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const geo = parseReverseGeo(gps?.reverseGeo?.formattedLocation);
  const ping = gps?.time ? new Date(gps.time) : ctx.now;

  const trailer = trailerFromAttributes(vehicle.attributes);

  const truck: Truck = {
    id: `truck-samsara-${vehicleId}`,
    unitNumber,
    driverName,
    lat: locationKnown ? lat! : 0,
    lng: locationKnown ? lng! : 0,
    city: geo?.city ?? (locationKnown ? "GPS" : "Unknown"),
    state: geo?.state ?? (locationKnown ? "—" : "—"),
    hosDriveMinutes: drive ?? 480,
    hosDutyMinutes: duty ?? 600,
    trailerType: trailer ?? "DRY_VAN",
    mpg: 7,
    readiness: readinessFromHos(drive),
    weeklyLoadCount: 0,
    fuelGallons: 80,
    lastPingAt: Number.isFinite(ping.getTime()) ? ping : ctx.now,
    locationKnown,
    source: "samsara",
    samsaraVehicleId: vehicleId,
  };

  return { truck, trailerInferred: trailer != null, hosKnown };
}

export function mapDrivers(drivers: SamsaraDriver[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const d of drivers) {
    if (d.id && d.name) out.set(String(d.id), d.name);
  }
  return out;
}

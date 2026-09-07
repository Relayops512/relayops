import { TrailerType, TruckReadiness } from "@prisma/client";
import { CRUISE_MPH, haversineMiles, hoursForMiles } from "./geo";

export type MatchLoad = {
  pickupLat: number;
  pickupLng: number;
  pickupWindowStart: Date;
  pickupWindowEnd: Date;
  deliveryLat: number;
  deliveryLng: number;
  trailerType: TrailerType;
  weightLbs: number;
};

export type MatchTruck = {
  id: string;
  unitNumber: string;
  driverName: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  hosDriveMinutes: number;
  hosDutyMinutes: number;
  trailerType: TrailerType;
  mpg: number;
  readiness: TruckReadiness;
  weeklyLoadCount: number;
  fuelGallons: number;
};

export type ScoreBreakdown = {
  hos: number;
  deadhead: number;
  fuel: number;
  eta: number;
  trailer: number;
  fairness: number;
};

export type ReasonChip = {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
};

export type TruckMatch = {
  truck: MatchTruck;
  score: number;
  breakdown: ScoreBreakdown;
  deadheadMiles: number;
  loadedMiles: number;
  fuelGallons: number;
  fuelCostUsd: number;
  etaMinutes: number;
  arrivesInWindow: boolean;
  hosEnough: boolean;
  trailerFit: "exact" | "mismatch";
  legalNow: boolean;
  eligible: boolean;
  reasons: ReasonChip[];
};

export const WEIGHTS: ScoreBreakdown = {
  hos: 0.22,
  deadhead: 0.25,
  fuel: 0.12,
  eta: 0.18,
  trailer: 0.13,
  fairness: 0.1,
};

const DIESEL_USD = 3.85;

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function deadheadScore(miles: number): number {
  // 0 miles = 100, ~250 miles = 0
  return clamp(100 - (miles / 250) * 100);
}

function hosScore(driveMin: number, dutyMin: number, neededHours: number): number {
  const neededMin = neededHours * 60;
  if (driveMin < neededMin * 0.55 || dutyMin < neededMin * 0.65) {
    return clamp((driveMin / Math.max(neededMin, 1)) * 55);
  }
  const driveHeadroom = driveMin - neededMin;
  return clamp(55 + (driveHeadroom / 180) * 45);
}

function fuelScore(gallons: number): number {
  // 20 gal deadhead+loaded mix is excellent; 90+ is poor
  return clamp(100 - ((gallons - 18) / 72) * 100);
}

function etaScore(arrivesInWindow: boolean, minutesEarlyOrLate: number): number {
  if (arrivesInWindow) {
    return clamp(78 + Math.max(0, 22 - Math.abs(minutesEarlyOrLate) / 20));
  }
  const late = Math.max(0, minutesEarlyOrLate);
  return clamp(55 - late / 8);
}

function trailerScore(fit: "exact" | "mismatch"): number {
  return fit === "exact" ? 100 : 0;
}

function fairnessScore(weekly: number, fleetAvg: number): number {
  const delta = fleetAvg - weekly;
  return clamp(50 + delta * 12);
}

export function scoreTruck(
  load: MatchLoad,
  truck: MatchTruck,
  fleetAvgWeekly: number,
  now = new Date(),
): TruckMatch {
  const deadheadMiles = haversineMiles(
    { lat: truck.lat, lng: truck.lng },
    { lat: load.pickupLat, lng: load.pickupLng },
  );
  const loadedMiles = haversineMiles(
    { lat: load.pickupLat, lng: load.pickupLng },
    { lat: load.deliveryLat, lng: load.deliveryLng },
  );
  const totalMiles = deadheadMiles + loadedMiles;
  const fuelGallons = totalMiles / Math.max(truck.mpg, 4);
  const fuelCostUsd = fuelGallons * DIESEL_USD;

  const deadheadHours = hoursForMiles(deadheadMiles);
  const etaDate = new Date(now.getTime() + deadheadHours * 3600 * 1000);
  const windowStart = load.pickupWindowStart;
  const windowEnd = load.pickupWindowEnd;
  const arrivesInWindow = etaDate >= new Date(windowStart.getTime() - 30 * 60 * 1000) && etaDate <= windowEnd;
  const minutesVsStart = (etaDate.getTime() - windowStart.getTime()) / 60000;
  const minutesVsEnd = (etaDate.getTime() - windowEnd.getTime()) / 60000;
  const minutesEarlyOrLate = arrivesInWindow ? minutesVsStart : minutesVsEnd;

  const neededHours = hoursForMiles(totalMiles) + 1.25;
  const hosEnough =
    truck.hosDriveMinutes / 60 >= hoursForMiles(totalMiles) * 0.85 &&
    truck.hosDutyMinutes / 60 >= neededHours * 0.75;

  const trailerFit: "exact" | "mismatch" =
    truck.trailerType === load.trailerType ? "exact" : "mismatch";

  const legalNow = truck.readiness === "LEGAL_NOW";
  const eligible = legalNow && trailerFit === "exact" && hosEnough;

  const breakdown: ScoreBreakdown = {
    hos: hosScore(truck.hosDriveMinutes, truck.hosDutyMinutes, neededHours),
    deadhead: deadheadScore(deadheadMiles),
    fuel: fuelScore(fuelGallons),
    eta: etaScore(arrivesInWindow, minutesEarlyOrLate),
    trailer: trailerScore(trailerFit),
    fairness: fairnessScore(truck.weeklyLoadCount, fleetAvgWeekly),
  };

  let score =
    breakdown.hos * WEIGHTS.hos +
    breakdown.deadhead * WEIGHTS.deadhead +
    breakdown.fuel * WEIGHTS.fuel +
    breakdown.eta * WEIGHTS.eta +
    breakdown.trailer * WEIGHTS.trailer +
    breakdown.fairness * WEIGHTS.fairness;

  if (!legalNow) score *= 0.35;
  if (trailerFit === "mismatch") score *= 0.45;
  if (!hosEnough) score *= 0.55;
  score = clamp(score);

  const reasons: ReasonChip[] = [];
  if (legalNow) reasons.push({ label: "Legal now", tone: "good" });
  else if (truck.readiness === "HOS_BLOCKED") reasons.push({ label: "HOS blocked", tone: "bad" });
  else if (truck.readiness === "ON_LOAD") reasons.push({ label: "On load", tone: "warn" });
  else reasons.push({ label: "Maintenance", tone: "bad" });

  reasons.push({
    label: `${Math.round(deadheadMiles)} mi deadhead`,
    tone: deadheadMiles < 45 ? "good" : deadheadMiles < 120 ? "neutral" : "warn",
  });
  reasons.push({
    label: hosEnough ? `${formatDrive(truck.hosDriveMinutes)} drive left` : "HOS short for trip",
    tone: hosEnough ? "good" : "bad",
  });
  reasons.push({
    label: trailerFit === "exact" ? trailerLabel(truck.trailerType) : `Needs ${trailerLabel(load.trailerType)}`,
    tone: trailerFit === "exact" ? "neutral" : "bad",
  });
  reasons.push({
    label: arrivesInWindow ? "Makes pickup window" : "Misses pickup window",
    tone: arrivesInWindow ? "good" : "warn",
  });
  reasons.push({
    label: `~$${fuelCostUsd.toFixed(0)} fuel`,
    tone: fuelCostUsd < 180 ? "good" : fuelCostUsd < 320 ? "neutral" : "warn",
  });
  if (truck.weeklyLoadCount <= fleetAvgWeekly - 1) {
    reasons.push({ label: "Below weekly average", tone: "good" });
  } else if (truck.weeklyLoadCount >= fleetAvgWeekly + 2) {
    reasons.push({ label: "Heavy week — fairness", tone: "warn" });
  }

  return {
    truck,
    score: Math.round(score * 10) / 10,
    breakdown,
    deadheadMiles,
    loadedMiles,
    fuelGallons,
    fuelCostUsd,
    etaMinutes: deadheadHours * 60,
    arrivesInWindow,
    hosEnough,
    trailerFit,
    legalNow,
    eligible,
    reasons,
  };
}

function formatDrive(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function trailerLabel(type: TrailerType): string {
  switch (type) {
    case "DRY_VAN":
      return "Dry van";
    case "REEFER":
      return "Reefer";
    case "FLATBED":
      return "Flatbed";
  }
}

export function rankTrucks(load: MatchLoad, trucks: MatchTruck[], now = new Date()): TruckMatch[] {
  const fleetAvg =
    trucks.length === 0
      ? 0
      : trucks.reduce((sum, t) => sum + t.weeklyLoadCount, 0) / trucks.length;
  return trucks
    .map((truck) => scoreTruck(load, truck, fleetAvg, now))
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.score - a.score;
    });
}

export function estimateDeadhead(truck: MatchTruck, load: MatchLoad): number {
  return haversineMiles(
    { lat: truck.lat, lng: truck.lng },
    { lat: load.pickupLat, lng: load.pickupLng },
  );
}

export { CRUISE_MPH };

import { cityState, formatWindow, needsCoverSoon, relativePickup } from "./format";
import { matchWhyLine, rankTrucks, trailerLabel, type TruckMatch } from "./matching";
import type { Load } from "./types";

export type TodayOption = {
  truckId: string;
  unitNumber: string;
  driverName: string;
  city: string;
  state: string;
  why: string;
  eligible: boolean;
  isBest: boolean;
};

export type TodayLoadItem = {
  id: string;
  reference: string;
  customer: string;
  pickupCity: string;
  pickupState: string;
  deliveryCity: string;
  deliveryState: string;
  lane: string;
  appointment: string;
  relative: string;
  priority: Load["priority"];
  trailer: string;
  needCover: boolean;
  best: TodayOption | null;
  options: TodayOption[];
};

function toOption(match: TruckMatch, isBest: boolean): TodayOption {
  return {
    truckId: match.truck.id,
    unitNumber: match.truck.unitNumber,
    driverName: match.truck.driverName,
    city: match.truck.city,
    state: match.truck.state,
    why: matchWhyLine(match),
    eligible: match.eligible,
    isBest,
  };
}

export function buildTodayItem(
  load: Load,
  trucks: Parameters<typeof rankTrucks>[1],
  now = new Date(),
): TodayLoadItem {
  const matches = rankTrucks(load, trucks, now);
  const bestMatch = matches.find((m) => m.eligible) ?? null;
  const options = matches.slice(0, 8).map((m) => toOption(m, bestMatch?.truck.id === m.truck.id));
  return {
    id: load.id,
    reference: load.reference,
    customer: load.customer,
    pickupCity: load.pickupCity,
    pickupState: load.pickupState,
    deliveryCity: load.deliveryCity,
    deliveryState: load.deliveryState,
    lane: `${cityState(load.pickupCity, load.pickupState)} → ${cityState(load.deliveryCity, load.deliveryState)}`,
    appointment: formatWindow(load.pickupWindowStart, load.pickupWindowEnd),
    relative: relativePickup(load.pickupWindowStart, now),
    priority: load.priority,
    trailer: trailerLabel(load.trailerType),
    needCover: load.priority === "HIGH" || needsCoverSoon(load.pickupWindowStart, now),
    best: bestMatch ? toOption(bestMatch, true) : null,
    options,
  };
}

export type Coord = { lat: number; lng: number };

const EARTH_MI = 3958.8;

export function haversineMiles(a: Coord, b: Coord): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Average loaded-highway speed used for ETA / HOS burn. */
export const CRUISE_MPH = 55;

export function hoursForMiles(miles: number): number {
  return miles / CRUISE_MPH;
}

export function formatMiles(miles: number): string {
  if (!Number.isFinite(miles)) return "—";
  return `${Math.round(miles)} mi`;
}

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return "—";
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatMinutes(minutes: number): string {
  return formatHours(minutes / 60);
}

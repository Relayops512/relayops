import type { TrailerType, Truck, TruckReadiness } from "./types";

export type CsvRowError = { row: number; message: string };

export type ParsedFleetRow = {
  unitNumber: string;
  driverName: string;
  trailerType: TrailerType;
  lat: number;
  lng: number;
  city: string;
  state: string;
  hosDriveMinutes: number;
  hosDutyMinutes: number;
  mpg: number;
  readiness: TruckReadiness;
  weeklyLoadCount: number;
  locationKnown: boolean;
};

export type ParseFleetResult = {
  rows: ParsedFleetRow[];
  errors: CsvRowError[];
};

export const FLEET_CSV_TEMPLATE = `truckNumber,driverName,trailerType,lat,lng,hosDriveMinutesRemaining,hosDutyMinutesRemaining,mpg,status,weeklyLoadCount
184,Marcus Hill,dry_van,39.7684,-86.1581,525,605,7.6,available,2
191,Elena Ruiz,dry_van,38.2527,-85.7585,480,590,7.2,available,1
203,Priya Shah,reefer,,,390,510,6.9,available,0
158,Owen Blake,flatbed,38.627,-90.1994,540,640,6.4,unavailable,3
`;

const HEADER_ALIASES: Record<string, keyof ParsedFleetRow | "status"> = {
  trucknumber: "unitNumber",
  truck_number: "unitNumber",
  unit: "unitNumber",
  unitnumber: "unitNumber",
  unit_number: "unitNumber",
  truck: "unitNumber",
  truckno: "unitNumber",
  truckid: "unitNumber",
  drivername: "driverName",
  driver_name: "driverName",
  driver: "driverName",
  name: "driverName",
  trailertype: "trailerType",
  trailer_type: "trailerType",
  trailer: "trailerType",
  equipment: "trailerType",
  lat: "lat",
  latitude: "lat",
  lng: "lng",
  lon: "lng",
  long: "lng",
  longitude: "lng",
  city: "city",
  state: "state",
  hosdriveminutesremaining: "hosDriveMinutes",
  hos_drive_minutes_remaining: "hosDriveMinutes",
  hos_drive_minutes: "hosDriveMinutes",
  driveminutes: "hosDriveMinutes",
  driveleft: "hosDriveMinutes",
  drive_left: "hosDriveMinutes",
  hosdrive: "hosDriveMinutes",
  hosdutyminutesremaining: "hosDutyMinutes",
  hos_duty_minutes_remaining: "hosDutyMinutes",
  hos_duty_minutes: "hosDutyMinutes",
  dutyminutes: "hosDutyMinutes",
  dutyleft: "hosDutyMinutes",
  duty_left: "hosDutyMinutes",
  hosduty: "hosDutyMinutes",
  mpg: "mpg",
  fuelefficiency: "mpg",
  fuel_efficiency: "mpg",
  fuelmpg: "mpg",
  status: "status",
  readiness: "status",
  available: "status",
  weeklyloadcount: "weeklyLoadCount",
  weekly_load_count: "weeklyLoadCount",
  loads: "weeklyLoadCount",
  loadcount: "weeklyLoadCount",
  weeklyloads: "weeklyLoadCount",
};

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseTrailer(value: string): TrailerType | null {
  const v = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!v) return null;
  if (["dry_van", "dryvan", "van", "dry"].includes(v)) return "DRY_VAN";
  if (["reefer", "refrigerated", "refigerated"].includes(v)) return "REEFER";
  if (["flatbed", "flat_bed", "flat"].includes(v)) return "FLATBED";
  if (v === "dry_van" || v === "reefer" || v === "flatbed") return v.toUpperCase() as TrailerType;
  return null;
}

function parseReadiness(value: string): TruckReadiness | null {
  const v = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!v) return null;
  if (["available", "legal", "legal_now", "ready", "yes", "true", "1"].includes(v)) return "LEGAL_NOW";
  if (["unavailable", "not_available", "no", "false", "0"].includes(v)) return "MAINTENANCE";
  if (["hos", "hos_blocked", "blocked"].includes(v)) return "HOS_BLOCKED";
  if (["on_load", "onload", "assigned"].includes(v)) return "ON_LOAD";
  if (["maintenance", "shop", "down"].includes(v)) return "MAINTENANCE";
  return null;
}

function parseNumber(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseFleetCsv(text: string): ParseFleetResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0 && !l.trim().startsWith("#"));

  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "File is empty." }] };
  }

  const headerCells = parseCsvLine(lines[0]);
  const columns = headerCells.map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? null);
  const hasTruck = columns.includes("unitNumber");
  const hasDriver = columns.includes("driverName");
  if (!hasTruck || !hasDriver) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: "Missing required columns. Need truckNumber and driverName (aliases like unit, driver are OK).",
        },
      ],
    };
  }

  const rows: ParsedFleetRow[] = [];
  const errors: CsvRowError[] = [];
  const seen = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const excelRow = i + 1;
    const cells = parseCsvLine(lines[i]);
    const get = (key: keyof ParsedFleetRow | "status"): string => {
      const idx = columns.findIndex((c) => c === key);
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };

    const unitNumber = get("unitNumber");
    const driverName = get("driverName");
    const rowErrors: string[] = [];
    if (!unitNumber) rowErrors.push("truckNumber is required");
    if (!driverName) rowErrors.push("driverName is required");

    const trailerRaw = get("trailerType");
    let trailerType: TrailerType = "DRY_VAN";
    if (trailerRaw) {
      const parsed = parseTrailer(trailerRaw);
      if (!parsed) rowErrors.push(`Unknown trailerType "${trailerRaw}" (use dry_van, reefer, or flatbed)`);
      else trailerType = parsed;
    }

    const lat = parseNumber(get("lat"));
    const lng = parseNumber(get("lng"));
    const locationKnown = lat != null && lng != null;
    if ((get("lat") && lat == null) || (get("lng") && lng == null)) {
      rowErrors.push("lat/lng must be numbers when provided");
    }
    if (locationKnown && (Math.abs(lat!) > 90 || Math.abs(lng!) > 180)) {
      rowErrors.push("lat must be -90..90 and lng -180..180");
    }

    const drive = parseNumber(get("hosDriveMinutes"));
    const duty = parseNumber(get("hosDutyMinutes"));
    if (get("hosDriveMinutes") && drive == null) rowErrors.push("hosDriveMinutesRemaining must be a number");
    if (get("hosDutyMinutes") && duty == null) rowErrors.push("hosDutyMinutesRemaining must be a number");
    if (drive != null && drive < 0) rowErrors.push("hosDriveMinutesRemaining cannot be negative");
    if (duty != null && duty < 0) rowErrors.push("hosDutyMinutesRemaining cannot be negative");

    const mpg = parseNumber(get("mpg"));
    if (get("mpg") && mpg == null) rowErrors.push("mpg must be a number");
    if (mpg != null && mpg <= 0) rowErrors.push("mpg must be greater than 0");

    const weekly = parseNumber(get("weeklyLoadCount"));
    if (get("weeklyLoadCount") && weekly == null) rowErrors.push("weeklyLoadCount must be a number");
    if (weekly != null && weekly < 0) rowErrors.push("weeklyLoadCount cannot be negative");

    const statusRaw = get("status");
    let readiness: TruckReadiness = "LEGAL_NOW";
    if (statusRaw) {
      const parsed = parseReadiness(statusRaw);
      if (!parsed) rowErrors.push(`Unknown status "${statusRaw}" (use available or unavailable)`);
      else readiness = parsed;
    }

    const key = unitNumber.toLowerCase();
    if (unitNumber && seen.has(key)) {
      rowErrors.push(`Duplicate truckNumber ${unitNumber} (also on row ${seen.get(key)})`);
    } else if (unitNumber) {
      seen.set(key, excelRow);
    }

    if (rowErrors.length > 0) {
      errors.push({ row: excelRow, message: rowErrors.join("; ") });
      continue;
    }

    rows.push({
      unitNumber,
      driverName,
      trailerType,
      lat: locationKnown ? lat! : 0,
      lng: locationKnown ? lng! : 0,
      city: get("city") || (locationKnown ? "GPS" : "Unknown"),
      state: get("state") || (locationKnown ? "—" : "—"),
      hosDriveMinutes: drive ?? 480,
      hosDutyMinutes: duty ?? 600,
      mpg: mpg ?? 7,
      readiness,
      weeklyLoadCount: weekly ?? 0,
      locationKnown,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ row: 0, message: "No data rows found under the header." });
  }

  return { rows, errors };
}

export function parsedRowToTruck(row: ParsedFleetRow, existingId?: string): Truck {
  return {
    id: existingId ?? `truck-${row.unitNumber}`,
    unitNumber: row.unitNumber,
    driverName: row.driverName,
    lat: row.lat,
    lng: row.lng,
    city: row.city,
    state: row.state,
    hosDriveMinutes: row.hosDriveMinutes,
    hosDutyMinutes: row.hosDutyMinutes,
    trailerType: row.trailerType,
    mpg: row.mpg,
    readiness: row.readiness,
    weeklyLoadCount: row.weeklyLoadCount,
    fuelGallons: 80,
    lastPingAt: new Date(),
    locationKnown: row.locationKnown,
  };
}

export const TRAILER_TYPES = [
  "DRY_VAN",
  "REEFER",
  "FLATBED",
  "STEP_DECK",
  "LOWBOY",
  "HOTSHOT",
  "POWER_ONLY",
  "TANKER",
  "BOX_TRUCK",
  "SOFTSHELL_NG",
  "SOFTSHELL_ASPHALT",
  "DRY_BULK",
  "CONTAINER",
  "CURTAIN_SIDE",
] as const;

export type TrailerType = (typeof TRAILER_TYPES)[number];

export const TRAILER_LABELS: Record<TrailerType, string> = {
  DRY_VAN: "Dry van",
  REEFER: "Reefer",
  FLATBED: "Flatbed",
  STEP_DECK: "Step deck",
  LOWBOY: "Lowboy / RGN",
  HOTSHOT: "Hotshot",
  POWER_ONLY: "Power only",
  TANKER: "Tanker",
  BOX_TRUCK: "Box truck",
  SOFTSHELL_NG: "Softshell — natural gas",
  SOFTSHELL_ASPHALT: "Softshell — asphalt / hot oil",
  DRY_BULK: "Dry bulk / hopper",
  CONTAINER: "Container / intermodal",
  CURTAIN_SIDE: "Curtain side",
};

const TRAILER_ALIASES: Record<string, TrailerType> = {
  dry_van: "DRY_VAN",
  dryvan: "DRY_VAN",
  van: "DRY_VAN",
  dry: "DRY_VAN",
  reefer: "REEFER",
  refrigerated: "REEFER",
  refigerated: "REEFER",
  flatbed: "FLATBED",
  flat_bed: "FLATBED",
  flat: "FLATBED",
  step_deck: "STEP_DECK",
  stepdeck: "STEP_DECK",
  step: "STEP_DECK",
  lowboy: "LOWBOY",
  rgn: "LOWBOY",
  lowboy_rgn: "LOWBOY",
  removable_gooseneck: "LOWBOY",
  hotshot: "HOTSHOT",
  hot_shot: "HOTSHOT",
  power_only: "POWER_ONLY",
  poweronly: "POWER_ONLY",
  power: "POWER_ONLY",
  tanker: "TANKER",
  tank: "TANKER",
  box_truck: "BOX_TRUCK",
  boxtruck: "BOX_TRUCK",
  box: "BOX_TRUCK",
  softshell_ng: "SOFTSHELL_NG",
  softshell_natural_gas: "SOFTSHELL_NG",
  ng_softshell: "SOFTSHELL_NG",
  natural_gas: "SOFTSHELL_NG",
  ng: "SOFTSHELL_NG",
  softshell: "SOFTSHELL_NG",
  softshell_asphalt: "SOFTSHELL_ASPHALT",
  asphalt: "SOFTSHELL_ASPHALT",
  hot_oil: "SOFTSHELL_ASPHALT",
  hotoil: "SOFTSHELL_ASPHALT",
  softshell_hot_oil: "SOFTSHELL_ASPHALT",
  dry_bulk: "DRY_BULK",
  drybulk: "DRY_BULK",
  hopper: "DRY_BULK",
  container: "CONTAINER",
  intermodal: "CONTAINER",
  curtain_side: "CURTAIN_SIDE",
  curtainside: "CURTAIN_SIDE",
  curtain: "CURTAIN_SIDE",
};

for (const type of TRAILER_TYPES) {
  TRAILER_ALIASES[type.toLowerCase()] = type;
}

export const HAZMAT_NONE = "NONE";

export const HAZMAT_PRESETS = [
  { code: HAZMAT_NONE, label: "None / not hazmat", short: "" },
  { code: "UN1057", label: "UN 1057 (propane / butane)", short: "1057" },
  { code: "UN1005", label: "UN 1005 (ammonia)", short: "1005" },
] as const;

const HAZMAT_ALIASES: Record<string, string> = {
  none: HAZMAT_NONE,
  not_hazmat: HAZMAT_NONE,
  nothazmat: HAZMAT_NONE,
  non_hazmat: HAZMAT_NONE,
  na: HAZMAT_NONE,
  n_a: HAZMAT_NONE,
  no: HAZMAT_NONE,
  false: HAZMAT_NONE,
  "0": HAZMAT_NONE,
  "1057": "UN1057",
  un1057: "UN1057",
  un_1057: "UN1057",
  propane: "UN1057",
  butane: "UN1057",
  lighters: "UN1057",
  "1005": "UN1005",
  un1005: "UN1005",
  un_1005: "UN1005",
  ammonia: "UN1005",
  anhydrous: "UN1005",
  anhydrous_ammonia: "UN1005",
};

export function isTrailerType(value: string): value is TrailerType {
  return (TRAILER_TYPES as readonly string[]).includes(value);
}

export function trailerLabel(type: TrailerType): string {
  return TRAILER_LABELS[type] ?? type;
}

export function parseTrailerType(value: string): TrailerType | null {
  const v = value.trim().toLowerCase().replace(/[\s-/]+/g, "_");
  if (!v) return null;
  return TRAILER_ALIASES[v] ?? null;
}

/** Normalize a hazmat / placard / UN number. Empty means none. Unknown UN-style codes are kept. */
export function parseHazmat(value: string): string | null {
  const raw = value.trim();
  if (!raw) return HAZMAT_NONE;
  const v = raw.toLowerCase().replace(/[\s-/]+/g, "_");
  if (HAZMAT_ALIASES[v]) return HAZMAT_ALIASES[v];
  const compact = raw.toUpperCase().replace(/[\s_-]+/g, "");
  const un = compact.match(/^UN?(\d{3,5})$/);
  if (un) return `UN${un[1]}`;
  if (/^[A-Z0-9]{2,12}$/.test(compact)) return compact;
  return null;
}

export function normalizeHazmat(value: string | null | undefined): string {
  return parseHazmat(value ?? "") ?? HAZMAT_NONE;
}

export function isHazmatRequired(code: string | null | undefined): boolean {
  return normalizeHazmat(code) !== HAZMAT_NONE;
}

export function hazmatSatisfied(required: string | null | undefined, capability: string | null | undefined): boolean {
  const need = normalizeHazmat(required);
  if (need === HAZMAT_NONE) return true;
  return normalizeHazmat(capability) === need;
}

export function hazmatShortLabel(code: string | null | undefined): string {
  const normalized = normalizeHazmat(code);
  if (normalized === HAZMAT_NONE) return "";
  const preset = HAZMAT_PRESETS.find((p) => p.code === normalized);
  if (preset?.short) return preset.short;
  if (normalized.startsWith("UN") && /^\d+$/.test(normalized.slice(2))) return normalized.slice(2);
  return normalized;
}

export function hazmatLabel(code: string | null | undefined): string {
  const normalized = normalizeHazmat(code);
  const preset = HAZMAT_PRESETS.find((p) => p.code === normalized);
  if (preset) return preset.label;
  if (normalized.startsWith("UN")) return `UN ${normalized.slice(2)}`;
  return normalized;
}

export function formatEquipment(trailerType: TrailerType, hazmat?: string | null): string {
  const body = trailerLabel(trailerType);
  const short = hazmatShortLabel(hazmat);
  return short ? `${body} · ${short}` : body;
}

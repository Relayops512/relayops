export type Role = "DISPATCHER" | "VIEWER";
export type TrailerType = "DRY_VAN" | "REEFER" | "FLATBED";
export type LoadStatus = "OPEN" | "ASSIGNED" | "COMPLETED";
export type TruckReadiness = "LEGAL_NOW" | "HOS_BLOCKED" | "ON_LOAD" | "MAINTENANCE";
export type LoadPriority = "STANDARD" | "HIGH";
export type FleetSource = "demo" | "csv" | "manual" | "samsara";
export type AuditKind =
  | "ASSIGNMENT"
  | "OVERRIDE"
  | "LOAD_CREATED"
  | "SAMSARA_SYNC"
  | "POLICY_FLAG"
  | "FLEET_IMPORT";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
};

export type Truck = {
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
  lastPingAt: Date;
  locationKnown: boolean;
  source: FleetSource;
  samsaraVehicleId: string | null;
};

export type Load = {
  id: string;
  reference: string;
  customer: string;
  pickupCity: string;
  pickupState: string;
  pickupLat: number;
  pickupLng: number;
  pickupWindowStart: Date;
  pickupWindowEnd: Date;
  deliveryCity: string;
  deliveryState: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryWindowStart: Date;
  deliveryWindowEnd: Date;
  trailerType: TrailerType;
  weightLbs: number;
  notes: string;
  priority: LoadPriority;
  status: LoadStatus;
  source: string;
  createdAt: Date;
};

export type Assignment = {
  id: string;
  loadId: string;
  truckId: string;
  assignedById: string;
  score: number;
  reasonsJson: string;
  isOverride: boolean;
  overrideReason: string | null;
  topTruckId: string | null;
  createdAt: Date;
};

export type AuditEvent = {
  id: string;
  kind: AuditKind;
  actorId: string | null;
  message: string;
  metaJson: string;
  createdAt: Date;
};

export type IntegrationSetting = {
  id: string;
  provider: string;
  connected: boolean;
  orgId: string;
  orgName: string;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  lastSyncSummary: string;
  encryptedTokens: string | null;
  connectedAt: Date | null;
  notes: string;
};

export type AppSettings = {
  fairnessToolsEnabled: boolean;
  fleetIsDemo: boolean;
  onboardedUserIds: string[];
};

export type AssignmentWithRels = Assignment & {
  load: Load;
  truck: Truck;
  assignedBy: User;
};

export type AuditEventWithActor = AuditEvent & {
  actor: User | null;
};

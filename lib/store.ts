import { createDemoState, type DemoState } from "./demo-data";
import { clearPersistedSamsara, readPersistedSamsara, writePersistedSamsara } from "./samsara/persist";
import type {
  AppSettings,
  Assignment,
  AssignmentWithRels,
  AuditEvent,
  AuditEventWithActor,
  AuditKind,
  CoveringStatus,
  IntegrationSetting,
  Load,
  LoadPriority,
  TrailerType,
  Truck,
  User,
} from "./types";
import { applyCoveringStatus, coveringAssignments } from "./covering";

const globalForStore = globalThis as unknown as { relayopsDemo?: DemoState };

function hydrateConnection(s: DemoState) {
  const persisted = readPersistedSamsara();
  if (!persisted) return;
  s.integration = {
    ...s.integration,
    connected: true,
    orgId: persisted.orgId,
    orgName: persisted.orgName,
    encryptedTokens: persisted.encryptedTokens,
    connectedAt: persisted.connectedAt ? new Date(persisted.connectedAt) : new Date(),
    lastSyncAt: persisted.lastSyncAt ? new Date(persisted.lastSyncAt) : null,
  };
}

function persistConnection() {
  const i = state().integration;
  if (!i.connected || !i.encryptedTokens) {
    clearPersistedSamsara();
    return;
  }
  writePersistedSamsara({
    encryptedTokens: i.encryptedTokens,
    orgId: i.orgId,
    orgName: i.orgName,
    connectedAt: i.connectedAt ? i.connectedAt.toISOString() : null,
    lastSyncAt: i.lastSyncAt ? i.lastSyncAt.toISOString() : null,
  });
}

function state(): DemoState {
  if (!globalForStore.relayopsDemo) {
    const next = createDemoState();
    hydrateConnection(next);
    globalForStore.relayopsDemo = next;
  }
  return globalForStore.relayopsDemo;
}

function userById(id: string | null | undefined): User | null {
  if (!id) return null;
  return state().users.find((u) => u.id === id) ?? null;
}

function nid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const store = {
  findUserByEmail(email: string): User | null {
    return state().users.find((u) => u.email === email) ?? null;
  },

  listTrucks(): Truck[] {
    return [...state().trucks].sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
  },

  listOpenLoads(): Load[] {
    return state()
      .loads.filter((l) => l.status === "OPEN")
      .sort((a, b) => {
        const byWindow = a.pickupWindowStart.getTime() - b.pickupWindowStart.getTime();
        if (byWindow !== 0) return byWindow;
        if (a.priority !== b.priority) return a.priority === "HIGH" ? -1 : 1;
        return a.reference.localeCompare(b.reference);
      });
  },

  getLoad(id: string): Load | null {
    return state().loads.find((l) => l.id === id) ?? null;
  },

  listAssignments(): AssignmentWithRels[] {
    const s = state();
    return s.assignments
      .map((a) => ({
        ...a,
        load: s.loads.find((l) => l.id === a.loadId)!,
        truck: s.trucks.find((t) => t.id === a.truckId)!,
        assignedBy: s.users.find((u) => u.id === a.assignedById)!,
      }))
      .filter((a) => a.load && a.truck && a.assignedBy)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  getAssignmentForLoad(loadId: string): AssignmentWithRels | null {
    return this.listAssignments().find((a) => a.loadId === loadId) ?? null;
  },

  listCovering(mode: "active" | "done" = "active"): AssignmentWithRels[] {
    return coveringAssignments(this.listAssignments(), mode);
  },

  setCoveringStatus(loadId: string, status: CoveringStatus) {
    const s = state();
    const load = s.loads.find((l) => l.id === loadId);
    const assignment = s.assignments.find((a) => a.loadId === loadId);
    if (!load || !assignment) throw new Error("Assignment not found.");
    if (load.status === "OPEN") throw new Error("Load is not assigned.");
    const truck = s.trucks.find((t) => t.id === assignment.truckId);
    if (!truck) throw new Error("Truck not found.");
    applyCoveringStatus({ load, assignment, truck, status });
    return this.getAssignmentForLoad(loadId);
  },

  listAuditEvents(take = 40): AuditEventWithActor[] {
    return [...state().auditEvents]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take)
      .map((e) => ({ ...e, actor: userById(e.actorId) }));
  },

  getIntegration(): IntegrationSetting {
    const i = state().integration;
    return { ...i, encryptedTokens: i.encryptedTokens ? "set" : null };
  },

  getEncryptedSamsaraTokens(): string | null {
    return state().integration.encryptedTokens;
  },

  isSamsaraConnected(): boolean {
    const i = state().integration;
    return i.connected && Boolean(i.encryptedTokens);
  },

  createLoad(input: {
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
    hazmat?: string;
    weightLbs: number;
    notes: string;
    priority: LoadPriority;
    reference: string;
  }): Load {
    const load: Load = {
      id: nid("load"),
      ...input,
      hazmat: input.hazmat ?? "NONE",
      source: "manual",
      status: "OPEN",
      createdAt: new Date(),
    };
    state().loads.unshift(load);
    return load;
  },

  addAudit(input: { kind: AuditKind; actorId: string | null; message: string; metaJson?: string }) {
    const event: AuditEvent = {
      id: nid("aud"),
      kind: input.kind,
      actorId: input.actorId,
      message: input.message,
      metaJson: input.metaJson ?? "{}",
      createdAt: new Date(),
    };
    state().auditEvents.unshift(event);
    return event;
  },

  assignLoad(input: {
    loadId: string;
    truckId: string;
    assignedById: string;
    score: number;
    reasonsJson: string;
    isOverride: boolean;
    overrideReason: string | null;
    topTruckId: string | null;
  }): Assignment {
    const s = state();
    const load = s.loads.find((l) => l.id === input.loadId);
    const truck = s.trucks.find((t) => t.id === input.truckId);
    if (!load || !truck) throw new Error("Load or truck not found.");
    load.status = "ASSIGNED";
    truck.weeklyLoadCount += 1;
    truck.readiness = "ON_LOAD";
    const assignment: Assignment = {
      id: nid("asg"),
      ...input,
      coveringStatus: "ASSIGNED",
      createdAt: new Date(),
    };
    s.assignments.unshift(assignment);
    return assignment;
  },

  setSamsaraTokens(encryptedTokens: string, meta?: { orgId?: string; orgName?: string }) {
    const i = state().integration;
    i.connected = true;
    i.encryptedTokens = encryptedTokens;
    i.connectedAt = i.connectedAt ?? new Date();
    i.lastSyncError = null;
    if (meta?.orgId != null) i.orgId = meta.orgId;
    if (meta?.orgName != null) i.orgName = meta.orgName;
    persistConnection();
  },

  disconnectSamsara() {
    const i = state().integration;
    i.connected = false;
    i.encryptedTokens = null;
    i.connectedAt = null;
    i.orgId = "";
    i.orgName = "";
    i.lastSyncError = null;
    i.lastSyncSummary = "";
    persistConnection();
  },

  markSamsaraSynced(input: { summary: string; error: string | null }) {
    const i = state().integration;
    i.lastSyncAt = new Date();
    i.lastSyncSummary = input.summary;
    i.lastSyncError = input.error;
    persistConnection();
  },

  getSettings(): AppSettings {
    return state().settings;
  },

  setFairnessToolsEnabled(enabled: boolean) {
    state().settings.fairnessToolsEnabled = enabled;
  },

  markFleetCustom() {
    state().settings.fleetIsDemo = false;
  },

  isDemoFleet(): boolean {
    return state().settings.fleetIsDemo;
  },

  markOnboarded(userId: string) {
    const ids = state().settings.onboardedUserIds;
    if (!ids.includes(userId)) ids.push(userId);
  },

  isOnboarded(userId: string): boolean {
    return state().settings.onboardedUserIds.includes(userId);
  },

  addTruck(truck: Truck) {
    const s = state();
    const idx = s.trucks.findIndex(
      (t) => t.unitNumber.toLowerCase() === truck.unitNumber.toLowerCase(),
    );
    if (idx >= 0) {
      const existing = s.trucks[idx];
      s.trucks[idx] = {
        ...truck,
        id: existing.id,
        samsaraVehicleId: truck.samsaraVehicleId ?? existing.samsaraVehicleId,
      };
    } else {
      s.trucks.push(truck);
    }
    s.settings.fleetIsDemo = false;
  },

  setTrucks(trucks: Truck[]) {
    state().trucks = trucks;
    state().settings.fleetIsDemo = false;
  },

  replaceTrucks(trucks: Truck[]) {
    this.setTrucks(trucks);
  },

  mergeTrucks(incoming: Truck[]): { created: number; updated: number } {
    const s = state();
    let created = 0;
    let updated = 0;
    for (const truck of incoming) {
      const idx = s.trucks.findIndex(
        (t) => t.unitNumber.toLowerCase() === truck.unitNumber.toLowerCase(),
      );
      if (idx >= 0) {
        const existing = s.trucks[idx];
        s.trucks[idx] = {
          ...truck,
          id: existing.id,
          samsaraVehicleId: truck.samsaraVehicleId ?? existing.samsaraVehicleId,
          source: truck.source ?? existing.source,
        };
        updated += 1;
      } else {
        s.trucks.push(truck);
        created += 1;
      }
    }
    s.settings.fleetIsDemo = false;
    return { created, updated };
  },
};

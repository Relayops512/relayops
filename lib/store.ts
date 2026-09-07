import { createDemoState, type DemoState } from "./demo-data";
import type {
  Assignment,
  AssignmentWithRels,
  AuditEvent,
  AuditEventWithActor,
  AuditKind,
  IntegrationSetting,
  Load,
  LoadPriority,
  TrailerType,
  Truck,
  User,
} from "./types";

const globalForStore = globalThis as unknown as { relayopsDemo?: DemoState };

function state(): DemoState {
  if (!globalForStore.relayopsDemo) {
    globalForStore.relayopsDemo = createDemoState();
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
        if (a.priority !== b.priority) return a.priority === "HIGH" ? -1 : 1;
        return a.pickupWindowStart.getTime() - b.pickupWindowStart.getTime();
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

  listAuditEvents(take = 40): AuditEventWithActor[] {
    return [...state().auditEvents]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take)
      .map((e) => ({ ...e, actor: userById(e.actorId) }));
  },

  getIntegration(): IntegrationSetting {
    return state().integration;
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
    weightLbs: number;
    notes: string;
    priority: LoadPriority;
    reference: string;
  }): Load {
    const load: Load = {
      id: nid("load"),
      ...input,
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
      createdAt: new Date(),
    };
    s.assignments.unshift(assignment);
    return assignment;
  },

  saveIntegration(input: {
    enabled: boolean;
    demoMode: boolean;
    orgId: string;
    apiTokenHint?: string;
  }) {
    const current = state().integration;
    state().integration = {
      ...current,
      enabled: input.enabled,
      demoMode: input.demoMode,
      orgId: input.orgId,
      apiTokenHint: input.apiTokenHint ?? current.apiTokenHint,
    };
  },

  markSamsaraSynced() {
    state().integration.lastSyncAt = new Date();
    state().integration.demoMode = true;
  },

  replaceTrucks(trucks: Truck[]) {
    state().trucks = trucks;
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
        s.trucks[idx] = { ...truck, id: s.trucks[idx].id };
        updated += 1;
      } else {
        s.trucks.push(truck);
        created += 1;
      }
    }
    return { created, updated };
  },
};

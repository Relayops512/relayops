import { cityState, formatWindow } from "./format";
import { formatEquipment } from "./equipment";
import type { Assignment, AssignmentWithRels, CoveringStatus, Load, Truck } from "./types";

export const COVERING_STATUSES: CoveringStatus[] = [
  "ASSIGNED",
  "EN_ROUTE_PICKUP",
  "AT_PICKUP",
  "LOADED",
  "EN_ROUTE_DELIVERY",
  "DELIVERED",
];

export const COVERING_LABELS: Record<CoveringStatus, string> = {
  ASSIGNED: "Assigned",
  EN_ROUTE_PICKUP: "En route to pickup",
  AT_PICKUP: "At pickup",
  LOADED: "Loaded",
  EN_ROUTE_DELIVERY: "En route to delivery",
  DELIVERED: "Delivered",
};

export function isCoveringStatus(value: string): value is CoveringStatus {
  return COVERING_STATUSES.includes(value as CoveringStatus);
}

export function nextCoveringStatus(current: CoveringStatus): CoveringStatus | null {
  const index = COVERING_STATUSES.indexOf(current);
  if (index < 0 || index >= COVERING_STATUSES.length - 1) return null;
  return COVERING_STATUSES[index + 1] ?? null;
}

export function coveringChipClass(status: CoveringStatus): string {
  if (status === "DELIVERED") return "bg-sage text-sage-text";
  if (status === "ASSIGNED") return "bg-teal-soft text-teal";
  return "bg-peach text-peach-text";
}

export function applyCoveringStatus(input: {
  load: Load;
  assignment: Assignment;
  truck: Truck;
  status: CoveringStatus;
}) {
  const { load, assignment, truck, status } = input;
  assignment.coveringStatus = status;
  if (status === "DELIVERED") {
    load.status = "COMPLETED";
    if (truck.readiness === "ON_LOAD") truck.readiness = "LEGAL_NOW";
    return;
  }
  load.status = "ASSIGNED";
  if (truck.readiness === "LEGAL_NOW") truck.readiness = "ON_LOAD";
}

export function latestAssignmentPerLoad(assignments: AssignmentWithRels[]): AssignmentWithRels[] {
  const seen = new Set<string>();
  const latest: AssignmentWithRels[] = [];
  for (const assignment of assignments) {
    if (seen.has(assignment.loadId)) continue;
    seen.add(assignment.loadId);
    latest.push(assignment);
  }
  return latest;
}

export function coveringAssignments(
  assignments: AssignmentWithRels[],
  mode: "active" | "done",
): AssignmentWithRels[] {
  return latestAssignmentPerLoad(assignments)
    .filter((assignment) =>
      mode === "active" ? assignment.load.status === "ASSIGNED" : assignment.load.status === "COMPLETED",
    )
    .sort((a, b) => a.load.pickupWindowStart.getTime() - b.load.pickupWindowStart.getTime());
}

export type CoveringItem = {
  loadId: string;
  assignmentId: string;
  reference: string;
  customer: string;
  lane: string;
  pickupWindow: string;
  deliveryWindow: string;
  trailer: string;
  unitNumber: string;
  driverName: string;
  coveringStatus: CoveringStatus;
  nextStatus: CoveringStatus | null;
  nextLabel: string | null;
};

export function buildCoveringItem(assignment: AssignmentWithRels): CoveringItem {
  const { load, truck } = assignment;
  const coveringStatus = assignment.coveringStatus;
  const nextStatus = nextCoveringStatus(coveringStatus);
  return {
    loadId: load.id,
    assignmentId: assignment.id,
    reference: load.reference,
    customer: load.customer,
    lane: `${cityState(load.pickupCity, load.pickupState)} → ${cityState(load.deliveryCity, load.deliveryState)}`,
    pickupWindow: formatWindow(load.pickupWindowStart, load.pickupWindowEnd),
    deliveryWindow: formatWindow(load.deliveryWindowStart, load.deliveryWindowEnd),
    trailer: formatEquipment(load.trailerType, load.hazmat),
    unitNumber: truck.unitNumber,
    driverName: truck.driverName,
    coveringStatus,
    nextStatus,
    nextLabel: nextStatus ? COVERING_LABELS[nextStatus] : null,
  };
}

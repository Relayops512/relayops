import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "./demo-data";
import {
  applyCoveringStatus,
  buildCoveringItem,
  coveringAssignments,
  COVERING_LABELS,
  nextCoveringStatus,
} from "./covering";

describe("covering board data", () => {
  it("seeds a couple assigned loads with truck and driver", () => {
    const state = createDemoState();
    const assigned = coveringAssignments(
      state.assignments.map((assignment) => ({
        ...assignment,
        load: state.loads.find((load) => load.id === assignment.loadId)!,
        truck: state.trucks.find((truck) => truck.id === assignment.truckId)!,
        assignedBy: state.users.find((user) => user.id === assignment.assignedById)!,
      })),
      "active",
    );
    assert.equal(assigned.length, 2);
    const references = assigned.map((row) => row.load.reference).sort();
    assert.deepEqual(references, ["RO-4394", "RO-4401"]);
    for (const row of assigned) {
      assert.ok(row.truck.unitNumber);
      assert.ok(row.truck.driverName);
      assert.ok(row.coveringStatus);
      assert.notEqual(row.load.status, "OPEN");
      assert.notEqual(row.load.status, "COMPLETED");
    }
  });

  it("keeps Today as open loads only", () => {
    const state = createDemoState();
    const open = state.loads.filter((load) => load.status === "OPEN");
    const assigned = state.loads.filter((load) => load.status === "ASSIGNED");
    assert.ok(open.length > 0);
    assert.equal(assigned.length, 2);
    assert.equal(
      open.every((load) => !state.assignments.some((assignment) => assignment.loadId === load.id)),
      true,
    );
  });

  it("advances status and Complete clears the load from active covering", () => {
    const state = createDemoState();
    const assignment = state.assignments[0];
    const load = state.loads.find((row) => row.id === assignment.loadId)!;
    const truck = state.trucks.find((row) => row.id === assignment.truckId)!;
    assert.equal(nextCoveringStatus("ASSIGNED"), "EN_ROUTE_PICKUP");
    assert.equal(nextCoveringStatus("EN_ROUTE_DELIVERY"), "DELIVERED");
    assert.equal(nextCoveringStatus("DELIVERED"), null);

    applyCoveringStatus({ load, assignment, truck, status: "LOADED" });
    assert.equal(assignment.coveringStatus, "LOADED");
    assert.equal(load.status, "ASSIGNED");

    applyCoveringStatus({ load, assignment, truck, status: "DELIVERED" });
    assert.equal(assignment.coveringStatus, "DELIVERED");
    assert.equal(load.status, "COMPLETED");
    assert.equal(truck.readiness, "LEGAL_NOW");

    const rels = state.assignments.map((row) => ({
      ...row,
      load: state.loads.find((item) => item.id === row.loadId)!,
      truck: state.trucks.find((item) => item.id === row.truckId)!,
      assignedBy: state.users.find((item) => item.id === row.assignedById)!,
    }));
    const active = coveringAssignments(rels, "active");
    const done = coveringAssignments(rels, "done");
    assert.equal(active.some((row) => row.loadId === load.id), false);
    assert.equal(done.some((row) => row.loadId === load.id), true);
  });

  it("builds a covering row with lane, equipment, and status label", () => {
    const state = createDemoState();
    const assignment = state.assignments.find((row) => row.loadId === "load-RO-4401")!;
    const item = buildCoveringItem({
      ...assignment,
      load: state.loads.find((load) => load.id === assignment.loadId)!,
      truck: state.trucks.find((truck) => truck.id === assignment.truckId)!,
      assignedBy: state.users.find((user) => user.id === assignment.assignedById)!,
    });
    assert.match(item.lane, /Detroit.*Cleveland/);
    assert.equal(item.customer, "Ford Parts");
    assert.equal(item.unitNumber, "118");
    assert.equal(item.driverName, "Ty Robinson");
    assert.equal(item.coveringStatus, "EN_ROUTE_DELIVERY");
    assert.equal(COVERING_LABELS[item.coveringStatus], "En route to delivery");
    assert.equal(item.trailer, "Dry van");
  });
});

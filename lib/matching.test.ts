import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankTrucks, type MatchLoad, type MatchTruck } from "./matching";

const now = new Date("2026-09-08T14:00:00Z");

function load(partial: Partial<MatchLoad> = {}): MatchLoad {
  return {
    pickupLat: 39.7684,
    pickupLng: -86.1581,
    pickupWindowStart: new Date("2026-09-08T16:00:00Z"),
    pickupWindowEnd: new Date("2026-09-08T22:00:00Z"),
    deliveryLat: 41.8781,
    deliveryLng: -87.6298,
    trailerType: "DRY_VAN",
    weightLbs: 38000,
    ...partial,
  };
}

function truck(partial: Partial<MatchTruck> & Pick<MatchTruck, "id" | "unitNumber" | "driverName">): MatchTruck {
  return {
    lat: 39.79,
    lng: -86.14,
    city: "Indianapolis",
    state: "IN",
    hosDriveMinutes: 540,
    hosDutyMinutes: 660,
    trailerType: "DRY_VAN",
    mpg: 7.4,
    readiness: "LEGAL_NOW",
    weeklyLoadCount: 2,
    fuelGallons: 90,
    ...partial,
  };
}

describe("rankTrucks", () => {
  it("ranks the closer legal dry-van above a distant one", () => {
    const near = truck({
      id: "near",
      unitNumber: "184",
      driverName: "Marcus Hill",
      lat: 39.79,
      lng: -86.14,
      weeklyLoadCount: 3,
    });
    const far = truck({
      id: "far",
      unitNumber: "201",
      driverName: "Far Driver",
      lat: 29.76,
      lng: -95.37,
      city: "Houston",
      state: "TX",
      weeklyLoadCount: 1,
    });
    const ranked = rankTrucks(load(), [far, near], now);
    assert.equal(ranked[0].truck.id, "near");
    assert.ok(ranked[0].score > ranked[1].score);
  });

  it("does not hardcode a winner when a closer eligible truck exists", () => {
    const a = truck({ id: "a", unitNumber: "1", driverName: "A", lat: 41.88, lng: -87.63 });
    const b = truck({ id: "b", unitNumber: "2", driverName: "B", lat: 39.77, lng: -86.16 });
    const ranked = rankTrucks(load(), [a, b], now);
    assert.equal(ranked[0].truck.id, "b");
  });

  it("penalizes trailer mismatch and HOS-blocked trucks", () => {
    const fit = truck({ id: "fit", unitNumber: "10", driverName: "Fit" });
    const mismatch = truck({
      id: "mis",
      unitNumber: "11",
      driverName: "Mis",
      trailerType: "FLATBED",
    });
    const blocked = truck({
      id: "blk",
      unitNumber: "12",
      driverName: "Blk",
      readiness: "HOS_BLOCKED",
      hosDriveMinutes: 40,
    });
    const ranked = rankTrucks(load(), [mismatch, blocked, fit], now);
    assert.equal(ranked[0].truck.id, "fit");
    assert.equal(ranked[0].eligible, true);
    assert.equal(ranked.find((r) => r.truck.id === "mis")?.eligible, false);
    assert.equal(ranked.find((r) => r.truck.id === "blk")?.eligible, false);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchWhyLine, rankTrucks, type MatchLoad, type MatchTruck } from "./matching";

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

  it("requires an exact hazmat match when the load specifies a placard", () => {
    const propane = truck({
      id: "p",
      unitNumber: "301",
      driverName: "Tanner Cole",
      trailerType: "TANKER",
      hazmat: "UN1057",
    });
    const ammonia = truck({
      id: "a",
      unitNumber: "308",
      driverName: "Harper Quinn",
      trailerType: "TANKER",
      hazmat: "UN1005",
    });
    const plain = truck({
      id: "t",
      unitNumber: "310",
      driverName: "No Placard",
      trailerType: "TANKER",
    });
    const ranked = rankTrucks(load({ trailerType: "TANKER", hazmat: "UN1057" }), [ammonia, plain, propane], now);
    assert.equal(ranked[0].truck.id, "p");
    assert.equal(ranked[0].eligible, true);
    assert.match(ranked[0].reasons.some((r) => /1057/.test(r.label)) ? "ok" : "", /ok/);
    assert.equal(ranked.find((r) => r.truck.id === "a")?.eligible, false);
    assert.equal(ranked.find((r) => r.truck.id === "t")?.eligible, false);
  });

  it("includes trailer and hazmat on the why line", () => {
    const propane = truck({
      id: "p",
      unitNumber: "301",
      driverName: "Tanner Cole",
      trailerType: "TANKER",
      hazmat: "UN1057",
    });
    const ranked = rankTrucks(load({ trailerType: "TANKER", hazmat: "UN1057" }), [propane], now);
    assert.match(matchWhyLine(ranked[0]), /\d+ mi · \d+h HOS · tanker · 1057/);
  });

  it("lets any matching trailer cover a load that does not require hazmat", () => {
    const propane = truck({
      id: "p",
      unitNumber: "301",
      driverName: "Tanner Cole",
      trailerType: "TANKER",
      hazmat: "UN1057",
    });
    const ranked = rankTrucks(load({ trailerType: "TANKER" }), [propane], now);
    assert.equal(ranked[0].eligible, true);
    assert.equal(ranked[0].hazmatFit, "not_required");
  });

  it("penalizes trucks with unknown location versus a nearby GPS truck", () => {
    const known = truck({ id: "gps", unitNumber: "1", driverName: "Known" });
    const unknown = truck({
      id: "unk",
      unitNumber: "2",
      driverName: "Unknown",
      locationKnown: false,
      lat: 0,
      lng: 0,
    });
    const ranked = rankTrucks(load(), [unknown, known], now);
    assert.equal(ranked[0].truck.id, "gps");
    assert.ok(ranked.find((r) => r.truck.id === "unk")?.reasons.some((c) => c.label === "Location unknown"));
  });
});

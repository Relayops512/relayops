import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "./demo-data";
import { displayReasons, matchWhyLine, rankTrucks, type MatchLoad, type MatchTruck } from "./matching";
import { buildTodayItem } from "./today";
import { needsCoverSoon, relativePickup } from "./format";

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
    hosDriveMinutes: 480,
    hosDutyMinutes: 660,
    trailerType: "DRY_VAN",
    mpg: 7.4,
    readiness: "LEGAL_NOW",
    weeklyLoadCount: 2,
    fuelGallons: 90,
    ...partial,
  };
}

describe("plain-English match why", () => {
  it("formats deadhead, HOS hours, and trailer", () => {
    const ranked = rankTrucks(load(), [truck({ id: "near", unitNumber: "184", driverName: "Marcus Hill" })], now);
    const why = matchWhyLine(ranked[0]);
    assert.match(why, /^\d+ mi · \d+h HOS · dry van$/);
  });

  it("hides balance chips when fairness tools are off", () => {
    const light = truck({
      id: "light",
      unitNumber: "1",
      driverName: "Light",
      weeklyLoadCount: 0,
    });
    const busy = truck({
      id: "busy",
      unitNumber: "9",
      driverName: "Busy",
      weeklyLoadCount: 8,
    });
    const ranked = rankTrucks(load(), [light, busy], now);
    const busyMatch = ranked.find((r) => r.truck.id === "busy");
    assert.ok(busyMatch);
    const hidden = displayReasons(busyMatch.reasons, false);
    const shown = displayReasons(busyMatch.reasons, true);
    assert.equal(
      hidden.some((r) => /busy this week|lighter week|fairness/i.test(r.label)),
      false,
    );
    assert.ok(shown.some((r) => /busy this week|lighter week|fairness/i.test(r.label)));
  });
});

describe("today urgency", () => {
  it("defaults fairness tools off on the demo fleet", () => {
    const state = createDemoState();
    assert.equal(state.settings.fairnessToolsEnabled, false);
    assert.equal(state.settings.fleetIsDemo, true);
  });

  it("sorts open loads by soonest appointment", () => {
    const state = createDemoState();
    const open = state.loads
      .filter((l) => l.status === "OPEN")
      .sort((a, b) => a.pickupWindowStart.getTime() - b.pickupWindowStart.getTime());
    for (let i = 1; i < open.length; i++) {
      assert.ok(open[i - 1].pickupWindowStart.getTime() <= open[i].pickupWindowStart.getTime());
    }
  });

  it("marks a load as needing cover when the window is soon", () => {
    assert.equal(needsCoverSoon(new Date("2026-09-08T16:00:00Z"), now), true);
    assert.equal(needsCoverSoon(new Date("2026-09-09T16:00:00Z"), now), false);
    assert.equal(relativePickup(new Date("2026-09-08T16:00:00Z"), now), "in 2h");
  });

  it("attaches a best truck and why line to a today row", () => {
    const state = createDemoState();
    const open = state.loads.find((l) => l.status === "OPEN");
    assert.ok(open);
    const item = buildTodayItem(open, state.trucks, now);
    assert.ok(item.lane.includes("→"));
    if (item.best) {
      assert.match(item.best.why, /HOS/);
      assert.equal(item.best.eligible, true);
    }
  });

  it("covers tanker and softshell demo freight with matching equipment", () => {
    const state = createDemoState();
    const propane = state.loads.find((l) => l.reference === "RO-4482");
    const ammonia = state.loads.find((l) => l.reference === "RO-4488");
    const ng = state.loads.find((l) => l.reference === "RO-4491");
    assert.ok(propane && ammonia && ng);
    const propaneItem = buildTodayItem(propane, state.trucks, now);
    const ammoniaItem = buildTodayItem(ammonia, state.trucks, now);
    const ngItem = buildTodayItem(ng, state.trucks, now);
    assert.equal(propaneItem.best?.unitNumber, "301");
    assert.match(propaneItem.best?.why ?? "", /tanker · 1057/);
    assert.equal(ammoniaItem.best?.unitNumber, "308");
    assert.match(ammoniaItem.best?.why ?? "", /tanker · 1005/);
    assert.equal(ngItem.best?.unitNumber, "312");
    assert.match(ngItem.trailer, /Softshell/);
  });
});

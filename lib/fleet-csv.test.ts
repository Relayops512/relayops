import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFleetCsv, parsedRowToTruck } from "./fleet-csv";
import { store } from "./store";
import { rankTrucks, type MatchLoad } from "./matching";

const sample = `truckNumber,driverName,trailerType,lat,lng,hosDriveMinutesRemaining,hosDutyMinutesRemaining,mpg,status,weeklyLoadCount
184,Marcus Hill,dry_van,39.7684,-86.1581,525,605,7.6,available,2
191,Elena Ruiz,dry_van,38.2527,-85.7585,480,590,7.2,available,1
`;

const load: MatchLoad = {
  pickupLat: 39.7684,
  pickupLng: -86.1581,
  pickupWindowStart: new Date("2026-09-08T16:00:00Z"),
  pickupWindowEnd: new Date("2026-09-08T22:00:00Z"),
  deliveryLat: 41.8781,
  deliveryLng: -87.6298,
  trailerType: "DRY_VAN",
  weightLbs: 38000,
};

describe("parseFleetCsv", () => {
  it("parses the template and accepts header aliases", () => {
    const aliased = `unit,driver,trailer,latitude,longitude
900,Ada Cole,reefer,33.749,-84.388`;
    const a = parseFleetCsv(sample);
    const b = parseFleetCsv(aliased);
    assert.equal(a.errors.length, 0);
    assert.equal(a.rows.length, 2);
    assert.equal(a.rows[0].unitNumber, "184");
    assert.equal(a.rows[0].trailerType, "DRY_VAN");
    assert.equal(b.rows[0].unitNumber, "900");
    assert.equal(b.rows[0].trailerType, "REEFER");
    assert.equal(b.rows[0].locationKnown, true);
  });

  it("keeps valid rows and reports row errors without requiring a full wipe", () => {
    const mixed = `truckNumber,driverName,trailerType,lat,lng
184,Marcus Hill,dry_van,39.76,-86.15
,No Truck,dry_van,39.76,-86.15
185,Bad Trailer,spaceship,39.76,-86.15`;
    const parsed = parseFleetCsv(mixed);
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].unitNumber, "184");
    assert.equal(parsed.errors.length, 2);
    assert.ok(parsed.errors.some((e) => e.message.includes("truckNumber")));
    assert.ok(parsed.errors.some((e) => e.message.includes("trailerType")));
  });

  it("marks missing GPS as location unknown and rejects empty files", () => {
    const noGps = `truckNumber,driverName
300,Pat Lee`;
    const parsed = parseFleetCsv(noGps);
    assert.equal(parsed.rows[0].locationKnown, false);
    const empty = parseFleetCsv("   ");
    assert.equal(empty.rows.length, 0);
    assert.ok(empty.errors[0].message.includes("empty"));
  });

  it("rejects a file with no required headers without producing rows", () => {
    const parsed = parseFleetCsv("foo,bar\n1,2");
    assert.equal(parsed.rows.length, 0);
    assert.ok(parsed.errors[0].message.includes("required columns"));
  });
});

describe("store fleet import", () => {
  it("replace swaps the live truck list used by matching", () => {
    const parsed = parseFleetCsv(sample);
    store.replaceTrucks(parsed.rows.map((row) => parsedRowToTruck(row)));
    const trucks = store.listTrucks();
    assert.equal(trucks.length, 2);
    assert.ok(trucks.every((t) => ["184", "191"].includes(t.unitNumber)));
    const ranked = rankTrucks(load, trucks, new Date("2026-09-08T14:00:00Z"));
    assert.equal(ranked[0].truck.unitNumber, "184");
  });
});

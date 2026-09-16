import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encryptSecret, decryptSecret, signValue, verifySignedValue } from "./samsara/crypto";
import { createOAuthState, verifyOAuthState, encryptTokens, decryptTokens } from "./samsara/oauth";
import { getSamsaraConfig, isSamsaraConfigured } from "./samsara/config";
import { friendlySamsaraError } from "./samsara/errors";
import { mapSamsaraPull, parseReverseGeo, trailerFromAttributes, unitNumberFromVehicle } from "./samsara/map";
import { mergeSamsaraTrucks, resolveSamsaraMode } from "./samsara/merge";
import type { Truck } from "./types";
import type { SamsaraPull } from "./samsara/types";
import type { MappedSamsaraTruck } from "./samsara/map";

function truck(partial: Partial<Truck> & Pick<Truck, "id" | "unitNumber" | "driverName">): Truck {
  return {
    lat: 39.76,
    lng: -86.15,
    city: "Indianapolis",
    state: "IN",
    hosDriveMinutes: 480,
    hosDutyMinutes: 600,
    trailerType: "DRY_VAN",
    mpg: 7.4,
    readiness: "LEGAL_NOW",
    weeklyLoadCount: 2,
    fuelGallons: 80,
    lastPingAt: new Date("2026-09-16T12:00:00Z"),
    locationKnown: true,
    source: "csv",
    samsaraVehicleId: null,
    ...partial,
  };
}

function mapped(partial: Partial<Truck> & Pick<Truck, "id" | "unitNumber">, flags?: Partial<MappedSamsaraTruck>): MappedSamsaraTruck {
  return {
    truck: truck({
      driverName: "From Samsara",
      source: "samsara",
      samsaraVehicleId: "veh-1",
      ...partial,
    }),
    trailerInferred: false,
    hosKnown: true,
    ...flags,
  };
}

describe("samsara mapping", () => {
  it("extracts truck numbers from common Samsara names", () => {
    assert.equal(unitNumberFromVehicle({ id: "9", name: "Truck 184" }), "184");
    assert.equal(unitNumberFromVehicle({ id: "9", name: "Unit #401" }), "401");
    assert.equal(unitNumberFromVehicle({ id: "9", name: "229" }), "229");
    assert.equal(unitNumberFromVehicle({ id: "abcdef123456", name: "", licensePlate: "6SAM123" }), "6SAM123");
  });

  it("parses reverse-geocoded city and state", () => {
    assert.deepEqual(parseReverseGeo("Fuller Drive, Boylston, MA, 01505"), {
      city: "Boylston",
      state: "MA",
    });
    assert.deepEqual(parseReverseGeo("Indianapolis, IN"), { city: "Indianapolis", state: "IN" });
  });

  it("infers trailer type from attributes when present", () => {
    assert.equal(trailerFromAttributes([{ name: "Equipment", stringValues: ["Reefer"] }]), "REEFER");
    assert.equal(trailerFromAttributes([{ name: "Trailer type", stringValues: ["flatbed"] }]), "FLATBED");
    assert.equal(trailerFromAttributes([{ name: "Color", stringValues: ["White"] }]), null);
  });

  it("maps vehicles, GPS, HOS, and assignments into the truck model", () => {
    const pull: SamsaraPull = {
      vehicles: [
        {
          id: "veh-184",
          name: "Truck 184",
          staticAssignedDriver: { id: "d1", name: "Marcus Hill" },
          attributes: [{ name: "Trailer", stringValues: ["dry van"] }],
        },
        {
          id: "veh-401",
          name: "401",
        },
      ],
      drivers: [{ id: "d2", name: "Jamie Cole" }],
      stats: [
        {
          id: "veh-184",
          gps: {
            time: "2026-09-16T18:00:00Z",
            latitude: 39.7684,
            longitude: -86.1581,
            reverseGeo: { formattedLocation: "Indianapolis, IN 46204" },
          },
        },
      ],
      clocks: [
        {
          driver: { id: "d1", name: "Marcus Hill" },
          currentVehicle: { id: "veh-184" },
          clocks: {
            drive: { driveRemainingDurationMs: 525 * 60 * 1000 },
            shift: { shiftRemainingDurationMs: 605 * 60 * 1000 },
          },
        },
      ],
      assignments: [
        {
          vehicle: { id: "veh-401" },
          driver: { id: "d2", name: "Jamie Cole" },
        },
      ],
    };

    const mappedRows = mapSamsaraPull(pull, new Date("2026-09-16T18:05:00Z"));
    const byUnit = Object.fromEntries(mappedRows.map((row) => [row.truck.unitNumber, row]));

    assert.equal(byUnit["184"].truck.driverName, "Marcus Hill");
    assert.equal(byUnit["184"].truck.lat, 39.7684);
    assert.equal(byUnit["184"].truck.city, "Indianapolis");
    assert.equal(byUnit["184"].truck.hosDriveMinutes, 525);
    assert.equal(byUnit["184"].truck.hosDutyMinutes, 605);
    assert.equal(byUnit["184"].truck.trailerType, "DRY_VAN");
    assert.equal(byUnit["184"].trailerInferred, true);
    assert.equal(byUnit["184"].truck.source, "samsara");
    assert.equal(byUnit["184"].truck.samsaraVehicleId, "veh-184");
    assert.equal(byUnit["184"].truck.readiness, "LEGAL_NOW");

    assert.equal(byUnit["401"].truck.driverName, "Jamie Cole");
    assert.equal(byUnit["401"].truck.locationKnown, false);
    assert.equal(byUnit["401"].hosKnown, false);
  });

  it("marks short remaining drive time as hours short", () => {
    const pull: SamsaraPull = {
      vehicles: [{ id: "veh-1", name: "147" }],
      drivers: [],
      stats: [],
      clocks: [
        {
          currentVehicle: { id: "veh-1" },
          clocks: { drive: { driveRemainingDurationMs: 20 * 60 * 1000 } },
        },
      ],
      assignments: [],
    };
    const [row] = mapSamsaraPull(pull);
    assert.equal(row.truck.readiness, "HOS_BLOCKED");
    assert.equal(row.truck.hosDriveMinutes, 20);
  });
});

describe("samsara merge", () => {
  it("upserts by Samsara id then truck number and keeps CSV-only trucks", () => {
    const existing = [
      truck({ id: "csv-900", unitNumber: "900", driverName: "CSV Only", source: "csv" }),
      truck({
        id: "csv-184",
        unitNumber: "184",
        driverName: "Old Name",
        weeklyLoadCount: 6,
        mpg: 7.6,
        source: "csv",
      }),
    ];
    const incoming = [
      mapped({
        id: "s-184",
        unitNumber: "184",
        driverName: "Marcus Hill",
        samsaraVehicleId: "veh-184",
        hosDriveMinutes: 500,
      }),
      mapped({
        id: "s-401",
        unitNumber: "401",
        driverName: "Jamie Cole",
        samsaraVehicleId: "veh-401",
      }),
    ];
    const result = mergeSamsaraTrucks(existing, incoming, "merge");
    assert.equal(result.created, 1);
    assert.equal(result.updated, 1);
    assert.equal(result.kept, 1);
    const byUnit = Object.fromEntries(result.trucks.map((t) => [t.unitNumber, t]));
    assert.equal(byUnit["900"].source, "csv");
    assert.equal(byUnit["184"].id, "csv-184");
    assert.equal(byUnit["184"].driverName, "Marcus Hill");
    assert.equal(byUnit["184"].weeklyLoadCount, 6);
    assert.equal(byUnit["184"].mpg, 7.6);
    assert.equal(byUnit["184"].samsaraVehicleId, "veh-184");
    assert.equal(byUnit["401"].unitNumber, "401");
  });

  it("matches a later sync by Samsara vehicle id even if the truck number changed", () => {
    const existing = [
      truck({
        id: "keep",
        unitNumber: "184",
        driverName: "Marcus Hill",
        source: "samsara",
        samsaraVehicleId: "veh-184",
        weeklyLoadCount: 3,
      }),
    ];
    const incoming = [
      mapped({
        id: "new",
        unitNumber: "185",
        driverName: "Marcus Hill",
        samsaraVehicleId: "veh-184",
      }),
    ];
    const result = mergeSamsaraTrucks(existing, incoming, "merge");
    assert.equal(result.updated, 1);
    assert.equal(result.created, 0);
    assert.equal(result.trucks[0].id, "keep");
    assert.equal(result.trucks[0].unitNumber, "185");
  });

  it("replace drops CSV-only trucks", () => {
    const existing = [truck({ id: "csv-900", unitNumber: "900", driverName: "CSV Only" })];
    const incoming = [mapped({ id: "s-1", unitNumber: "401", samsaraVehicleId: "veh-401" })];
    const result = mergeSamsaraTrucks(existing, incoming, "replace");
    assert.equal(result.trucks.length, 1);
    assert.equal(result.trucks[0].unitNumber, "401");
    assert.equal(result.kept, 0);
  });

  it("keeps a truck on a load unless hours are short", () => {
    const existing = truck({
      id: "on",
      unitNumber: "118",
      driverName: "Ty Robinson",
      readiness: "ON_LOAD",
      samsaraVehicleId: "veh-118",
    });
    const ok = applyKeep(existing, "LEGAL_NOW");
    const blocked = applyKeep(existing, "HOS_BLOCKED");
    assert.equal(ok.readiness, "ON_LOAD");
    assert.equal(blocked.readiness, "HOS_BLOCKED");
  });
});

describe("samsara sync mode", () => {
  it("replaces the sample fleet automatically, otherwise merges unless asked to replace", () => {
    assert.equal(resolveSamsaraMode("merge", true), "replace");
    assert.equal(resolveSamsaraMode("merge", false), "merge");
    assert.equal(resolveSamsaraMode("replace", false), "replace");
  });
});

function applyKeep(existing: Truck, readiness: Truck["readiness"]) {
  return mergeSamsaraTrucks(
    [existing],
    [
      mapped(
        {
          id: "x",
          unitNumber: existing.unitNumber,
          samsaraVehicleId: existing.samsaraVehicleId,
          readiness,
        },
        { hosKnown: true },
      ),
    ],
    "merge",
  ).trucks[0];
}

describe("samsara secrets and oauth state", () => {
  it("round-trips encrypted secrets and tokens", () => {
    const secret = encryptSecret("super-token");
    assert.notEqual(secret, "super-token");
    assert.equal(decryptSecret(secret), "super-token");
    const blob = encryptTokens({
      accessToken: "a",
      refreshToken: "r",
      expiresAt: 123,
      scope: "admin:read",
    });
    const tokens = decryptTokens(blob);
    assert.equal(tokens.accessToken, "a");
    assert.equal(tokens.refreshToken, "r");
    assert.equal(tokens.expiresAt, 123);
  });

  it("signs and verifies oauth state", () => {
    const { nonce, signed } = createOAuthState();
    assert.equal(verifyOAuthState(signed, nonce), true);
    assert.equal(verifyOAuthState(signed, "nope"), false);
    assert.equal(verifyOAuthState(undefined, nonce), false);
    assert.ok(verifySignedValue(signValue("abc")));
    assert.equal(verifySignedValue("abc.not-a-mac"), null);
  });
});

describe("samsara config and errors", () => {
  it("reports missing env without throwing", () => {
    const prevId = process.env.SAMSARA_CLIENT_ID;
    const prevSecret = process.env.SAMSARA_CLIENT_SECRET;
    delete process.env.SAMSARA_CLIENT_ID;
    delete process.env.SAMSARA_CLIENT_SECRET;
    const config = getSamsaraConfig();
    assert.equal(config.configured, false);
    assert.equal(isSamsaraConfigured(), false);
    assert.ok(config.missing.includes("SAMSARA_CLIENT_ID"));
    assert.ok(config.redirectUri.includes("/api/integrations/samsara/callback"));
    if (prevId === undefined) delete process.env.SAMSARA_CLIENT_ID;
    else process.env.SAMSARA_CLIENT_ID = prevId;
    if (prevSecret === undefined) delete process.env.SAMSARA_CLIENT_SECRET;
    else process.env.SAMSARA_CLIENT_SECRET = prevSecret;
  });

  it("never returns API jargon to the dispatcher", () => {
    assert.match(friendlySamsaraError({ status: 401 }), /signed us out/i);
    assert.match(friendlySamsaraError({ status: 403 }), /read permissions/i);
    assert.match(friendlySamsaraError({ code: "scope_not_granted" }), /wasn't granted|CSV/i);
    assert.doesNotMatch(friendlySamsaraError({ status: 500, message: "ECONNREFUSED oauth2/token" }), /ECONNREFUSED/);
    assert.doesNotMatch(friendlySamsaraError({ status: 500, message: "invalid_grant" }), /invalid_grant/);
  });
});

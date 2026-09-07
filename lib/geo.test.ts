import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { haversineMiles } from "./geo";

describe("haversineMiles", () => {
  it("returns ~0 for the same point", () => {
    assert.ok(haversineMiles({ lat: 41.88, lng: -87.63 }, { lat: 41.88, lng: -87.63 }) < 0.1);
  });

  it("computes Chicago to Indianapolis in a realistic band", () => {
    const miles = haversineMiles(
      { lat: 41.8781, lng: -87.6298 },
      { lat: 39.7684, lng: -86.1581 },
    );
    assert.ok(miles > 150 && miles < 200, `got ${miles}`);
  });
});

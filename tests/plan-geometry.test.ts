import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  areaPxToUnits,
  computeMeasurementValue,
  distancePx,
  parseDimensionTokens,
  pixelsPerUnitFromCalibration,
  polygonAreaPx,
  polylineLengthPx,
} from "../src/lib/plans/geometry";

describe("plan geometry", () => {
  it("measures distance and polyline length", () => {
    assert.equal(distancePx({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
    assert.equal(
      polylineLengthPx([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ]),
      20
    );
  });

  it("computes polygon area with shoelace", () => {
    const area = polygonAreaPx([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 },
    ]);
    assert.equal(area, 50);
  });

  it("calibrates pixels per unit", () => {
    const ppu = pixelsPerUnitFromCalibration({ x: 0, y: 0 }, { x: 100, y: 0 }, 10);
    assert.equal(ppu, 10);
    assert.equal(areaPxToUnits(100, 10), 1);
  });

  it("returns length/area in feet when scaled", () => {
    const length = computeMeasurementValue(
      "LENGTH",
      [
        { x: 0, y: 0 },
        { x: 120, y: 0 },
      ],
      12
    );
    assert.equal(length.value, 10);
    assert.equal(length.unit, "ft");

    const area = computeMeasurementValue(
      "AREA",
      [
        { x: 0, y: 0 },
        { x: 12, y: 0 },
        { x: 12, y: 12 },
        { x: 0, y: 12 },
      ],
      12
    );
    assert.equal(area.value, 1);
    assert.equal(area.unit, "sf");
  });

  it("parses OCR dimension tokens", () => {
    const dims = parseDimensionTokens(`Living 12'-6" x 14 ft  Wall 3.5' Door 36"`);
    assert.ok(dims.some((d) => d.feet === 12.5));
    assert.ok(dims.some((d) => d.feet === 14));
    assert.ok(dims.some((d) => Math.abs(d.feet - 3) < 0.01 || d.feet === 3.5));
  });
});

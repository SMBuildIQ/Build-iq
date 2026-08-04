/** Geometry helpers for plan measuring tools (pixel space → real units). */

export type PlanPoint = { x: number; y: number };

export function distancePx(a: PlanPoint, b: PlanPoint) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function polylineLengthPx(points: PlanPoint[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distancePx(points[i - 1], points[i]);
  }
  return total;
}

/** Shoelace formula; returns absolute area in px². */
export function polygonAreaPx(points: PlanPoint[]) {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function pxToUnits(px: number, pixelsPerUnit: number) {
  if (!pixelsPerUnit || pixelsPerUnit <= 0) return null;
  return px / pixelsPerUnit;
}

export function areaPxToUnits(areaPx: number, pixelsPerUnit: number) {
  if (!pixelsPerUnit || pixelsPerUnit <= 0) return null;
  return areaPx / (pixelsPerUnit * pixelsPerUnit);
}

export function computeMeasurementValue(
  type: string,
  points: PlanPoint[],
  pixelsPerUnit: number | null | undefined
): { value: number | null; unit: string | null } {
  const scale = pixelsPerUnit && pixelsPerUnit > 0 ? pixelsPerUnit : null;

  if (type === "COUNT") {
    return { value: points.length, unit: "ea" };
  }
  if (type === "CALIBRATION") {
    return { value: points.length >= 2 ? distancePx(points[0], points[1]) : null, unit: "px" };
  }
  if (type === "LENGTH" || type === "POLYLINE") {
    const px = type === "LENGTH" && points.length >= 2
      ? distancePx(points[0], points[1])
      : polylineLengthPx(points);
    if (!scale) return { value: Math.round(px * 10) / 10, unit: "px" };
    return { value: Math.round(pxToUnits(px, scale)! * 100) / 100, unit: "ft" };
  }
  if (type === "AREA") {
    const area = polygonAreaPx(points);
    if (!scale) return { value: Math.round(area), unit: "px²" };
    return { value: Math.round(areaPxToUnits(area, scale)! * 100) / 100, unit: "sf" };
  }
  return { value: null, unit: null };
}

/** Derive pixels-per-unit from two calibration points and a known real length. */
export function pixelsPerUnitFromCalibration(
  a: PlanPoint,
  b: PlanPoint,
  realLength: number
) {
  if (realLength <= 0) return null;
  const px = distancePx(a, b);
  if (px <= 0) return null;
  return px / realLength;
}

/** Parse common dimension strings from OCR text: 12'-6", 24 ft, 3.5', etc. */
export function parseDimensionTokens(text: string): { raw: string; feet: number }[] {
  const results: { raw: string; feet: number }[] = [];
  const patterns = [
    /(\d+)\s*['′]\s*-?\s*(\d+(?:\.\d+)?)\s*["″]?/g, // 12'-6"
    /(\d+(?:\.\d+)?)\s*['′](?!\d)/g, // 12'
    /(\d+(?:\.\d+)?)\s*(?:ft|feet)\b/gi,
    /(\d+(?:\.\d+)?)\s*["″]/g, // inches only → convert
  ];

  const seen = new Set<string>();

  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0].trim();
      if (seen.has(raw)) continue;
      seen.add(raw);
      let feet = 0;
      if (m[2] !== undefined && /['′]/.test(raw)) {
        feet = Number(m[1]) + Number(m[2]) / 12;
      } else if (/["″]/.test(raw) && !/['′]|ft|feet/i.test(raw)) {
        feet = Number(m[1]) / 12;
      } else {
        feet = Number(m[1]);
      }
      if (Number.isFinite(feet) && feet > 0 && feet < 500) {
        results.push({ raw, feet: Math.round(feet * 100) / 100 });
      }
    }
  }

  return results;
}

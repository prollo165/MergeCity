import { MAX_BUILDING_HEIGHT } from '../game/tiers';

/**
 * Kippwinkel: Verhältnis von Kachelhöhe zu Kachelbreite. Klein = flacher Blick
 * von der Seite, groß = steiler Blick von oben.
 */
export const TILTS = [0.36, 0.5, 0.66] as const;
export const DEFAULT_TILT = 1;
export const MIN_TILT = TILTS[0];
export const MAX_TILT = TILTS[TILTS.length - 1];

/** Stockwerkshöhe bei mittlerem Kippwinkel, relativ zur Kachelbreite. */
const FLOOR_RATIO = 0.3;

/**
 * Je steiler von oben, desto kürzer erscheinen die Gebäude – wie beim Kippen
 * eines echten Modells.
 */
export function floorHeight(tileWidth: number, tilt: number): number {
  const reference = Math.sqrt(1 - 0.5 * 0.5);
  return tileWidth * FLOOR_RATIO * (Math.sqrt(1 - tilt * tilt) / reference);
}

export type Point = readonly [number, number];

export interface Projector {
  /** halbe Kachelbreite */
  hw: number;
  /** halbe Kachelhöhe */
  hh: number;
  /** Höhe eines Stockwerks in Pixeln */
  zu: number;
  /**
   * Projiziert einen Punkt im Zellen-Koordinatensystem (x/y in Zellenanteilen
   * relativ zur Zellmitte, z in Stockwerken) auf die Bildfläche.
   */
  p: (x: number, y: number, z: number) => Point;
}

export function projector(tileWidth: number, tilt: number = TILTS[DEFAULT_TILT]): Projector {
  const hw = tileWidth / 2;
  const hh = (tileWidth * tilt) / 2;
  const zu = floorHeight(tileWidth, tilt);
  return {
    hw,
    hh,
    zu,
    p: (x, y, z) => [(x - y) * hw, (x + y) * hh - z * zu],
  };
}

export function polygon(points: Point[]): string {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

// ---------------------------------------------------------------------------
// Drehung
// ---------------------------------------------------------------------------

/** Blickrichtung in 90°-Schritten, im Uhrzeigersinn. */
export type Rotation = 0 | 1 | 2 | 3;

export function normalizeRotation(rotation: number): Rotation {
  return (((rotation % 4) + 4) % 4) as Rotation;
}

/** Dreht ein Rasterfeld in die aktuelle Blickrichtung. */
export function rotateCell(x: number, y: number, rotation: Rotation, grid: number): { x: number; y: number } {
  const last = grid - 1;
  switch (rotation) {
    case 1:
      return { x: last - y, y: x };
    case 2:
      return { x: last - x, y: last - y };
    case 3:
      return { x: y, y: last - x };
    default:
      return { x, y };
  }
}

/** Umkehrung von `rotateCell`. */
export function unrotateCell(x: number, y: number, rotation: Rotation, grid: number): { x: number; y: number } {
  return rotateCell(x, y, normalizeRotation(4 - rotation), grid);
}

/** Dreht einen Versatz innerhalb eines Gebäudes mit. */
export function rotateOffset(dx: number, dy: number, rotation: Rotation): Point {
  switch (rotation) {
    case 1:
      return [-dy, dx];
    case 2:
      return [-dx, -dy];
    case 3:
      return [dy, -dx];
    default:
      return [dx, dy];
  }
}

// ---------------------------------------------------------------------------
// Maße
// ---------------------------------------------------------------------------

/**
 * Maße der Gebäude-Ebene (ein SVG pro Kachel). Sie fasst den höchsten Turm beim
 * flachsten Blickwinkel, damit beim Kippen nichts abgeschnitten wird.
 */
export function tileCanvas(tileWidth: number) {
  const zu = floorHeight(tileWidth, MIN_TILT);
  const width = tileWidth * 1.5;
  const bottom = tileWidth * (MAX_TILT / 2 + 0.12);
  const height = bottom + tileWidth * 0.3 + MAX_BUILDING_HEIGHT * zu;
  /** y-Position des Zellmittelpunkts innerhalb des SVGs */
  const groundY = height - bottom;
  return { width, height, groundY };
}

/** Bildschirmposition der Mitte einer Rasterzelle, relativ zum Rasterursprung. */
export function cellCenter(x: number, y: number, tileWidth: number, tilt: number): Point {
  const { hw, hh } = projector(tileWidth, tilt);
  return [(x - y) * hw, (x + y + 1) * hh];
}

/** Umkehrung: Bildschirmpunkt → Rasterfeld in Blickrichtung. */
export function pointToCell(px: number, py: number, tileWidth: number, tilt: number): { x: number; y: number } {
  const { hw, hh } = projector(tileWidth, tilt);
  const u = px / hw;
  const v = py / hh;
  return { x: Math.floor((v + u) / 2), y: Math.floor((v - u) / 2) };
}

import { MAX_BUILDING_HEIGHT } from '../game/tiers';

/** Verhältnis Kachelhöhe zu Kachelbreite – klassische 2:1-Isometrie. */
export const ISO_RATIO = 0.5;
/** Höhe eines Stockwerks, relativ zur Kachelbreite. */
export const FLOOR_RATIO = 0.3;

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

export function projector(tileWidth: number): Projector {
  const hw = tileWidth / 2;
  const hh = (tileWidth * ISO_RATIO) / 2;
  const zu = tileWidth * FLOOR_RATIO;
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

/** Maße der einzelnen Gebäude-Ebene (ein SVG pro Kachel). */
export function tileCanvas(tileWidth: number) {
  const zu = tileWidth * FLOOR_RATIO;
  const width = tileWidth * 1.5;
  const height = tileWidth * 0.75 + MAX_BUILDING_HEIGHT * zu;
  /** y-Position des Zellmittelpunkts innerhalb des SVGs */
  const groundY = height - tileWidth * 0.42;
  return { width, height, groundY };
}

/** Bildschirmposition der Mitte einer Rasterzelle, relativ zum Rasterursprung. */
export function cellCenter(x: number, y: number, tileWidth: number): Point {
  const { hw, hh } = projector(tileWidth);
  return [(x - y) * hw, (x + y + 1) * hh];
}

/** Umkehrung: Bildschirmpunkt → Rasterzelle (kann außerhalb des Rasters liegen). */
export function pointToCell(px: number, py: number, tileWidth: number): { x: number; y: number } {
  const { hw, hh } = projector(tileWidth);
  const u = px / hw;
  const v = py / hh;
  return { x: Math.floor((v + u) / 2), y: Math.floor((v - u) / 2) };
}

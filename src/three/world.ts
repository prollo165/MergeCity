import { GRID } from '../game/logic';

/** Kantenlänge einer Rasterzelle in Welteinheiten. */
export const CELL = 1;
/** Höhe eines Stockwerks. */
export const FLOOR = 0.34;
/** Dicke der Bauplatte. */
export const PLATE_HEIGHT = 0.42;
/** Rand der Platte um das Raster herum. */
export const PLATE_MARGIN = 0.45;
export const PLATE_SIZE = GRID + 2 * PLATE_MARGIN;

/** Weltposition der Mitte eines Rasterfeldes. */
export function cellPosition(x: number, y: number): [number, number, number] {
  return [x - (GRID - 1) / 2, 0, y - (GRID - 1) / 2];
}

/** Umkehrung: Weltpunkt auf der Bodenebene → Rasterfeld. */
export function worldToCell(x: number, z: number): { x: number; y: number } | null {
  const cx = Math.round(x + (GRID - 1) / 2);
  const cy = Math.round(z + (GRID - 1) / 2);
  if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) return null;
  return { x: cx, y: cy };
}

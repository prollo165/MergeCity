import { GRID } from '../game/logic';
import { MAX_TILT, MIN_TILT, TILTS, projector, tileCanvas } from './iso';

/** Rand des Bauplatzes um das Raster herum, in Zellenanteilen. */
export const PLATE_MARGIN = 0.35;

export interface BoardLayout {
  tw: number;
  tilt: number;
  width: number;
  height: number;
  /** Position des Rasterursprungs (obere Ecke von Feld 0/0) im Container */
  originX: number;
  originY: number;
  plate: { minX: number; minY: number; maxX: number; maxY: number; thickness: number };
  canvas: ReturnType<typeof tileCanvas>;
}

function plateBox(tw: number, tilt: number) {
  const { hw, hh } = projector(tw, tilt);
  const m = PLATE_MARGIN;
  const thickness = tw * 0.16;
  return {
    minX: -(GRID + 2 * m) * hw,
    maxX: (GRID + 2 * m) * hw,
    minY: -2 * m * hh,
    maxY: (2 * GRID + 2 * m) * hh + thickness,
    thickness,
  };
}

/** Luft über dem Bauplatz, damit auch Türme der letzten Epoche hineinpassen. */
function headroom(tw: number) {
  const canvas = tileCanvas(tw);
  const { hh } = projector(tw, MIN_TILT);
  return canvas.groundY - hh;
}

/**
 * Der Container ist immer so hoch wie beim steilsten Blickwinkel – dadurch
 * ändert sich beim Kippen nur der Bauplatz, nicht das Seitenlayout.
 */
export function boardLayout(tw: number, tilt: number = TILTS[1]): BoardLayout {
  const plate = plateBox(tw, tilt);
  const widest = plateBox(tw, MAX_TILT);
  const top = headroom(tw);
  const reserved = widest.maxY - widest.minY;
  const own = plate.maxY - plate.minY;

  return {
    tw,
    tilt,
    width: plate.maxX - plate.minX,
    height: top + reserved,
    originX: -plate.minX,
    // Der Bauplatz bleibt in der reservierten Fläche mittig.
    originY: top + (reserved - own) / 2 - plate.minY,
    plate,
    canvas: tileCanvas(tw),
  };
}

/** Kachelbreite, die in den verfügbaren Platz passt. */
export function fitTileWidth(availableWidth: number, availableHeight: number): number {
  const byWidth = availableWidth / (GRID + 2 * PLATE_MARGIN);
  const probe = boardLayout(100, MAX_TILT);
  const byHeight = (availableHeight * 100) / probe.height;
  return Math.max(36, Math.min(byWidth, byHeight, 82));
}

import { GRID } from '../game/logic';
import { projector, tileCanvas } from './iso';

/** Rand des Bauplatzes um das Raster herum, in Zellenanteilen. */
export const PLATE_MARGIN = 0.35;

export interface BoardLayout {
  tw: number;
  width: number;
  height: number;
  /** Position des Rasterursprungs (obere Ecke von Zelle 0/0) im Container */
  originX: number;
  originY: number;
  plate: { minX: number; minY: number; maxX: number; maxY: number; thickness: number };
  canvas: ReturnType<typeof tileCanvas>;
}

export function boardLayout(tw: number): BoardLayout {
  const { hw, hh } = projector(tw);
  const m = PLATE_MARGIN;
  const thickness = tw * 0.16;

  const plate = {
    minX: -(GRID + 2 * m) * hw,
    maxX: (GRID + 2 * m) * hw,
    minY: -2 * m * hh,
    maxY: (2 * GRID + 2 * m) * hh + thickness,
    thickness,
  };

  // Platz nach oben, damit auch Türme der letzten Epoche vollständig zu sehen sind.
  const headroom = tw * 2.75;

  return {
    tw,
    width: plate.maxX - plate.minX,
    height: headroom + (plate.maxY - plate.minY),
    originX: -plate.minX,
    originY: headroom - plate.minY,
    plate,
    canvas: tileCanvas(tw),
  };
}

/** Kachelbreite, die in den verfügbaren Platz passt. */
export function fitTileWidth(availableWidth: number, availableHeight: number): number {
  const byWidth = availableWidth / (GRID + 2 * PLATE_MARGIN);
  // height ≈ tw * (2.5 headroom + (2*GRID + 2*m) * 0.25 + 0.16)
  const heightFactor = 2.75 + (2 * GRID + 2 * PLATE_MARGIN) * 0.25 + 0.16;
  const byHeight = availableHeight / heightFactor;
  return Math.max(44, Math.min(byWidth, byHeight, 82));
}

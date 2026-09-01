import React from 'react';
import Svg, { Ellipse, G, Polygon } from 'react-native-svg';
import { GRID } from '../game/logic';
import { Point, polygon, projector } from './iso';
import { BoardLayout, PLATE_MARGIN } from './layout';
import { theme } from './theme';

interface PlateProps {
  layout: BoardLayout;
  /** Grundstücke, die im Abriss-Modus hervorgehoben werden */
  highlight?: number[];
}

/** Der Bauplatz: eine leicht erhabene Platte mit einzelnen Grundstücken. */
export const Plate = React.memo(function Plate({ layout, highlight }: PlateProps) {
  const { tw, plate, tilt } = layout;
  const { hw, hh } = projector(tw, tilt);
  const g = (x: number, y: number): Point => [(x - y) * hw, (x + y) * hh];
  const m = PLATE_MARGIN;
  const t = plate.thickness;

  const north = g(-m, -m);
  const east = g(GRID + m, -m);
  const south = g(GRID + m, GRID + m);
  const west = g(-m, GRID + m);

  const plots: React.ReactNode[] = [];
  const inset = 0.07;
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const a = g(x + inset, y + inset);
      const b = g(x + 1 - inset, y + inset);
      const c = g(x + 1 - inset, y + 1 - inset);
      const d = g(x + inset, y + 1 - inset);
      const isHighlighted = highlight?.includes(y * GRID + x);
      plots.push(
        <Polygon
          key={`plot-${x}-${y}`}
          points={polygon([a, b, c, d])}
          fill={isHighlighted ? '#E8C6B6' : theme.color.plot}
          stroke={isHighlighted ? theme.color.accent : 'none'}
          strokeWidth={isHighlighted ? 1.6 : 0}
          opacity={isHighlighted ? 1 : 0.75}
        />,
      );
    }
  }

  // Ein paar Bäume am hinteren Rand – sie liegen immer hinter der Bebauung.
  const greenery: React.ReactNode[] = [];
  const spots: Array<[number, number]> = [];
  for (let i = 0; i < GRID; i += 1) {
    spots.push([i + 0.25, -m * 0.55]);
    spots.push([-m * 0.55, i + 0.7]);
  }
  spots.forEach(([gx, gy], i) => {
    const [cx, cy] = g(gx, gy);
    const size = 4.2 + ((i * 7) % 3) * 0.9;
    const scale = tw / 64;
    greenery.push(
      <G key={`tree-${i}`}>
        <Ellipse cx={cx} cy={cy} rx={size * scale * 0.9} ry={size * scale * 0.45} fill="#B9C7B4" opacity={0.55} />
        <Ellipse cx={cx} cy={cy - size * scale * 1.1} rx={size * scale * 0.8} ry={size * scale} fill={i % 2 ? '#7FA37A' : '#6E9B6A'} />
      </G>,
    );
  });

  return (
    <Svg
      width={layout.width}
      height={plate.maxY - plate.minY}
      viewBox={`${plate.minX} ${plate.minY} ${layout.width} ${plate.maxY - plate.minY}`}
      style={{ position: 'absolute', left: 0, top: layout.originY + plate.minY }}
      pointerEvents="none"
    >
      <G>
        {/* Seitenflächen der Platte */}
        <Polygon
          points={polygon([west, south, [south[0], south[1] + t], [west[0], west[1] + t]])}
          fill={theme.color.plateEdge}
        />
        <Polygon
          points={polygon([south, east, [east[0], east[1] + t], [south[0], south[1] + t]])}
          fill={theme.color.plateShadow}
        />
        {/* Oberfläche */}
        <Polygon points={polygon([north, east, south, west])} fill={theme.color.plate} />
        {plots}
        {greenery}
      </G>
    </Svg>
  );
});

import React from 'react';
import Svg from 'react-native-svg';
import { TILTS, floorHeight } from './iso';
import { tierHeight } from '../game/tiers';
import { Building } from './Building';

interface PreviewProps {
  tier: number;
  /** Kantenlänge des Vorschaufeldes */
  size: number;
}

/** Kleine Vorschau eines Gebäudes – skaliert sich selbst in das Feld hinein. */
export function BuildingPreview({ tier, size }: PreviewProps) {
  const tw = size * 0.62;
  const zu = floorHeight(tw, TILTS[1]);
  const height = tierHeight(tier) * zu + tw * 1.0;
  const width = tw * 1.7;
  const groundY = height - tw * 0.42;

  return (
    <Svg width={size} height={size} viewBox={`${-width / 2} ${-groundY} ${width} ${height}`}>
      <Building tier={tier} tw={tw} />
    </Svg>
  );
}

import React from 'react';
import { Circle, Ellipse, G, Path, Polygon } from 'react-native-svg';
import { Block, TierSpec, tierSpec } from '../game/tiers';
import { Point, Projector, polygon, projector } from './iso';
import { shade } from './theme';

interface BuildingProps {
  tier: number;
  /** Kachelbreite in Pixeln */
  tw: number;
  /** Skaliert das Gebäude (z. B. für die Vorschau) */
  scale?: number;
}

interface BoxGeometry {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

function boxFrom(block: Block, z0: number): BoxGeometry {
  const dx = block.dx ?? 0;
  const dy = block.dy ?? 0;
  return {
    x0: dx - block.fw / 2,
    x1: dx + block.fw / 2,
    y0: dy - block.fd / 2,
    y1: dy + block.fd / 2,
    z0,
    z1: z0 + block.h,
  };
}

/** Die drei sichtbaren Flächen eines Quaders. */
function boxFaces(g: BoxGeometry, p: Projector['p']) {
  const top: Point[] = [p(g.x0, g.y0, g.z1), p(g.x1, g.y0, g.z1), p(g.x1, g.y1, g.z1), p(g.x0, g.y1, g.z1)];
  const left: Point[] = [p(g.x0, g.y1, g.z1), p(g.x1, g.y1, g.z1), p(g.x1, g.y1, g.z0), p(g.x0, g.y1, g.z0)];
  const right: Point[] = [p(g.x1, g.y0, g.z1), p(g.x1, g.y1, g.z1), p(g.x1, g.y1, g.z0), p(g.x1, g.y0, g.z0)];
  return { top, left, right };
}

function Box({ g, p, spec, topColor }: { g: BoxGeometry; p: Projector['p']; spec: TierSpec; topColor?: string }) {
  const faces = boxFaces(g, p);
  return (
    <G>
      <Polygon points={polygon(faces.top)} fill={topColor ?? shade(spec.colors.left, 0.06)} />
      <Polygon points={polygon(faces.left)} fill={spec.colors.left} />
      <Polygon points={polygon(faces.right)} fill={spec.colors.right} />
    </G>
  );
}

/** Einzelne Fenster – für alles vor der Glasarchitektur. */
function punchedWindows(g: BoxGeometry, p: Projector['p'], spec: TierSpec, key: string) {
  const height = g.z1 - g.z0;
  const floors = Math.max(1, Math.round(height));
  const step = height / floors;
  const spanX = g.x1 - g.x0;
  const spanY = g.y1 - g.y0;
  const glass = spec.colors.glass ?? shade(spec.colors.right, -0.3);
  const starts = [0.18, 0.56];
  const w = 0.26;
  const nodes: React.ReactNode[] = [];

  for (let f = 0; f < floors; f += 1) {
    const zc = g.z0 + step * (f + 0.5);
    const zTop = zc + step * 0.2;
    const zBot = zc - step * 0.2;
    starts.forEach((t, i) => {
      const xa = g.x0 + spanX * t;
      const xb = g.x0 + spanX * (t + w);
      nodes.push(
        <Polygon
          key={`${key}-pl-${f}-${i}`}
          points={polygon([p(xa, g.y1, zTop), p(xb, g.y1, zTop), p(xb, g.y1, zBot), p(xa, g.y1, zBot)])}
          fill={glass}
        />,
      );
      const ya = g.y0 + spanY * t;
      const yb = g.y0 + spanY * (t + w);
      nodes.push(
        <Polygon
          key={`${key}-pr-${f}-${i}`}
          points={polygon([p(g.x1, ya, zTop), p(g.x1, yb, zTop), p(g.x1, yb, zBot), p(g.x1, ya, zBot)])}
          fill={shade(glass, -0.08)}
        />,
      );
    });
  }
  return nodes;
}

/** Waagerechte Fensterbänder auf den beiden sichtbaren Fassaden. */
function windowBands(g: BoxGeometry, p: Projector['p'], spec: TierSpec, key: string) {
  const height = g.z1 - g.z0;
  const count = Math.max(1, Math.round(height / 1));
  const step = height / count;
  const glass = spec.colors.glass ?? shade(spec.colors.right, -0.12);
  const insetX = (g.x1 - g.x0) * 0.16;
  const insetY = (g.y1 - g.y0) * 0.16;
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < count; i += 1) {
    const zc = g.z0 + step * (i + 0.5);
    const zTop = zc + step * 0.22;
    const zBot = zc - step * 0.22;
    nodes.push(
      <Polygon
        key={`${key}-l-${i}`}
        points={polygon([
          p(g.x0 + insetX, g.y1, zTop),
          p(g.x1 - insetX, g.y1, zTop),
          p(g.x1 - insetX, g.y1, zBot),
          p(g.x0 + insetX, g.y1, zBot),
        ])}
        fill={glass}
        opacity={0.9}
      />,
    );
    nodes.push(
      <Polygon
        key={`${key}-r-${i}`}
        points={polygon([
          p(g.x1, g.y0 + insetY, zTop),
          p(g.x1, g.y1 - insetY, zTop),
          p(g.x1, g.y1 - insetY, zBot),
          p(g.x1, g.y0 + insetY, zBot),
        ])}
        fill={shade(glass, -0.1)}
        opacity={0.9}
      />,
    );
  }
  return nodes;
}

/** Senkrechte Säulen (Antike) */
function columns(g: BoxGeometry, p: Projector['p'], spec: TierSpec) {
  const nodes: React.ReactNode[] = [];
  const n = 4;
  const w = (g.x1 - g.x0) / (n * 3.4);
  const color = shade(spec.colors.left, -0.24);
  for (let i = 0; i < n; i += 1) {
    const t = (i + 0.5) / n;
    const x = g.x0 + (g.x1 - g.x0) * t;
    const y = g.y0 + (g.y1 - g.y0) * t;
    nodes.push(
      <Polygon
        key={`col-l-${i}`}
        points={polygon([p(x - w, g.y1, g.z1), p(x + w, g.y1, g.z1), p(x + w, g.y1, g.z0), p(x - w, g.y1, g.z0)])}
        fill={color}
      />,
    );
    nodes.push(
      <Polygon
        key={`col-r-${i}`}
        points={polygon([p(g.x1, y - w, g.z1), p(g.x1, y + w, g.z1), p(g.x1, y + w, g.z0), p(g.x1, y - w, g.z0)])}
        fill={shade(color, -0.06)}
      />,
    );
  }
  return nodes;
}

/** Fachwerk-Balken */
function timber(g: BoxGeometry, p: Projector['p'], spec: TierSpec) {
  const color = spec.colors.accent;
  const t = (g.z1 - g.z0) * 0.05;
  const nodes: React.ReactNode[] = [];
  for (const z of [g.z0 + t, g.z1 - t]) {
    nodes.push(
      <Polygon
        key={`beam-l-${z}`}
        points={polygon([p(g.x0, g.y1, z + t), p(g.x1, g.y1, z + t), p(g.x1, g.y1, z - t), p(g.x0, g.y1, z - t)])}
        fill={color}
      />,
    );
    nodes.push(
      <Polygon
        key={`beam-r-${z}`}
        points={polygon([p(g.x1, g.y0, z + t), p(g.x1, g.y1, z + t), p(g.x1, g.y1, z - t), p(g.x1, g.y0, z - t)])}
        fill={shade(color, -0.06)}
      />,
    );
  }
  return nodes;
}

/** Satteldach; ridge === 'x' lässt den First in x-Richtung laufen. */
function gableRoof(g: BoxGeometry, p: Projector['p'], spec: TierSpec, rise: number, ridge: 'x' | 'y', overhang = 0.04) {
  const x0 = g.x0 - overhang;
  const x1 = g.x1 + overhang;
  const y0 = g.y0 - overhang;
  const y1 = g.y1 + overhang;
  const z = g.z1;
  const zr = g.z1 + rise;
  const roof = spec.colors.top;
  const roofBack = shade(roof, -0.08);
  const gableFill = shade(spec.colors.left, -0.04);

  if (ridge === 'x') {
    const ym = (y0 + y1) / 2;
    return (
      <G>
        <Polygon points={polygon([p(x0, y0, z), p(x1, y0, z), p(x1, ym, zr), p(x0, ym, zr)])} fill={roofBack} />
        <Polygon points={polygon([p(x1, y0, z), p(x1, ym, zr), p(x1, y1, z)])} fill={gableFill} />
        <Polygon points={polygon([p(x0, ym, zr), p(x1, ym, zr), p(x1, y1, z), p(x0, y1, z)])} fill={roof} />
      </G>
    );
  }
  const xm = (x0 + x1) / 2;
  return (
    <G>
      <Polygon points={polygon([p(x0, y0, z), p(x0, y1, z), p(xm, y1, zr), p(xm, y0, zr)])} fill={roofBack} />
      <Polygon points={polygon([p(x0, y1, z), p(xm, y1, zr), p(x1, y1, z)])} fill={gableFill} />
      <Polygon points={polygon([p(xm, y0, zr), p(xm, y1, zr), p(x1, y1, z), p(x1, y0, z)])} fill={roof} />
    </G>
  );
}

/** Walmdach: First verkürzt, alle vier Seiten geneigt. */
function hipRoof(g: BoxGeometry, p: Projector['p'], spec: TierSpec, rise: number, overhang = 0.04) {
  const x0 = g.x0 - overhang;
  const x1 = g.x1 + overhang;
  const y0 = g.y0 - overhang;
  const y1 = g.y1 + overhang;
  const z = g.z1;
  const zr = z + rise;
  const ym = (y0 + y1) / 2;
  const rx0 = x0 + (x1 - x0) * 0.22;
  const rx1 = x1 - (x1 - x0) * 0.22;
  const roof = spec.colors.top;

  return (
    <G>
      <Polygon points={polygon([p(x0, y0, z), p(x1, y0, z), p(rx1, ym, zr), p(rx0, ym, zr)])} fill={shade(roof, -0.08)} />
      <Polygon points={polygon([p(x1, y0, z), p(x1, y1, z), p(rx1, ym, zr)])} fill={shade(roof, -0.14)} />
      <Polygon points={polygon([p(rx0, ym, zr), p(rx1, ym, zr), p(x1, y1, z), p(x0, y1, z)])} fill={roof} />
    </G>
  );
}

/** Strohkegel der Steinzeithütte */
function coneRoof(g: BoxGeometry, p: Projector['p'], spec: TierSpec, rise: number, hw: number) {
  const r = (g.x1 - g.x0) * hw * 1.06;
  const apex = p(0, 0, g.z1 + rise);
  const base = p(0, 0, g.z1);
  const straw = spec.colors.top;
  return (
    <G>
      <Ellipse cx={base[0]} cy={base[1]} rx={r * ((g.x1 - g.x0) === 0 ? 1 : 1)} ry={r * 0.5} fill={shade(straw, -0.1)} />
      <Path
        d={`M ${(-r).toFixed(2)},${base[1].toFixed(2)} L ${apex[0].toFixed(2)},${apex[1].toFixed(2)} L ${r.toFixed(2)},${base[1].toFixed(2)} A ${r.toFixed(2)},${(r * 0.5).toFixed(2)} 0 0 1 ${(-r).toFixed(2)},${base[1].toFixed(2)} Z`}
        fill={straw}
      />
      <Path
        d={`M ${apex[0].toFixed(2)},${apex[1].toFixed(2)} L ${(r * 0.1).toFixed(2)},${(base[1] + r * 0.42).toFixed(2)} L ${r.toFixed(2)},${base[1].toFixed(2)} Z`}
        fill={shade(straw, -0.12)}
      />
    </G>
  );
}

function domeRoof(g: BoxGeometry, p: Projector['p'], spec: TierSpec, hw: number) {
  const r = (g.x1 - g.x0) * hw * 0.88;
  const base = p(0, 0, g.z1);
  const gold = spec.colors.accent;
  return (
    <G>
      <Path
        d={`M ${(-r).toFixed(2)},${base[1].toFixed(2)} A ${r.toFixed(2)},${(r * 1.15).toFixed(2)} 0 0 1 ${r.toFixed(2)},${base[1].toFixed(2)} A ${r.toFixed(2)},${(r * 0.5).toFixed(2)} 0 0 1 ${(-r).toFixed(2)},${base[1].toFixed(2)} Z`}
        fill={gold}
      />
      <Path
        d={`M ${(r * 0.15).toFixed(2)},${(base[1] - r * 1.02).toFixed(2)} A ${(r * 0.85).toFixed(2)},${(r * 1.05).toFixed(2)} 0 0 1 ${r.toFixed(2)},${base[1].toFixed(2)} A ${r.toFixed(2)},${(r * 0.5).toFixed(2)} 0 0 1 ${(r * 0.15).toFixed(2)},${(base[1] + r * 0.48).toFixed(2)} Z`}
        fill={shade(gold, -0.12)}
        opacity={0.85}
      />
      <Circle cx={0} cy={base[1] - r * 1.32} r={r * 0.1} fill={shade(gold, 0.18)} />
    </G>
  );
}

/** Dachaufbauten moderner Häuser: Technik, Wassertank, Antenne. */
function rooftopDetails(g: BoxGeometry, p: Projector['p'], spec: TierSpec, props: TierSpec['props'] = []) {
  const nodes: React.ReactNode[] = [];
  const unit = (g.x1 - g.x0) * 0.22;
  const techBox: BoxGeometry = {
    x0: -unit,
    x1: unit,
    y0: -unit * 0.8,
    y1: unit * 0.8,
    z0: g.z1,
    z1: g.z1 + 0.22,
  };
  nodes.push(<Box key="tech" g={techBox} p={p} spec={spec} topColor={shade(spec.colors.top, 0.1)} />);

  if (props.includes('antenna')) {
    const bottom = p(0.12, -0.1, g.z1 + 0.22);
    const top = p(0.12, -0.1, g.z1 + 1.1);
    nodes.push(
      <Path
        key="mast"
        d={`M ${bottom[0].toFixed(2)},${bottom[1].toFixed(2)} L ${top[0].toFixed(2)},${top[1].toFixed(2)}`}
        stroke={shade(spec.colors.right, -0.2)}
        strokeWidth={1.4}
      />,
    );
    nodes.push(<Circle key="mast-dot" cx={top[0]} cy={top[1]} r={2} fill={spec.colors.accent} />);
  }
  return nodes;
}

function trees(g: BoxGeometry, p: Projector['p'], color: string, key: string) {
  const nodes: React.ReactNode[] = [];
  const spots: Array<[number, number]> = [
    [g.x0 + 0.05, g.y1 - 0.05],
    [g.x1 - 0.06, g.y1 - 0.08],
    [g.x1 - 0.12, g.y0 + 0.06],
  ];
  spots.forEach(([x, y], i) => {
    const c = p(x, y, g.z1);
    nodes.push(<Ellipse key={`${key}-t${i}`} cx={c[0]} cy={c[1] - 5} rx={4.6} ry={5.2} fill={color} />);
    nodes.push(<Ellipse key={`${key}-s${i}`} cx={c[0]} cy={c[1]} rx={4.4} ry={2} fill={shade(color, -0.18)} opacity={0.5} />);
  });
  return nodes;
}

function Facade({ spec, tw }: { spec: TierSpec; tw: number }) {
  const { p, hw } = projector(tw);
  const nodes: React.ReactNode[] = [];
  const props = spec.props ?? [];

  let z = 0;
  const boxes: BoxGeometry[] = [];
  for (const block of spec.blocks) {
    const g = boxFrom(block, z);
    boxes.push(g);
    z = g.z1;
  }

  // Bodenschatten
  const shadow = p(0, 0, 0);
  const footprint = spec.blocks[0];
  nodes.push(
    <Ellipse
      key="shadow"
      cx={shadow[0]}
      cy={shadow[1] + 1}
      rx={footprint.fw * tw * 0.62}
      ry={footprint.fw * tw * 0.31}
      fill="#2F4038"
      opacity={0.12}
    />,
  );

  if (props.includes('glow')) {
    nodes.push(
      <Ellipse
        key="glow"
        cx={shadow[0]}
        cy={shadow[1] - 2}
        rx={footprint.fw * tw * 0.78}
        ry={footprint.fw * tw * 0.4}
        fill={spec.colors.accent}
        opacity={0.16}
      />,
    );
  }

  boxes.forEach((g, i) => {
    const isTop = i === boxes.length - 1;
    nodes.push(<Box key={`box-${i}`} g={g} p={p} spec={spec} topColor={isTop ? spec.colors.top : shade(spec.colors.top, 0.06)} />);
    if (spec.windows) {
      const banded = spec.tier >= 10;
      nodes.push(...(banded ? windowBands(g, p, spec, `win-${i}`) : punchedWindows(g, p, spec, `win-${i}`)));
    }
    if (props.includes('columns') && i === boxes.length - 1) nodes.push(...columns(g, p, spec));
    if (props.includes('timber')) nodes.push(...timber(g, p, spec));
    if (props.includes('trees') && !isTop) nodes.push(...trees(g, p, '#6E9B6A', `terrace-${i}`));
  });

  const top = boxes[boxes.length - 1];
  const base = boxes[0];

  if (spec.tier >= 2 && spec.tier <= 9 && !props.includes('columns')) {
    const doorHeight = Math.min(0.45, (base.z1 - base.z0) * 0.6);
    const cx = (base.x0 + base.x1) / 2;
    nodes.push(
      <Polygon
        key="door"
        points={polygon([
          p(cx - 0.055, base.y1, base.z0 + doorHeight),
          p(cx + 0.055, base.y1, base.z0 + doorHeight),
          p(cx + 0.055, base.y1, base.z0),
          p(cx - 0.055, base.y1, base.z0),
        ])}
        fill={shade(spec.colors.accent, -0.05)}
      />,
    );
  }

  if (props.includes('awning')) {
    const zA = base.z0 + Math.min(0.55, (base.z1 - base.z0) * 0.55);
    nodes.push(
      <Polygon
        key="awning"
        points={polygon([
          p(base.x0, base.y1, zA),
          p(base.x1, base.y1, zA),
          p(base.x1, base.y1 + 0.1, zA - 0.16),
          p(base.x0, base.y1 + 0.1, zA - 0.16),
        ])}
        fill={spec.colors.accent}
        opacity={0.95}
      />,
    );
  }

  if (props.includes('sign')) {
    const zS = top.z1 - 0.35;
    nodes.push(
      <Polygon
        key="sign"
        points={polygon([
          p(top.x1, top.y0 + 0.06, zS + 0.18),
          p(top.x1, top.y1 - 0.06, zS + 0.18),
          p(top.x1, top.y1 - 0.06, zS - 0.05),
          p(top.x1, top.y0 + 0.06, zS - 0.05),
        ])}
        fill={spec.colors.accent}
      />,
    );
  }

  if (props.includes('chimney')) {
    const c: BoxGeometry = {
      x0: base.x1 - 0.14,
      x1: base.x1 - 0.02,
      y0: base.y0 + 0.04,
      y1: base.y0 + 0.16,
      z0: base.z1 - 0.2,
      z1: base.z1 + 1.5,
    };
    nodes.push(<Box key="chimney" g={c} p={p} spec={spec} topColor={shade(spec.colors.accent, 0.12)} />);
  }

  switch (spec.roof) {
    case 'cone':
      nodes.push(<G key="roof">{coneRoof(top, p, spec, 1.0, hw)}</G>);
      break;
    case 'gable':
      nodes.push(<G key="roof">{gableRoof(top, p, spec, 0.55, 'x')}</G>);
      break;
    case 'hip':
      nodes.push(<G key="roof">{hipRoof(top, p, spec, 0.5)}</G>);
      break;
    case 'pediment':
      nodes.push(<G key="roof">{gableRoof(top, p, spec, 0.42, 'y', 0.08)}</G>);
      break;
    case 'dome':
      nodes.push(<G key="roof">{domeRoof(top, p, spec, hw)}</G>);
      break;
    case 'stepped': {
      const spireBase: BoxGeometry = {
        x0: -0.06,
        x1: 0.06,
        y0: -0.06,
        y1: 0.06,
        z0: top.z1,
        z1: top.z1 + 0.9,
      };
      nodes.push(<Box key="spire" g={spireBase} p={p} spec={spec} topColor={spec.colors.accent} />);
      const tip = p(0, 0, top.z1 + 1.5);
      const spireTop = p(0, 0, top.z1 + 0.9);
      nodes.push(
        <Path
          key="spire-tip"
          d={`M ${spireTop[0].toFixed(2)},${spireTop[1].toFixed(2)} L ${tip[0].toFixed(2)},${tip[1].toFixed(2)}`}
          stroke={spec.colors.accent}
          strokeWidth={2}
        />,
      );
      break;
    }
    case 'terrace':
      nodes.push(<G key="roof">{trees(top, p, '#6E9B6A', 'roof-trees')}</G>);
      break;
    case 'halo': {
      const ring = p(0, 0, top.z1 + 0.5);
      nodes.push(
        <Ellipse
          key="halo"
          cx={ring[0]}
          cy={ring[1]}
          rx={tw * 0.3}
          ry={tw * 0.15}
          fill="none"
          stroke={spec.colors.accent}
          strokeWidth={2.5}
          opacity={0.85}
        />,
      );
      nodes.push(...rooftopDetails(top, p, spec, spec.props));
      break;
    }
    case 'flat':
    default:
      if (spec.tier >= 10) nodes.push(...rooftopDetails(top, p, spec, spec.props));
      break;
  }

  return <G>{nodes}</G>;
}

/** Ein prozedural gezeichnetes, isometrisches Gebäude der jeweiligen Zeitstufe. */
export const Building = React.memo(function Building({ tier, tw, scale = 1 }: BuildingProps) {
  const spec = tierSpec(tier);
  if (scale === 1) return <Facade spec={spec} tw={tw} />;
  return (
    <G scale={scale}>
      <Facade spec={spec} tw={tw} />
    </G>
  );
});

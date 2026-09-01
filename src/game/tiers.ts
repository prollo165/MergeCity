/**
 * Die Zeitalter-Leiter: Jede Stufe ist ein Gebäude aus einer neuen Epoche.
 * Drei gleiche Gebäude verschmelzen zur nächsten Stufe.
 *
 * Die Gebäude werden prozedural als isometrisches SVG gezeichnet (siehe ui/Building.tsx),
 * daher beschreibt jede Stufe hier nur ihre Geometrie und Farbwelt – keine Bilddateien.
 */

export type RoofKind =
  | 'cone'      // Strohkegel
  | 'flat'      // Flachdach
  | 'gable'     // Satteldach
  | 'hip'       // Walmdach
  | 'pediment'  // Tempelgiebel
  | 'dome'      // Kuppel
  | 'stepped'   // Art-déco-Staffelung
  | 'spire'     // Turmspitze
  | 'terrace'   // begrünte Dachterrasse
  | 'halo';     // Zukunfts-Ring

export interface Block {
  /** Grundfläche in Zellen-Anteilen (1 = ganze Rasterzelle) */
  fw: number;
  fd: number;
  /** Höhe in Stockwerks-Einheiten */
  h: number;
  /** Versatz vom Blockmittelpunkt, in Zellen-Anteilen */
  dx?: number;
  dy?: number;
}

export interface TierSpec {
  tier: number;
  /** Epoche, wird im HUD angezeigt */
  era: string;
  /** Gebäudename */
  name: string;
  colors: {
    top: string;
    left: string;
    right: string;
    accent: string;
    glass?: string;
  };
  blocks: Block[];
  roof: RoofKind;
  /** Fensterbänder: ab welchem Stockwerk, wie viele pro Stockwerk */
  windows?: { from: number; step: number } | null;
  /** Zusätzliche Details */
  props?: Array<'chimney' | 'antenna' | 'columns' | 'timber' | 'awning' | 'trees' | 'glow' | 'sign'>;
}

export const MAX_TIER = 15;

export const TIERS: TierSpec[] = [
  {
    tier: 1,
    era: 'Steinzeit',
    name: 'Rundhütte',
    colors: { top: '#D9C295', left: '#B98F66', right: '#9C7550', accent: '#7A5C46' },
    blocks: [{ fw: 0.46, fd: 0.46, h: 0.55 }],
    roof: 'cone',
    windows: null,
  },
  {
    tier: 2,
    era: 'Jungsteinzeit',
    name: 'Lehmhaus',
    colors: { top: '#C9AE86', left: '#CDB48D', right: '#AB9068', accent: '#8A6F4E' },
    blocks: [{ fw: 0.52, fd: 0.5, h: 0.8 }],
    roof: 'flat',
    windows: null,
  },
  {
    tier: 3,
    era: 'Bronzezeit',
    name: 'Steinkate',
    colors: { top: '#A9603F', left: '#CFC7B4', right: '#B0A794', accent: '#8C5136' },
    blocks: [{ fw: 0.56, fd: 0.54, h: 1.0 }],
    roof: 'gable',
    windows: { from: 0, step: 1 },
  },
  {
    tier: 4,
    era: 'Antike',
    name: 'Tempel',
    colors: { top: '#C7643C', left: '#F1ECE1', right: '#D6CEC1', accent: '#B8542F' },
    blocks: [
      { fw: 0.72, fd: 0.68, h: 0.16 },
      { fw: 0.62, fd: 0.58, h: 1.05 },
    ],
    roof: 'pediment',
    windows: null,
    props: ['columns'],
  },
  {
    tier: 5,
    era: 'Römisches Reich',
    name: 'Villa',
    colors: { top: '#BF5A38', left: '#EDE2CE', right: '#D0C3AC', accent: '#9E4529' },
    blocks: [
      { fw: 0.64, fd: 0.6, h: 1.15 },
      { fw: 0.34, fd: 0.34, h: 0.55, dx: 0.12, dy: -0.08 },
    ],
    roof: 'hip',
    windows: { from: 0, step: 1 },
  },
  {
    tier: 6,
    era: 'Mittelalter',
    name: 'Fachwerkhaus',
    colors: { top: '#8C5A46', left: '#EBE0CB', right: '#CDC0A8', accent: '#6B4A38' },
    blocks: [
      { fw: 0.58, fd: 0.56, h: 1.0 },
      { fw: 0.64, fd: 0.62, h: 0.9 },
    ],
    roof: 'gable',
    windows: { from: 0, step: 1 },
    props: ['timber'],
  },
  {
    tier: 7,
    era: 'Renaissance',
    name: 'Stadthaus',
    colors: { top: '#7B4C3F', left: '#E6DAC4', right: '#C7BAA1', accent: '#5E6E63' },
    blocks: [
      { fw: 0.64, fd: 0.6, h: 2.2 },
      { fw: 0.26, fd: 0.26, h: 0.7, dx: -0.14, dy: 0.12 },
    ],
    roof: 'hip',
    windows: { from: 0, step: 1 },
  },
  {
    tier: 8,
    era: 'Barock',
    name: 'Residenz',
    colors: { top: '#6E7F76', left: '#F2EADA', right: '#D8CDB9', accent: '#C9A66B' },
    blocks: [
      { fw: 0.7, fd: 0.62, h: 2.4 },
      { fw: 0.4, fd: 0.4, h: 0.5 },
    ],
    roof: 'dome',
    windows: { from: 0, step: 1 },
  },
  {
    tier: 9,
    era: 'Industriezeit',
    name: 'Fabrik',
    colors: { top: '#5C6B66', left: '#B26A4A', right: '#8E4C36', accent: '#4A5754' },
    blocks: [
      { fw: 0.72, fd: 0.64, h: 2.3 },
    ],
    roof: 'gable',
    windows: { from: 0, step: 1 },
    props: ['chimney'],
  },
  {
    tier: 10,
    era: 'Jahrhundertwende',
    name: 'Kaufhaus',
    colors: { top: '#55665F', left: '#E7DCC6', right: '#C8BBA2', accent: '#8FB8AE', glass: '#9BC3B8' },
    blocks: [
      { fw: 0.76, fd: 0.68, h: 3.2 },
      { fw: 0.5, fd: 0.5, h: 0.4 },
    ],
    roof: 'flat',
    windows: { from: 0, step: 1 },
    props: ['awning', 'sign'],
  },
  {
    tier: 11,
    era: 'Art déco',
    name: 'Hochhaus',
    colors: { top: '#D8CDB6', left: '#EFE6D2', right: '#CFC3AA', accent: '#C7643C', glass: '#A8B9AE' },
    blocks: [
      { fw: 0.74, fd: 0.66, h: 2.6 },
      { fw: 0.58, fd: 0.52, h: 1.6 },
      { fw: 0.4, fd: 0.36, h: 1.0 },
    ],
    roof: 'stepped',
    windows: { from: 0, step: 1 },
  },
  {
    tier: 12,
    era: 'Moderne',
    name: 'Bürogebäude',
    colors: { top: '#CFCBC2', left: '#EDEAE3', right: '#CBC7BE', accent: '#7FA9A0', glass: '#8FB4AB' },
    blocks: [
      { fw: 0.78, fd: 0.7, h: 4.6 },
    ],
    roof: 'flat',
    windows: { from: 0, step: 1 },
    props: ['antenna'],
  },
  {
    tier: 13,
    era: 'Gegenwart',
    name: 'Glasturm',
    colors: { top: '#A9CFC2', left: '#6E9C88', right: '#4E7A69', accent: '#DDEAE2', glass: '#7FB3A6' },
    blocks: [
      { fw: 0.72, fd: 0.66, h: 4.2 },
      { fw: 0.56, fd: 0.5, h: 2.0 },
    ],
    roof: 'flat',
    windows: { from: 0, step: 1 },
    props: ['antenna'],
  },
  {
    tier: 14,
    era: 'Öko-Zukunft',
    name: 'Terrassenturm',
    colors: { top: '#D9E7DD', left: '#EAF1EA', right: '#C4D5C9', accent: '#6E9B6A', glass: '#9FC6B8' },
    blocks: [
      { fw: 0.78, fd: 0.7, h: 2.6 },
      { fw: 0.62, fd: 0.56, h: 2.4 },
      { fw: 0.46, fd: 0.42, h: 2.0 },
    ],
    roof: 'terrace',
    windows: { from: 0, step: 1 },
    props: ['trees'],
  },
  {
    tier: 15,
    era: 'Zukunft',
    name: 'Arkologie',
    colors: { top: '#E9F3F2', left: '#E2EFEE', right: '#B9D2D1', accent: '#3FC8BC', glass: '#8FD3CB' },
    blocks: [
      { fw: 0.7, fd: 0.64, h: 3.4 },
      { fw: 0.5, fd: 0.46, h: 2.6 },
      { fw: 0.34, fd: 0.32, h: 2.2 },
    ],
    roof: 'halo',
    windows: { from: 0, step: 1 },
    props: ['glow', 'antenna'],
  },
];

export function tierSpec(tier: number): TierSpec {
  return TIERS[Math.min(Math.max(tier, 1), MAX_TIER) - 1];
}

/** Gesamthöhe einer Stufe in Stockwerks-Einheiten (für Layout-Reserven) */
export function tierHeight(tier: number): number {
  return tierSpec(tier).blocks.reduce((sum, b) => sum + b.h, 0);
}

export const MAX_BUILDING_HEIGHT = Math.max(...TIERS.map((t) => tierHeight(t.tier))) + 1.1;

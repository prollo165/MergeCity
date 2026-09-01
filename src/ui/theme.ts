/** Minimalistische UI-Tokens – die Farbigkeit steckt in der Stadt, nicht in der Oberfläche. */
export const theme = {
  color: {
    background: '#DCE9E2',
    backgroundDeep: '#CFE0D8',
    surface: '#FFFFFF',
    ink: '#26332E',
    inkSoft: '#5F726A',
    inkFaint: '#93A69E',
    line: '#C2D5CB',
    accent: '#C7643C',
    plate: '#E8D9BC',
    plateEdge: '#CDBB9A',
    plateShadow: '#B9A684',
    plot: '#D6D9CF',
    plotLine: '#EDE6D6',
  },
  radius: { sm: 8, md: 14, lg: 22, pill: 999 },
  space: (n: number) => n * 4,
  font: {
    label: { fontSize: 11, letterSpacing: 1.6, fontWeight: '600' as const },
    value: { fontSize: 26, fontWeight: '300' as const, letterSpacing: -0.5 },
    title: { fontSize: 22, fontWeight: '400' as const, letterSpacing: 0.4 },
    body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  },
};

/** Hex-Farbe aufhellen (amount > 0) oder abdunkeln (amount < 0). */
export function shade(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((num >> 16) & 255) + 255 * amount);
  const g = clamp(((num >> 8) & 255) + 255 * amount);
  const b = clamp((num & 255) + 255 * amount);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

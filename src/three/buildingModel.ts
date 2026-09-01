import * as THREE from 'three';
import { RoofKind, TierSpec, tierSpec } from '../game/tiers';
import { FLOOR } from './world';

/**
 * Platzhalter-Modelle: Die Gebäude entstehen aus denselben Epochen-Daten wie
 * die 2D-Darstellung – gestapelte Quader plus Dachform.
 *
 * Sobald es Modelle aus Blender gibt, wird hier nur noch geladen statt gebaut:
 * `loadTierModel(tier)` ersetzt `buildPlaceholder(tier)`, der Rest der Szene
 * bleibt unverändert.
 */

const geometryCache = new Map<string, THREE.BufferGeometry>();
const materialCache = new Map<string, THREE.MeshLambertMaterial>();

function material(color: string): THREE.MeshLambertMaterial {
  let cached = materialCache.get(color);
  if (!cached) {
    cached = new THREE.MeshLambertMaterial({ color });
    materialCache.set(color, cached);
  }
  return cached;
}

function cached(key: string, create: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = create();
    geometryCache.set(key, geometry);
  }
  return geometry;
}

function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return cached(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
}

/** Satteldach: dreieckiges Prisma, First entlang der Tiefe. */
function prism(w: number, h: number, d: number): THREE.BufferGeometry {
  return cached(`prism:${w}:${h}:${d}`, () => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, h);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    geometry.translate(0, 0, -d / 2);
    return geometry;
  });
}

function pyramid(r: number, h: number): THREE.BufferGeometry {
  return cached(`pyr:${r}:${h}`, () => {
    const geometry = new THREE.ConeGeometry(r, h, 4);
    geometry.rotateY(Math.PI / 4);
    return geometry;
  });
}

function cone(r: number, h: number): THREE.BufferGeometry {
  return cached(`cone:${r}:${h}`, () => new THREE.ConeGeometry(r, h, 10));
}

function dome(r: number): THREE.BufferGeometry {
  return cached(`dome:${r}`, () => new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2));
}

function ring(r: number): THREE.BufferGeometry {
  return cached(`ring:${r}`, () => new THREE.TorusGeometry(r, r * 0.08, 8, 20));
}

function sphere(r: number): THREE.BufferGeometry {
  return cached(`sphere:${r}`, () => new THREE.SphereGeometry(r, 8, 6));
}

function mesh(geometry: THREE.BufferGeometry, color: string, position: [number, number, number]): THREE.Mesh {
  const node = new THREE.Mesh(geometry, material(color));
  node.position.set(...position);
  node.castShadow = true;
  node.receiveShadow = true;
  return node;
}

function addRoof(group: THREE.Group, spec: TierSpec, roof: RoofKind, top: { w: number; d: number; y: number }) {
  const { colors } = spec;
  switch (roof) {
    case 'cone':
      group.add(mesh(cone(top.w * 0.74, FLOOR * 1.6), colors.top, [0, top.y + FLOOR * 0.8, 0]));
      break;
    case 'gable': {
      const node = mesh(prism(top.w * 1.1, FLOOR * 0.95, top.d * 1.1), colors.top, [0, top.y, 0]);
      group.add(node);
      break;
    }
    case 'pediment': {
      const node = mesh(prism(top.d * 1.16, FLOOR * 0.8, top.w * 1.16), colors.top, [0, top.y, 0]);
      node.rotation.y = Math.PI / 2;
      group.add(node);
      break;
    }
    case 'hip':
      group.add(mesh(pyramid(top.w * 0.8, FLOOR * 1.05), colors.top, [0, top.y + FLOOR * 0.525, 0]));
      break;
    case 'dome':
      group.add(mesh(box(top.w * 0.5, FLOOR * 0.4, top.d * 0.5), colors.top, [0, top.y + FLOOR * 0.2, 0]));
      group.add(mesh(dome(top.w * 0.33), colors.accent, [0, top.y + FLOOR * 0.4, 0]));
      break;
    case 'stepped':
      group.add(mesh(box(top.w * 0.2, FLOOR * 2.4, top.d * 0.2), colors.accent, [0, top.y + FLOOR * 1.2, 0]));
      break;
    case 'spire':
      group.add(mesh(cone(top.w * 0.25, FLOOR * 3), colors.accent, [0, top.y + FLOOR * 1.5, 0]));
      break;
    case 'terrace':
      for (const [dx, dz] of [
        [-0.22, 0.18],
        [0.2, 0.2],
        [0.16, -0.2],
      ] as const) {
        group.add(mesh(sphere(0.11), '#6E9B6A', [dx, top.y + 0.12, dz]));
      }
      break;
    case 'halo': {
      const node = mesh(ring(top.w * 0.9), colors.accent, [0, top.y + FLOOR * 1.6, 0]);
      node.rotation.x = Math.PI / 2;
      group.add(node);
      group.add(mesh(box(0.05, FLOOR * 2.4, 0.05), colors.accent, [0, top.y + FLOOR * 1.2, 0]));
      break;
    }
    case 'flat':
    default:
      group.add(mesh(box(top.w * 0.42, FLOOR * 0.5, top.d * 0.42), colors.top, [0, top.y + FLOOR * 0.25, 0]));
      break;
  }
}

/** Baut ein Platzhalter-Modell für eine Epoche. */
export function buildPlaceholder(tier: number): THREE.Group {
  const spec = tierSpec(tier);
  const group = new THREE.Group();

  let y = 0;
  let top = { w: spec.blocks[0].fw, d: spec.blocks[0].fd, y: 0 };

  spec.blocks.forEach((block, i) => {
    const height = block.h * FLOOR;
    const w = block.fw;
    const d = block.fd;
    const dx = block.dx ?? 0;
    const dz = block.dy ?? 0;
    group.add(mesh(box(w, height, d), i === 0 ? spec.colors.left : spec.colors.left, [dx, y + height / 2, dz]));

    // schmales Fensterband als Andeutung der Fassade
    if (spec.windows && block.h >= 1) {
      group.add(
        mesh(box(w * 1.01, height * 0.42, d * 1.01), spec.colors.glass ?? spec.colors.right, [
          dx,
          y + height * 0.55,
          dz,
        ]),
      );
    }

    y += height;
    top = { w, d, y };
  });

  addRoof(group, spec, spec.roof, top);

  if (spec.props?.includes('chimney')) {
    group.add(mesh(box(0.1, FLOOR * 2, 0.1), spec.colors.accent, [top.w * 0.35, top.y + FLOOR, -top.d * 0.3]));
  }
  if (spec.props?.includes('antenna')) {
    group.add(mesh(box(0.035, FLOOR * 2.2, 0.035), spec.colors.right, [0.08, top.y + FLOOR * 1.4, -0.06]));
  }

  return group;
}

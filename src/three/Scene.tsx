import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Board as BoardModel, GRID, toXY } from '../game/logic';
import { theme } from '../ui/theme';
import { useFrame, useThree } from './canvas';
import { buildPlaceholder } from './buildingModel';
import { CELL, PLATE_HEIGHT, PLATE_SIZE, cellPosition } from './world';

/** Blickwinkel der Kamera – wird von den Gesten außerhalb des Canvas gesetzt. */
export interface CameraView {
  /** Drehung um die Hochachse, im Bogenmaß */
  azimuth: number;
  /** Kippwinkel über dem Boden, im Bogenmaß */
  elevation: number;
}

export const MIN_ELEVATION = 0.18;
export const MAX_ELEVATION = 1.2;
const CAMERA_DISTANCE = 24;

/** Breite und Höhe des Ausschnitts in Welteinheiten – bestimmt den Zoom. */
const VIEW_WIDTH = PLATE_SIZE * 1.42;
const VIEW_HEIGHT = PLATE_SIZE * 1.5;

export function CameraRig({ view }: { view: React.MutableRefObject<CameraView> }) {
  const { camera, size } = useThree();
  const current = useRef<CameraView>({ ...view.current });

  useEffect(() => {
    const zoom = Math.min(size.width / VIEW_WIDTH, size.height / VIEW_HEIGHT);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useFrame((_, delta) => {
    // sanftes Nachziehen, damit Drehen und Kippen weich wirken
    const factor = 1 - Math.pow(0.0015, Math.min(delta, 0.1));
    current.current.azimuth += (view.current.azimuth - current.current.azimuth) * factor;
    current.current.elevation += (view.current.elevation - current.current.elevation) * factor;

    const { azimuth, elevation } = current.current;
    camera.position.set(
      CAMERA_DISTANCE * Math.cos(elevation) * Math.sin(azimuth),
      CAMERA_DISTANCE * Math.sin(elevation),
      CAMERA_DISTANCE * Math.cos(elevation) * Math.cos(azimuth),
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export function Lights() {
  const light = useRef<THREE.DirectionalLight>(null);

  return (
    <>
      <hemisphereLight args={['#FFFFFF', theme.color.backgroundDeep, 1.15]} />
      <directionalLight
        ref={light}
        position={[6, 12, 8]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
    </>
  );
}

/** Der Bauplatz mit einzelnen Grundstücken und ein paar Bäumen am Rand. */
export function Plate({ highlight }: { highlight?: number[] }) {
  const plots = useMemo(() => {
    const list: Array<{ key: string; position: [number, number, number]; index: number }> = [];
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        const [px, , pz] = cellPosition(x, y);
        list.push({ key: `${x}-${y}`, position: [px, 0.011, pz], index: y * GRID + x });
      }
    }
    return list;
  }, []);

  const trees = useMemo(() => {
    const list: Array<{ key: string; position: [number, number, number]; scale: number }> = [];
    const edge = PLATE_SIZE / 2 - 0.24;
    for (let i = 0; i < GRID; i += 1) {
      const offset = i - (GRID - 1) / 2;
      list.push({ key: `n${i}`, position: [offset + 0.3, 0, -edge], scale: 0.9 + ((i * 7) % 3) * 0.12 });
      list.push({ key: `w${i}`, position: [-edge, 0, offset - 0.3], scale: 0.85 + ((i * 5) % 3) * 0.12 });
    }
    return list;
  }, []);

  return (
    <group>
      <mesh position={[0, -PLATE_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry args={[PLATE_SIZE, PLATE_HEIGHT, PLATE_SIZE]} />
        <meshLambertMaterial color={theme.color.plate} />
      </mesh>

      {plots.map((plot) => (
        <mesh key={plot.key} position={plot.position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[CELL * 0.86, CELL * 0.86]} />
          <meshLambertMaterial color={highlight?.includes(plot.index) ? '#E8C6B6' : theme.color.plot} />
        </mesh>
      ))}

      {trees.map((tree) => (
        <group key={tree.key} position={tree.position} scale={tree.scale}>
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, 0.32, 5]} />
            <meshLambertMaterial color="#9A7B57" />
          </mesh>
          <mesh position={[0, 0.42, 0]} castShadow>
            <sphereGeometry args={[0.19, 7, 5]} />
            <meshLambertMaterial color="#6E9B6A" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BuildingNode({ tier, index }: { tier: number; index: number }) {
  const object = useMemo(() => buildPlaceholder(tier), [tier]);
  const group = useRef<THREE.Group>(null);
  const grown = useRef(0);

  const { x, y } = toXY(index);
  const position = cellPosition(x, y);

  useFrame((_, delta) => {
    if (grown.current >= 1 || !group.current) return;
    grown.current = Math.min(1, grown.current + delta * 3.5);
    // weiches Aufpoppen mit leichtem Überschwingen
    const t = grown.current;
    const scale = 0.45 + 0.55 * (1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2));
    group.current.scale.setScalar(scale);
  });

  return (
    <group ref={group} position={position} scale={0.45} userData={{ index }}>
      <primitive object={object} />
    </group>
  );
}

export function City({ board }: { board: BoardModel }) {
  return (
    <group name="city">
      {board.map((tier, index) =>
        tier === null ? null : <BuildingNode key={`${index}-${tier}`} tier={tier} index={index} />,
      )}
    </group>
  );
}

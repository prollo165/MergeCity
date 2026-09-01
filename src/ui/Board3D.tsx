import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, GestureResponderEvent, PanResponder, PanResponderGestureState, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import * as THREE from 'three';
import { Board as BoardModel, toIndex, toXY } from '../game/logic';
import { Canvas } from '../three/canvas';
import { CameraRig, CameraView, City, Lights, MAX_ELEVATION, MIN_ELEVATION, Plate } from '../three/Scene';
import { cellPosition, worldToCell } from '../three/world';
import { theme } from './theme';

/** Ziehweg in Pixeln für eine volle Umdrehung bzw. den ganzen Kippbereich. */
const TURN_PER_PIXEL = 0.009;
const TILT_PER_PIXEL = 0.006;

interface Board3DProps {
  board: BoardModel;
  width: number;
  height: number;
  demolishMode: boolean;
  onSelect: (index: number) => void;
  flash?: { index: number; points: number; key: number } | null;
}

interface ThreeState {
  camera: THREE.Camera;
  scene: THREE.Scene;
  size: { width: number; height: number };
}

function RotateButton({ direction, onPress }: { direction: 1 | -1; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.viewButton, pressed && { backgroundColor: '#FFFFFF' }]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <G transform={direction === -1 ? 'translate(24,0) scale(-1,1)' : undefined}>
          <Path
            d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"
            stroke={theme.color.inkSoft}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M20.5 3.4v5.2h-5.2"
            stroke={theme.color.inkSoft}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </G>
      </Svg>
    </Pressable>
  );
}

function FloatingScore({ points, left, top, trigger }: { points: number; left: number; top: number; trigger: number }) {
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    rise.setValue(0);
    Animated.timing(rise, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [rise, trigger]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: left - 50,
        top,
        width: 100,
        alignItems: 'center',
        opacity: rise.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) }],
      }}
    >
      <Text style={styles.floating}>+{points.toLocaleString('de-DE')}</Text>
    </Animated.View>
  );
}

function touchPoint(event: GestureResponderEvent, gesture: PanResponderGestureState) {
  const native = event.nativeEvent as GestureResponderEvent['nativeEvent'] & {
    clientX?: number;
    clientY?: number;
    changedTouches?: ArrayLike<{ pageX?: number; pageY?: number; clientX?: number; clientY?: number }>;
  };
  const touch = native.changedTouches?.length ? native.changedTouches[0] : undefined;
  const source = touch ?? native;
  const x = source.pageX ?? source.clientX ?? gesture.x0;
  const y = source.pageY ?? source.clientY ?? gesture.y0;
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  return { x, y };
}

/** Die Stadt als 3D-Modell: antippen zum Bauen, ziehen zum Drehen und Kippen. */
export function Board3D({ board, width, height, demolishMode, onSelect, flash }: Board3DProps) {
  const view = useRef<CameraView>({ azimuth: Math.PI / 4, elevation: 0.62 });
  const three = useRef<ThreeState | null>(null);
  const container = useRef<View>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ground = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  const measure = useCallback(() => {
    container.current?.measureInWindow?.((x, y) => {
      origin.current = { x, y };
    });
  }, []);

  const highlight = useMemo(() => {
    if (!demolishMode) return undefined;
    return board.map((cell, index) => (cell ? index : -1)).filter((index) => index >= 0);
  }, [board, demolishMode]);

  /** Bildschirmpunkt → Rasterfeld, per Strahl in die Szene. */
  const pick = useCallback(
    (px: number, py: number): number | null => {
      const state = three.current;
      if (!state) return null;

      const ndc = new THREE.Vector2((px / state.size.width) * 2 - 1, -(py / state.size.height) * 2 + 1);
      raycaster.setFromCamera(ndc, state.camera);

      // Beim Abriss zählt das Gebäude, das man sieht.
      if (demolishMode) {
        const city = state.scene.getObjectByName('city');
        if (city) {
          for (const hit of raycaster.intersectObject(city, true)) {
            let node: THREE.Object3D | null = hit.object;
            while (node) {
              if (typeof node.userData?.index === 'number') return node.userData.index as number;
              node = node.parent;
            }
          }
        }
      }

      const point = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(ground, point)) return null;
      const cell = worldToCell(point.x, point.z);
      return cell ? toIndex(cell.x, cell.y) : null;
    },
    [demolishMode, ground, raycaster],
  );

  const actions = useRef({ tap: (_x: number, _y: number) => {} });
  actions.current.tap = (px, py) => {
    const offset = origin.current;
    if (!offset) return;
    const index = pick(px - offset.x, py - offset.y);
    if (index !== null) onSelect(index);
  };

  const drag = useRef({ moved: false, azimuth: 0, elevation: 0 });

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        drag.current = { moved: false, azimuth: view.current.azimuth, elevation: view.current.elevation };
      },
      onPanResponderMove: (_event, gesture) => {
        if (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6) drag.current.moved = true;
        view.current.azimuth = drag.current.azimuth - gesture.dx * TURN_PER_PIXEL;
        view.current.elevation = Math.max(
          MIN_ELEVATION,
          Math.min(MAX_ELEVATION, drag.current.elevation + gesture.dy * TILT_PER_PIXEL),
        );
      },
      onPanResponderRelease: (event, gesture) => {
        if (drag.current.moved) return;
        const point = touchPoint(event, gesture);
        if (point) actions.current.tap(point.x, point.y);
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const turn = useCallback((steps: number) => {
    view.current.azimuth += (steps * Math.PI) / 2;
  }, []);

  // Punkteanzeige über dem Neubau: Weltposition auf den Bildschirm rechnen.
  const [flashAt, setFlashAt] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    if (!flash) {
      setFlashAt(null);
      return;
    }
    const state = three.current;
    if (!state) {
      setFlashAt({ left: width / 2, top: height / 2 });
      return;
    }
    const { x, y } = toXY(flash.index);
    const [px, , pz] = cellPosition(x, y);
    const projected = new THREE.Vector3(px, 1.1, pz).project(state.camera);
    setFlashAt({
      left: ((projected.x + 1) / 2) * state.size.width,
      top: ((1 - projected.y) / 2) * state.size.height,
    });
  }, [flash, height, width]);

  return (
    <View ref={container} onLayout={measure} style={{ width, height }}>
      <Canvas
        style={{ width, height }}
        orthographic
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{ antialias: true }}
        camera={{ position: [12, 14, 12], near: 0.1, far: 120, zoom: 60 }}
        onCreated={(state: ThreeState) => {
          three.current = state;
        }}
      >
        <color attach="background" args={[theme.color.background]} />
        <CameraRig view={view} />
        <Lights />
        <Plate highlight={highlight} />
        <City board={board} />
      </Canvas>

      {flash && flashAt ? (
        <FloatingScore points={flash.points} left={flashAt.left} top={flashAt.top} trigger={flash.key} />
      ) : null}

      <View style={StyleSheet.absoluteFill} {...responder.panHandlers} />

      <View style={styles.viewControls}>
        <RotateButton direction={-1} onPress={() => turn(-1)} />
        <RotateButton direction={1} onPress={() => turn(1)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floating: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  viewControls: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

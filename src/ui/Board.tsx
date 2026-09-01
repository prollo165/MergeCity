import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { Board as BoardModel, GRID, toIndex, toXY } from '../game/logic';
import { tierHeight, tierSpec } from '../game/tiers';
import { Building } from './Building';
import { Rotation, cellCenter, floorHeight, pointToCell, rotateCell, unrotateCell } from './iso';
import { BoardLayout } from './layout';
import { Plate } from './Plate';
import { theme } from './theme';

/** Zieh-Weg in Pixeln für eine Vierteldrehung bzw. eine Kippstufe. */
const ROTATE_STEP = 64;
const TILT_STEP = 70;

interface BoardProps {
  board: BoardModel;
  layout: BoardLayout;
  rotation: Rotation;
  demolishMode: boolean;
  onSelect: (index: number) => void;
  onRotate: (delta: number) => void;
  onTilt: (delta: number) => void;
  /** Punkteanzeige nach einer Verschmelzung */
  flash?: { index: number; points: number; key: number } | null;
}

function Tile({
  tier,
  tw,
  tilt,
  rotation,
  canvas,
  left,
  top,
}: {
  tier: number;
  tw: number;
  tilt: number;
  rotation: Rotation;
  canvas: BoardLayout['canvas'];
  left: number;
  top: number;
}) {
  const appear = useRef(new Animated.Value(0)).current;
  const position = useRef(new Animated.ValueXY({ x: left, y: top })).current;
  const placed = useRef(false);

  useEffect(() => {
    Animated.spring(appear, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
  }, [appear]);

  // Beim Drehen und Kippen wandern die Häuser an ihren neuen Platz.
  useEffect(() => {
    if (!placed.current) {
      placed.current = true;
      position.setValue({ x: left, y: top });
      return;
    }
    Animated.spring(position, {
      toValue: { x: left, y: top },
      friction: 10,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [left, position, top]);

  const pivot = canvas.height / 2 - canvas.groundY;
  const scale = appear.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: canvas.width,
        height: canvas.height,
        opacity: appear,
        transform: [
          { translateX: position.x },
          { translateY: position.y },
          { translateY: pivot },
          { scale },
          { translateY: -pivot },
        ],
      }}
    >
      <Svg
        width={canvas.width}
        height={canvas.height}
        viewBox={`${-canvas.width / 2} ${-canvas.groundY} ${canvas.width} ${canvas.height}`}
      >
        <Building tier={tier} tw={tw} rotation={rotation} tilt={tilt} />
      </Svg>
    </Animated.View>
  );
}

function FloatingScore({ points, left, top, trigger }: { points: number; left: number; top: number; trigger: number }) {
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    rise.setValue(0);
    Animated.timing(rise, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
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

/** Liest die Bildschirmposition einer Berührung – plattformübergreifend. */
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

export function Board({ board, layout, rotation, demolishMode, onSelect, onRotate, onTilt, flash }: BoardProps) {
  const { tw, tilt, canvas, originX, originY } = layout;

  const containerRef = useRef<View>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const measure = useCallback(() => {
    containerRef.current?.measureInWindow?.((x, y) => {
      originRef.current = { x, y };
    });
  }, []);

  const occupied = useMemo(() => board.map((cell, i) => (cell ? i : -1)).filter((i) => i >= 0), [board]);

  /** Bildschirmmitte eines Feldes – unter Berücksichtigung der Blickrichtung. */
  const screenCenter = useCallback(
    (index: number) => {
      const { x, y } = toXY(index);
      const turned = rotateCell(x, y, rotation, GRID);
      return cellCenter(turned.x, turned.y, tw, tilt);
    },
    [rotation, tilt, tw],
  );

  /** Tiefensortierung: was weiter vorne steht, wird später gezeichnet. */
  const depth = useCallback(
    (index: number) => {
      const { x, y } = toXY(index);
      const turned = rotateCell(x, y, rotation, GRID);
      return turned.x + turned.y;
    },
    [rotation],
  );

  /**
   * Trefferprüfung. Beim Bauen hat das freie Grundstück Vorrang – sonst würden
   * niedrige Häuser die Bauplätze hinter sich blockieren. Beim Abriss zählt
   * dagegen, was man sieht: von vorne nach hinten durch die Silhouetten.
   */
  const hitTest = useCallback(
    (px: number, py: number): number | null => {
      const localX = px - originX;
      const localY = py - originY;

      const seen = pointToCell(localX, localY, tw, tilt);
      let groundIndex: number | null = null;
      if (seen.x >= 0 && seen.y >= 0 && seen.x < GRID && seen.y < GRID) {
        const logical = unrotateCell(seen.x, seen.y, rotation, GRID);
        groundIndex = toIndex(logical.x, logical.y);
      }

      if (!demolishMode && groundIndex !== null && board[groundIndex] === null) return groundIndex;

      const sorted = occupied.slice().sort((a, b) => depth(b) - depth(a));
      for (const index of sorted) {
        const tier = board[index]!;
        const [cx, cy] = screenCenter(index);
        const spec = tierSpec(tier);
        const halfWidth = Math.max(spec.blocks[0].fw, 0.5) * tw * 0.6;
        const height = tierHeight(tier) * floorHeight(tw, tilt) + tw * 0.3;
        if (localX >= cx - halfWidth && localX <= cx + halfWidth && localY >= cy - height && localY <= cy + tw * 0.2) {
          return index;
        }
      }

      return groundIndex;
    },
    [board, demolishMode, depth, occupied, originX, originY, rotation, screenCenter, tilt, tw],
  );

  // Der PanResponder wird einmal erzeugt; die aktuellen Rückrufe liegen im Ref.
  const actions = useRef({ tap: (_x: number, _y: number) => {}, rotate: (_d: number) => {}, tilt: (_d: number) => {} });
  actions.current = {
    tap: (px, py) => {
      const origin = originRef.current;
      if (!origin) return;
      const index = hitTest(px - origin.x, py - origin.y);
      if (index !== null) onSelect(index);
    },
    rotate: onRotate,
    tilt: onTilt,
  };

  const drag = useRef({ axis: null as null | 'x' | 'y', consumedX: 0, consumedY: 0, moved: false });

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        drag.current = { axis: null, consumedX: 0, consumedY: 0, moved: false };
      },
      onPanResponderMove: (_event, gesture) => {
        const state = drag.current;
        if (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6) state.moved = true;
        if (!state.axis && (Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10)) {
          state.axis = Math.abs(gesture.dx) >= Math.abs(gesture.dy) ? 'x' : 'y';
        }

        if (state.axis === 'x') {
          while (gesture.dx - state.consumedX >= ROTATE_STEP) {
            state.consumedX += ROTATE_STEP;
            actions.current.rotate(1);
          }
          while (gesture.dx - state.consumedX <= -ROTATE_STEP) {
            state.consumedX -= ROTATE_STEP;
            actions.current.rotate(-1);
          }
        } else if (state.axis === 'y') {
          while (gesture.dy - state.consumedY >= TILT_STEP) {
            state.consumedY += TILT_STEP;
            actions.current.tilt(1);
          }
          while (gesture.dy - state.consumedY <= -TILT_STEP) {
            state.consumedY -= TILT_STEP;
            actions.current.tilt(-1);
          }
        }
      },
      onPanResponderRelease: (event, gesture) => {
        if (drag.current.moved) return;
        const point = touchPoint(event, gesture);
        if (point) actions.current.tap(point.x, point.y);
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const tiles = useMemo(() => {
    return occupied
      .slice()
      .sort((a, b) => depth(a) - depth(b))
      .map((index) => {
        const tier = board[index]!;
        const [cx, cy] = screenCenter(index);
        return (
          <Tile
            key={`${index}-${tier}`}
            tier={tier}
            tw={tw}
            tilt={tilt}
            rotation={rotation}
            canvas={canvas}
            left={originX + cx - canvas.width / 2}
            top={originY + cy - canvas.groundY}
          />
        );
      });
  }, [board, canvas, depth, occupied, originX, originY, rotation, screenCenter, tilt, tw]);

  /** Im Abriss-Modus hervorgehobene Grundstücke – in Blickrichtung. */
  const highlight = useMemo(() => {
    if (!demolishMode) return undefined;
    return occupied.map((index) => {
      const { x, y } = toXY(index);
      const turned = rotateCell(x, y, rotation, GRID);
      return toIndex(turned.x, turned.y);
    });
  }, [demolishMode, occupied, rotation]);

  const flashPosition = useMemo(() => {
    if (!flash) return null;
    const [cx, cy] = screenCenter(flash.index);
    return { left: originX + cx, top: originY + cy - tw * 1.1 };
  }, [flash, originX, originY, screenCenter, tw]);

  return (
    <View ref={containerRef} onLayout={measure} style={{ width: layout.width, height: layout.height }}>
      <Plate layout={layout} highlight={highlight} />
      {tiles}
      {flash && flashPosition ? (
        <FloatingScore points={flash.points} left={flashPosition.left} top={flashPosition.top} trigger={flash.key} />
      ) : null}
      <View style={StyleSheet.absoluteFill} {...responder.panHandlers} />
      <View style={styles.viewControls}>
        <RotateButton direction={-1} onPress={() => onRotate(-1)} />
        <RotateButton direction={1} onPress={() => onRotate(1)} />
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
    bottom: 0,
    right: 0,
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

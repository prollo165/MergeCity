import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg from 'react-native-svg';
import { Board as BoardModel, GRID, toIndex, toXY } from '../game/logic';
import { tierHeight, tierSpec } from '../game/tiers';
import { Building } from './Building';
import { FLOOR_RATIO, cellCenter, pointToCell } from './iso';
import { BoardLayout } from './layout';
import { Plate } from './Plate';
import { theme } from './theme';

interface BoardProps {
  board: BoardModel;
  layout: BoardLayout;
  demolishMode: boolean;
  onSelect: (index: number) => void;
  /** Punkteanzeige nach einer Verschmelzung */
  flash?: { index: number; points: number; key: number } | null;
}

function Tile({ tier, tw, canvas, left, top }: { tier: number; tw: number; canvas: BoardLayout['canvas']; left: number; top: number }) {
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(grow, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [grow]);

  const scale = grow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width: canvas.width,
        height: canvas.height,
        opacity: grow,
        transform: [{ translateY: canvas.height / 2 - canvas.groundY }, { scale }, { translateY: canvas.groundY - canvas.height / 2 }],
      }}
    >
      <Svg
        width={canvas.width}
        height={canvas.height}
        viewBox={`${-canvas.width / 2} ${-canvas.groundY} ${canvas.width} ${canvas.height}`}
      >
        <Building tier={tier} tw={tw} />
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

export function Board({ board, layout, demolishMode, onSelect, flash }: BoardProps) {
  const { tw, canvas, originX, originY } = layout;

  const containerRef = useRef<View>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const measure = useCallback(() => {
    containerRef.current?.measureInWindow?.((x, y) => {
      originRef.current = { x, y };
    });
  }, []);

  const occupied = useMemo(() => board.map((cell, i) => (cell ? i : -1)).filter((i) => i >= 0), [board]);

  /**
   * Trefferprüfung. Beim Bauen hat das freie Grundstück Vorrang – sonst würden
   * niedrige Häuser die Bauplätze hinter sich blockieren. Beim Abriss zählt
   * dagegen, was man sieht: von vorne nach hinten durch die Silhouetten.
   */
  const hitTest = useCallback(
    (px: number, py: number): number | null => {
      const localX = px - originX;
      const localY = py - originY;

      const ground = pointToCell(localX, localY, tw);
      const groundIndex =
        ground.x >= 0 && ground.y >= 0 && ground.x < GRID && ground.y < GRID ? toIndex(ground.x, ground.y) : null;

      if (!demolishMode && groundIndex !== null && board[groundIndex] === null) return groundIndex;

      const sorted = occupied.slice().sort((a, b) => {
        const A = toXY(a);
        const B = toXY(b);
        return B.x + B.y - (A.x + A.y);
      });

      for (const index of sorted) {
        const tier = board[index]!;
        const { x, y } = toXY(index);
        const [cx, cy] = cellCenter(x, y, tw);
        const spec = tierSpec(tier);
        const halfWidth = Math.max(spec.blocks[0].fw, 0.5) * tw * 0.6;
        const height = tierHeight(tier) * tw * FLOOR_RATIO + tw * 0.35;
        if (localX >= cx - halfWidth && localX <= cx + halfWidth && localY >= cy - height && localY <= cy + tw * 0.22) {
          return index;
        }
      }

      return groundIndex;
    },
    [board, demolishMode, occupied, originX, originY, tw],
  );

  /**
   * Tippposition relativ zum Spielfeld. Auf nativen Plattformen liefert das
   * Event locationX/locationY; im Web (react-native-web) kommt das rohe
   * DOM-Event an, deshalb rechnen wir dort über die gemessene Position.
   */
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      const native = event.nativeEvent as GestureResponderEvent['nativeEvent'] & { clientX?: number; clientY?: number };
      let px = native.locationX;
      let py = native.locationY;

      if (typeof px !== 'number' || typeof py !== 'number' || Number.isNaN(px)) {
        const origin = originRef.current;
        const pageX = typeof native.pageX === 'number' ? native.pageX : native.clientX;
        const pageY = typeof native.pageY === 'number' ? native.pageY : native.clientY;
        if (!origin || typeof pageX !== 'number' || typeof pageY !== 'number') return;
        px = pageX - origin.x;
        py = pageY - origin.y;
      }

      const index = hitTest(px, py);
      if (index !== null) onSelect(index);
    },
    [hitTest, onSelect],
  );

  const tiles = useMemo(() => {
    return occupied
      .slice()
      .sort((a, b) => {
        const A = toXY(a);
        const B = toXY(b);
        return A.x + A.y - (B.x + B.y);
      })
      .map((index) => {
        const tier = board[index]!;
        const { x, y } = toXY(index);
        const [cx, cy] = cellCenter(x, y, tw);
        return (
          <Tile
            key={`${index}-${tier}`}
            tier={tier}
            tw={tw}
            canvas={canvas}
            left={originX + cx - canvas.width / 2}
            top={originY + cy - canvas.groundY}
          />
        );
      });
  }, [board, canvas, occupied, originX, originY, tw]);

  const flashPosition = useMemo(() => {
    if (!flash) return null;
    const { x, y } = toXY(flash.index);
    const [cx, cy] = cellCenter(x, y, tw);
    return { left: originX + cx, top: originY + cy - tw * 1.1 };
  }, [flash, originX, originY, tw]);

  return (
    <View ref={containerRef} onLayout={measure} style={{ width: layout.width, height: layout.height }}>
      <Plate layout={layout} highlight={demolishMode ? occupied : undefined} />
      {tiles}
      {flash && flashPosition ? (
        <FloatingScore points={flash.points} left={flashPosition.left} top={flashPosition.top} trigger={flash.key} />
      ) : null}
      <Pressable style={StyleSheet.absoluteFill} onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  floating: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: '600',
  },
});

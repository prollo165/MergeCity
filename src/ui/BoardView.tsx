import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Board as BoardModel } from '../game/logic';
import { Board } from './Board';
import { DEFAULT_TILT, Rotation, TILTS, normalizeRotation } from './iso';
import { boardLayout, fitTileWidth } from './layout';
import { theme } from './theme';

interface BoardViewProps {
  board: BoardModel;
  width: number;
  height: number;
  demolishMode: boolean;
  onSelect: (index: number) => void;
  flash?: { index: number; points: number; key: number } | null;
}

/**
 * Fällt zurück auf die gezeichnete Stadt, falls kein 3D-Kontext zustande kommt
 * (alte Geräte, fehlendes WebGL). Das Spiel bleibt dann vollständig spielbar.
 */
function FlatBoard({ board, width, height, demolishMode, onSelect, flash }: BoardViewProps) {
  const [rotation, setRotation] = React.useState<Rotation>(0);
  const [tiltStep, setTiltStep] = React.useState(DEFAULT_TILT);

  const layout = React.useMemo(
    () => boardLayout(fitTileWidth(width, height), TILTS[tiltStep]),
    [height, tiltStep, width],
  );

  return (
    <View style={styles.center}>
      <Board
        board={board}
        layout={layout}
        rotation={rotation}
        demolishMode={demolishMode}
        onSelect={onSelect}
        onRotate={(delta) => setRotation((current) => normalizeRotation(current + delta))}
        onTilt={(delta) => setTiltStep((current) => Math.max(0, Math.min(TILTS.length - 1, current + delta)))}
        flash={flash}
      />
    </View>
  );
}

/**
 * Die 3D-Ansicht wird bewusst erst hier geladen: Fehlt auf einem Gerät der
 * GL-Baustein, scheitert schon der Import – dann bleibt die gezeichnete Stadt.
 */
function loadBoard3D(): React.ComponentType<BoardViewProps> | null {
  try {
    return require('./Board3D').Board3D as React.ComponentType<BoardViewProps>;
  } catch (error) {
    console.warn('3D-Ansicht konnte nicht geladen werden:', error);
    return null;
  }
}

const Board3D = loadBoard3D();

interface BoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

class RenderBoundary extends React.Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('3D-Ansicht nicht verfügbar, weiche auf die gezeichnete Stadt aus:', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function BoardView(props: BoardViewProps) {
  if (!Board3D) return <FlatBoard {...props} />;
  return (
    <RenderBoundary fallback={<FlatBoard {...props} />}>
      <Board3D {...props} />
    </RenderBoundary>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    ...theme.font.label,
    color: theme.color.inkFaint,
  },
});

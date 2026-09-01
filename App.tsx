import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { createGame, gameReducer } from './src/game/state';
import { loadGame, loadIntroSeen, markIntroSeen, saveGame } from './src/game/storage';
import { BoardView } from './src/ui/BoardView';
import { Dock } from './src/ui/Dock';
import { Hud } from './src/ui/Hud';
import { ChronicleModal, EraToast, GameOverModal, IntroModal } from './src/ui/Modals';
import { theme } from './src/ui/theme';

const HUD_HEIGHT = 84;
const DOCK_HEIGHT = 176;

function tap(style: Haptics.ImpactFeedbackStyle) {
  Haptics.impactAsync(style).catch(() => {
    // Haptik ist ein Bonus, kein Muss (Simulator, Web).
  });
}

function GameScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [state, dispatch] = useReducer(gameReducer, undefined, () => createGame());
  const [ready, setReady] = useState(false);
  const [demolishMode, setDemolishMode] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [showChronicle, setShowChronicle] = useState(false);
  const [toast, setToast] = useState<{ tier: number; key: number } | null>(null);
  const previousHighest = useRef(state.highest);

  // Spielstand laden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [saved, introSeen] = await Promise.all([loadGame(), loadIntroSeen()]);
      if (cancelled) return;
      if (saved) {
        dispatch({ type: 'hydrate', state: saved });
        previousHighest.current = saved.highest;
      }
      if (!introSeen) setShowIntro(true);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Spielstand sichern
  useEffect(() => {
    if (!ready) return;
    saveGame(state);
  }, [ready, state]);

  // Neue Epoche erreicht?
  useEffect(() => {
    if (state.highest > previousHighest.current) {
      previousHighest.current = state.highest;
      setToast({ tier: state.highest, key: Date.now() });
      tap(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [state.highest]);

  const boardSize = useMemo(() => {
    const availableHeight = height - insets.top - insets.bottom - HUD_HEIGHT - DOCK_HEIGHT - 24;
    return { width: width - 24, height: Math.max(240, availableHeight) };
  }, [height, insets.bottom, insets.top, width]);

  const boardFull = useMemo(() => state.board.every((cell) => cell !== null), [state.board]);

  const flash = useMemo(() => {
    if (!state.lastEvents.length) return null;
    const last = state.lastEvents[state.lastEvents.length - 1];
    const points = state.lastEvents.reduce((sum, event) => sum + event.points, 0);
    return { index: last.at, points, key: state.moves };
  }, [state.lastEvents, state.moves]);

  const handleSelect = useCallback(
    (index: number) => {
      if (demolishMode) {
        if (state.board[index] === null) return;
        tap(Haptics.ImpactFeedbackStyle.Heavy);
        dispatch({ type: 'demolish', index });
        setDemolishMode(false);
        return;
      }
      if (state.board[index] !== null) return;
      tap(Haptics.ImpactFeedbackStyle.Light);
      dispatch({ type: 'place', index });
    },
    [demolishMode, state.board],
  );

  const handleRestart = useCallback(() => {
    setDemolishMode(false);
    setToast(null);
    previousHighest.current = 1;
    dispatch({ type: 'restart' });
  }, []);

  const closeIntro = useCallback(() => {
    setShowIntro(false);
    markIntroSeen();
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <StatusBar style="dark" />

      <View style={styles.hud}>
        <Hud score={state.score} best={state.best} highest={state.highest} />
      </View>

      <View style={styles.boardArea}>
        <BoardView
          board={state.board}
          width={boardSize.width}
          height={boardSize.height}
          demolishMode={demolishMode}
          onSelect={handleSelect}
          flash={flash}
        />
        <View style={styles.toastLayer} pointerEvents="none">
          {toast ? <EraToast tier={toast.tier} trigger={toast.key} /> : null}
        </View>
      </View>

      <View style={styles.dock}>
        <Dock
          queue={state.queue}
          demolitions={state.demolitions}
          demolishMode={demolishMode}
          onToggleDemolish={() => setDemolishMode((value) => !value)}
          onOpenChronicle={() => setShowChronicle(true)}
          onRestart={handleRestart}
          hint={boardFull && !state.over ? 'Kein freies Grundstück – reiß ein Gebäude ab.' : undefined}
        />
      </View>

      <IntroModal visible={showIntro} onClose={closeIntro} />
      <ChronicleModal visible={showChronicle} highest={state.highest} onClose={() => setShowChronicle(false)} />
      <GameOverModal
        visible={state.over && !showChronicle}
        score={state.score}
        best={state.best}
        highest={state.highest}
        onRestart={handleRestart}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.color.background,
  },
  hud: {
    height: HUD_HEIGHT,
    justifyContent: 'center',
  },
  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  dock: {
    height: DOCK_HEIGHT,
    justifyContent: 'center',
  },
});

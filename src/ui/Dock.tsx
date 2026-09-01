import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tierSpec } from '../game/tiers';
import { BuildingPreview } from './BuildingPreview';
import { theme } from './theme';

interface DockProps {
  queue: number[];
  demolitions: number;
  demolishMode: boolean;
  onToggleDemolish: () => void;
  onOpenChronicle: () => void;
  onRestart: () => void;
  /** Kurzer Hinweis unter den Schaltflächen, z. B. wenn kein Platz mehr frei ist */
  hint?: string;
}

export function PillButton({
  label,
  onPress,
  active,
  disabled,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        disabled && styles.pillDisabled,
        pressed && !disabled && styles.pillPressed,
      ]}
    >
      <Text style={[styles.pillLabel, active && styles.pillLabelActive, disabled && styles.pillLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

export function Dock({ queue, demolitions, demolishMode, onToggleDemolish, onOpenChronicle, onRestart, hint }: DockProps) {
  const current = tierSpec(queue[0] ?? 1);
  const next = queue[1] ?? 1;

  return (
    <View style={styles.dock}>
      <View style={styles.pieceRow}>
        <View style={styles.currentCard}>
          <BuildingPreview tier={current.tier} size={74} />
        </View>
        <View style={styles.pieceText}>
          <Text style={styles.label}>BAUT</Text>
          <Text style={styles.name}>{current.name}</Text>
          <Text style={styles.era}>{current.era}</Text>
        </View>
        <View style={styles.nextWrap}>
          <Text style={styles.label}>DANACH</Text>
          <View style={styles.nextCard}>
            <BuildingPreview tier={next} size={40} />
          </View>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <PillButton
          label={demolishMode ? 'ABRISS AKTIV' : `ABRISS · ${demolitions}`}
          active={demolishMode}
          disabled={demolitions <= 0}
          onPress={onToggleDemolish}
        />
        <PillButton label="CHRONIK" onPress={onOpenChronicle} />
        <PillButton label="NEU" onPress={onRestart} />
      </View>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    width: '100%',
    paddingHorizontal: 22,
    gap: 14,
  },
  pieceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  currentCard: {
    width: 86,
    height: 86,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceText: {
    gap: 2,
  },
  label: {
    ...theme.font.label,
    color: theme.color.inkFaint,
  },
  name: {
    fontSize: 17,
    fontWeight: '500',
    color: theme.color.ink,
  },
  era: {
    fontSize: 13,
    color: theme.color.inkSoft,
  },
  nextWrap: {
    marginLeft: 'auto',
    alignItems: 'center',
    gap: 6,
  },
  nextCard: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPressed: {
    backgroundColor: '#00000010',
  },
  pillActive: {
    backgroundColor: theme.color.accent,
    borderColor: theme.color.accent,
  },
  pillDisabled: {
    opacity: 0.4,
  },
  pillLabel: {
    ...theme.font.label,
    color: theme.color.inkSoft,
  },
  pillLabelActive: {
    color: '#FFFFFF',
  },
  pillLabelDisabled: {
    color: theme.color.inkFaint,
  },
  hint: {
    fontSize: 12,
    color: theme.color.accent,
    textAlign: 'center',
  },
});

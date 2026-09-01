import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MAX_TIER, tierSpec } from '../game/tiers';
import { theme } from './theme';

interface HudProps {
  score: number;
  best: number;
  highest: number;
}

function Stat({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <View style={{ alignItems: align === 'left' ? 'flex-start' : 'flex-end' }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function Hud({ score, best, highest }: HudProps) {
  const spec = tierSpec(highest);
  const progress = Math.min(1, highest / MAX_TIER);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Stat label="PUNKTE" value={score.toLocaleString('de-DE')} />
        <Stat label="REKORD" value={best.toLocaleString('de-DE')} align="right" />
      </View>
      <View style={styles.eraRow}>
        <Text style={styles.era}>{spec.era}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 22,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: {
    ...theme.font.label,
    color: theme.color.inkFaint,
  },
  value: {
    ...theme.font.value,
    color: theme.color.ink,
  },
  eraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  era: {
    ...theme.font.label,
    color: theme.color.inkSoft,
    letterSpacing: 1.2,
  },
  track: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.color.line,
    overflow: 'hidden',
  },
  fill: {
    height: 2,
    backgroundColor: theme.color.accent,
  },
});

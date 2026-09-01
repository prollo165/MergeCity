import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TIERS, tierSpec } from '../game/tiers';
import { BuildingPreview } from './BuildingPreview';
import { theme } from './theme';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function IntroModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Card>
        <Text style={styles.title}>Von der Hütte zum Turm</Text>
        <View style={styles.rules}>
          <Rule text="Tippe auf ein freies Grundstück, um das nächste Gebäude zu setzen." />
          <Rule text="Drei gleiche Gebäude nebeneinander verschmelzen zu einem Bau der nächsten Epoche." />
          <Rule text="Steht kein Platz mehr zur Verfügung, hilft die Abrissbirne – sie füllt sich beim Verschmelzen wieder auf." />
          <Rule text="Fünfzehn Epochen liegen zwischen der Steinzeit und der Arkologie." />
        </View>
        <PrimaryButton label="Los geht's" onPress={onClose} />
      </Card>
    </Modal>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.dot} />
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

export function ChronicleModal({ visible, highest, onClose }: { visible: boolean; highest: number; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Card>
        <Text style={styles.title}>Chronik</Text>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {TIERS.map((spec) => {
            const unlocked = spec.tier <= highest;
            const teased = spec.tier === highest + 1;
            return (
              <View key={spec.tier} style={[styles.chronicleRow, !unlocked && { opacity: teased ? 0.55 : 0.28 }]}>
                <View style={styles.chronicleThumb}>
                  <BuildingPreview tier={spec.tier} size={44} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chronicleName}>{unlocked || teased ? spec.name : '???'}</Text>
                  <Text style={styles.chronicleEra}>{unlocked || teased ? spec.era : 'noch unentdeckt'}</Text>
                </View>
                <Text style={styles.chronicleTier}>{spec.tier}</Text>
              </View>
            );
          })}
        </ScrollView>
        <PrimaryButton label="Weiterbauen" onPress={onClose} />
      </Card>
    </Modal>
  );
}

export function GameOverModal({
  visible,
  score,
  best,
  highest,
  onRestart,
}: {
  visible: boolean;
  score: number;
  best: number;
  highest: number;
  onRestart: () => void;
}) {
  const spec = tierSpec(highest);
  const isRecord = score >= best && score > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRestart}>
      <Card>
        <Text style={styles.title}>Die Stadt ist voll</Text>
        <View style={styles.summaryPreview}>
          <BuildingPreview tier={highest} size={120} />
        </View>
        <Text style={styles.body}>
          Höchster Bau: <Text style={styles.bodyStrong}>{spec.name}</Text> ({spec.era})
        </Text>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.label}>PUNKTE</Text>
            <Text style={styles.summaryValue}>{score.toLocaleString('de-DE')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>{isRecord ? 'NEUER REKORD' : 'REKORD'}</Text>
            <Text style={[styles.summaryValue, isRecord && { color: theme.color.accent }]}>{best.toLocaleString('de-DE')}</Text>
          </View>
        </View>
        <PrimaryButton label="Neue Stadt" onPress={onRestart} />
      </Card>
    </Modal>
  );
}

/** Kurzer Hinweis, wenn eine neue Epoche erreicht wurde. */
export function EraToast({ tier, trigger }: { tier: number; trigger: number }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;
    fade.setValue(0);
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(fade, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [fade, trigger]);

  if (!trigger) return null;
  const spec = tierSpec(tier);

  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity: fade }]}>
      <Text style={styles.toastLabel}>NEUE EPOCHE</Text>
      <Text style={styles.toastValue}>{spec.era}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#26332ECC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.color.background,
    borderRadius: theme.radius.lg,
    padding: 24,
    gap: 18,
  },
  title: {
    ...theme.font.title,
    color: theme.color.ink,
  },
  rules: {
    gap: 12,
  },
  ruleRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.color.accent,
    marginTop: 7,
  },
  body: {
    ...theme.font.body,
    color: theme.color.inkSoft,
    flex: 1,
  },
  bodyStrong: {
    color: theme.color.ink,
    fontWeight: '600',
  },
  label: {
    ...theme.font.label,
    color: theme.color.inkFaint,
  },
  list: {
    maxHeight: 360,
  },
  chronicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  chronicleThumb: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chronicleName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.color.ink,
  },
  chronicleEra: {
    fontSize: 12,
    color: theme.color.inkSoft,
  },
  chronicleTier: {
    ...theme.font.label,
    color: theme.color.inkFaint,
  },
  summaryPreview: {
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  summaryValue: {
    ...theme.font.value,
    color: theme.color.ink,
  },
  primary: {
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 2,
  },
  toastLabel: {
    ...theme.font.label,
    color: theme.color.inkFaint,
  },
  toastValue: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.color.ink,
  },
});

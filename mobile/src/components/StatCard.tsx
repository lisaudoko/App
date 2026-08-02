import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

export function StatRow({ stats }: { stats: { label: string; value: string; color?: string }[] }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.row}>
      {stats.map((s) => (
        <View key={s.label} style={[styles.stat, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.value, { color: s.color ?? colors.text }]}>{s.value}</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  stat: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  value: { fontSize: 17, fontWeight: '600' },
  label: { fontSize: 10, marginTop: 2 },
});

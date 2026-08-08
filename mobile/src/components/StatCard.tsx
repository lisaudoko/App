import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

export function StatRow({ stats }: { stats: { label: string; value: string; color?: string }[] }) {
  const { colors, resolvedScheme } = useAppTheme();
  const shadowOpacity = resolvedScheme === 'dark' ? 0 : 0.05;
  return (
    <View style={styles.row}>
      {stats.map((s) => (
        <View
          key={s.label}
          style={[
            styles.stat,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowOpacity,
            },
          ]}
        >
          <Text style={[styles.value, { color: s.color ?? colors.text }]}>{s.value}</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stat: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    // iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    // Android
    elevation: Platform.OS === 'android' ? 1 : 0,
  },
  value: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 12, marginTop: 2 },
});

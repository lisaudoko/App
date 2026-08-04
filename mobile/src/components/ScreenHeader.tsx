import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightLabel?: string;
}

export function ScreenHeader({ title, subtitle, onBack, rightIcon, onRightPress, rightLabel }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.navBar, paddingTop: insets.top + 10 }]}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={12} style={styles.side} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.navText} />
        </Pressable>
      )}
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: colors.navText }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.navText }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightIcon && (
        <Pressable
          onPress={onRightPress}
          hitSlop={12}
          style={styles.side}
          accessibilityRole="button"
          accessibilityLabel={rightLabel ?? 'More options'}
        >
          <Ionicons name={rightIcon} size={19} color={colors.navText} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  side: { width: 24 },
  titleWrap: { flex: 1 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 13, opacity: 0.6, marginTop: 1 },
});

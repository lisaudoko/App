import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeProvider';

export function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  const { colors } = useAppTheme();
  const clamped = Math.max(0, Math.min(1, pct));
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(clamped * 100, { duration: 500 });
  }, [clamped]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={{ backgroundColor: colors.border, borderRadius: 20, height: 9, overflow: 'hidden' }}>
      <Animated.View
        style={[
          {
            height: '100%',
            borderRadius: 20,
            // Default to accent so bars feel colorful and on-brand
            backgroundColor: color ?? colors.accent,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

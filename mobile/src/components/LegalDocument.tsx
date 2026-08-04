import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { Screen } from './Screen';
import { ScreenHeader } from './ScreenHeader';

export interface LegalSection {
  heading: string;
  body: string;
}

interface Props {
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
}

export function LegalDocument({ title, lastUpdated, intro, sections }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={title} onBack={() => (router.canGoBack() ? router.back() : router.replace('/login'))} />
      <Screen>
        <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 16 }}>Last updated: {lastUpdated}</Text>
        {intro && <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 19, marginBottom: 18 }}>{intro}</Text>}
        {sections.map((s) => (
          <View key={s.heading} style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 }}>{s.heading}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 19 }}>{s.body}</Text>
          </View>
        ))}
      </Screen>
    </View>
  );
}

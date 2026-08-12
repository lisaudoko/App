import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { Card } from './Card';

export interface TrainingCardData {
  kind: 'training';
  weekNumber: number;
  day: number;
  blockLabels: string[];
  /** Coach view: squad size. Athlete view: omit — the athlete screen just says "Your session." */
  athleteCount?: number;
}

export interface MeetCardData {
  kind: 'meet';
  id: string;
  name: string;
  location: string | null;
}

export type DayCardData = TrainingCardData | MeetCardData;

interface Props {
  cards: DayCardData[];
  onPressTraining?: (card: TrainingCardData) => void;
  onLongPressTraining?: (card: TrainingCardData) => void;
  onPressMeet?: (card: MeetCardData) => void;
  /** Slot for role-specific extras per card — e.g. the athlete screen's AddToCalendarButton. */
  renderExtra?: (card: DayCardData) => React.ReactNode;
}

/** Renders the selected day's cards for both the coach and athlete Calendar screens: a teal-bordered
 *  training card, an amber-bordered card per meet, or a centred grey "Rest day" chip when neither
 *  applies. Presentational only — callers build `cards` from real data (workout blocks + meets). */
export function DayEventList({ cards, onPressTraining, onLongPressTraining, onPressMeet, renderExtra }: Props) {
  const { colors } = useAppTheme();

  if (cards.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600' }}>Rest day</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {cards.map((card) =>
        card.kind === 'training' ? (
          <Pressable
            key={`training-${card.weekNumber}-${card.day}`}
            onPress={() => onPressTraining?.(card)}
            onLongPress={() => onLongPressTraining?.(card)}
          >
            <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.accent }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Training session</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{card.blockLabels.join(' · ') || 'No blocks yet'}</Text>
              <Text style={{ fontSize: 12, color: colors.textFaint, marginTop: 4 }}>
                {card.athleteCount != null ? `${card.athleteCount} athlete${card.athleteCount === 1 ? '' : 's'}` : 'Your session'}
              </Text>
              {renderExtra && <View style={{ marginTop: 8 }}>{renderExtra(card)}</View>}
            </Card>
          </Pressable>
        ) : (
          <Pressable key={`meet-${card.id}`} onPress={() => onPressMeet?.(card)}>
            <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.warning }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{card.name}</Text>
              {card.location && <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{card.location}</Text>}
              {renderExtra && <View style={{ marginTop: 8 }}>{renderExtra(card)}</View>}
            </Card>
          </Pressable>
        ),
      )}
    </View>
  );
}

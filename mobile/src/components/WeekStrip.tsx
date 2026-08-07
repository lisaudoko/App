import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { DAY_LABELS } from '@/data/types';

interface Props {
  /** Exactly 7 ISO dates, Monday first. */
  weekDates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  hasTraining: (date: string) => boolean;
  hasMeet: (date: string) => boolean;
}

/** Fixed 7-column week view (not a scrolling pill row — every day is always visible at once),
 *  used by both the coach and athlete Calendar screens. Teal dot = training that day, amber dot
 *  = a meet that day (matches colors.accent/colors.warning, the same tokens Programme Setup and
 *  meet cards already use for "training" vs "competition" contexts). */
export function WeekStrip({ weekDates, selectedDate, onSelectDate, hasTraining, hasMeet }: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
      {weekDates.map((date, i) => {
        const active = date === selectedDate;
        const dayNumber = Number(date.slice(8, 10));
        const training = hasTraining(date);
        const meet = hasMeet(date);
        return (
          <Pressable
            key={date}
            onPress={() => onSelectDate(date)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${DAY_LABELS[i]} ${dayNumber}${training ? ', training' : ''}${meet ? ', meet' : ''}`}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 2, borderRadius: 12, backgroundColor: active ? colors.accent : 'transparent' }}
          >
            <Text style={{ fontSize: 11, color: active ? colors.accentText : colors.textFaint }}>{DAY_LABELS[i]}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 2, color: active ? colors.accentText : colors.text }}>{dayNumber}</Text>
            <View style={{ flexDirection: 'row', gap: 3, marginTop: 4, height: 5 }}>
              {training && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: active ? colors.accentText : colors.accent }} />}
              {meet && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: active ? colors.accentText : colors.warning }} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

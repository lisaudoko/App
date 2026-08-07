import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { addDays, mondayOfIso } from '@/lib/calendarDates';

interface Props {
  /** Any ISO date within the month being displayed. */
  monthAnchor: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onChangeMonth: (deltaMonths: number) => void;
  hasTraining: (date: string) => boolean;
  hasMeet: (date: string) => boolean;
}

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Full month toggle view for the coach/athlete Calendar screens — a 6x7 grid (always 6 weeks, so
 *  the grid height never jumps between months) with real date numbers and the same
 *  training/meet dot convention as WeekStrip. Tapping a date jumps the caller's selection. */
export function MonthGrid({ monthAnchor, selectedDate, onSelectDate, onChangeMonth, hasTraining, hasMeet }: Props) {
  const { colors } = useAppTheme();

  const [year, month] = [Number(monthAnchor.slice(0, 4)), Number(monthAnchor.slice(5, 7))];
  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const cells = useMemo(() => {
    const firstOfMonth = `${monthAnchor.slice(0, 7)}-01`;
    const gridStart = mondayOfIso(firstOfMonth);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [monthAnchor]);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 8 }}>
        <Pressable onPress={() => onChangeMonth(-1)} accessibilityRole="button" accessibilityLabel="Previous month" style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{monthLabel}</Text>
        <Pressable onPress={() => onChangeMonth(1)} accessibilityRole="button" accessibilityLabel="Next month" style={{ padding: 6 }}>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
        {WEEKDAY_HEADERS.map((h, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: colors.textFaint }}>{h}</Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }}>
        {cells.map((date) => {
          const active = date === selectedDate;
          const inMonth = date.slice(0, 7) === monthAnchor.slice(0, 7);
          const dayNumber = Number(date.slice(8, 10));
          const training = hasTraining(date);
          const meet = hasMeet(date);
          return (
            <Pressable
              key={date}
              onPress={() => onSelectDate(date)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                width: '14.28%',
                aspectRatio: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.accent : 'transparent' }}>
                <Text style={{ fontSize: 13, color: active ? colors.accentText : inMonth ? colors.text : colors.textFaint }}>{dayNumber}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 3, marginTop: 2, height: 5 }}>
                {training && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent }} />}
                {meet && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.warning }} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

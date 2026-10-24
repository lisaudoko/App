import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { EVENT_GROUP_EVENTS, EVENT_GROUP_LABEL, type EventGroup } from '@/lib/formatPerformance';
import { TextField } from '@/components/TextField';

const GROUPS: EventGroup[] = ['throws', 'sprints', 'jumps'];
const OTHER = 'Other';

interface Props {
  event: string;
  eventGroup: EventGroup | null;
  onChange: (event: string, eventGroup: EventGroup | null) => void;
  label?: string;
}

/**
 * Two-step event chooser — event group first, then a specific event — so the group
 * (which drives units, direction and wording app-wide) is always set explicitly instead
 * of guessed from free text. "Other" keeps a text field for events not in the lists.
 */
export function EventPicker({ event, eventGroup, onChange, label = 'Primary event' }: Props) {
  const { colors } = useAppTheme();
  const knownEvents = eventGroup ? EVENT_GROUP_EVENTS[eventGroup] : [];
  const isOther = eventGroup != null && !knownEvents.includes(event) && event !== '';
  const showOtherField = isOther || (eventGroup != null && event === OTHER);

  function chip(text: string, active: boolean, onPress: () => void) {
    return (
      <Pressable
        key={text}
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ checked: active }}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 8,
          backgroundColor: active ? colors.accent : 'transparent',
          borderWidth: active ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>{text}</Text>
      </Pressable>
    );
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {GROUPS.map((g) =>
          chip(EVENT_GROUP_LABEL[g], eventGroup === g, () => {
            if (g === eventGroup) return;
            onChange('', g);
          }),
        )}
      </View>
      {eventGroup && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {knownEvents.map((e) => chip(e, event === e, () => onChange(e, eventGroup)))}
          {chip(OTHER, showOtherField, () => onChange(OTHER, eventGroup))}
        </View>
      )}
      {eventGroup && showOtherField && (
        <View style={{ marginTop: 8 }}>
          <TextField
            value={event === OTHER ? '' : event}
            onChangeText={(t) => onChange(t.trim() === '' ? OTHER : t, eventGroup)}
            placeholder="Type your event"
          />
        </View>
      )}
      {!eventGroup && <Text style={{ fontSize: 13, color: colors.textFaint }}>Pick the type of event first.</Text>}
    </View>
  );
}

import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/spacing';
import { Button } from './Button';

interface Props {
  label?: string;
  /** 'YYYY-MM-DD', or '' for unset. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
}

function parseIso(value: string): Date {
  if (!value) return new Date();
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(value: string): string {
  return parseIso(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Date field backed by the platform's native calendar picker instead of a
 * type-YYYY-MM-DD text box. Android opens the system calendar dialog directly;
 * iOS has no equivalent imperative API, so it shows the native inline calendar
 * in a bottom sheet with a Done button. Value stays a plain 'YYYY-MM-DD'
 * string throughout — same shape every existing caller already stores.
 */
export function DateField({ label, value, onChange, placeholder = 'Select a date', minimumDate, maximumDate, error }: Props) {
  const { colors, resolvedScheme } = useAppTheme();
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseIso(value));

  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    if (event.type === 'set' && selected) onChange(toIso(selected));
  }

  function openPicker() {
    const initial = parseIso(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: initial, mode: 'date', minimumDate, maximumDate, onChange: handleAndroidChange });
    } else {
      setDraft(initial);
      setIosPickerVisible(true);
    }
  }

  return (
    <View style={{ marginBottom: 12 }}>
      {label && <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>}
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${value ? formatDisplay(value) : placeholder}` : formatDisplay(value)}
        style={[
          styles.input,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surfaceAlt,
          },
        ]}
      >
        <Text style={{ fontSize: 18, color: value ? colors.text : colors.textFaint }}>{value ? formatDisplay(value) : placeholder}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
      </Pressable>
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

      {Platform.OS === 'ios' && (
        <Modal visible={iosPickerVisible} transparent animationType="fade" onRequestClose={() => setIosPickerVisible(false)}>
          <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }} onPress={() => setIosPickerVisible(false)}>
            <Pressable
              onPress={() => {}}
              style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 }}
            >
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                themeVariant={resolvedScheme}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_, selected) => selected && setDraft(selected)}
              />
              <Button
                label="Done"
                onPress={() => {
                  onChange(toIso(draft));
                  setIosPickerVisible(false);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, marginBottom: 4, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  error: { fontSize: 13, marginTop: 4 },
});

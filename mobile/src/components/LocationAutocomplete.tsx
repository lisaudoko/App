import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TextField } from './TextField';
import { googlePlacesConfigured, searchPlaces, type PlaceSuggestion } from '@/lib/googlePlaces';

interface Props {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/** A plain text field that autofills suggestions from Google Places while typing —
 *  degrades to an ordinary TextField if EXPO_PUBLIC_GOOGLE_PLACES_API_KEY isn't set. */
export function LocationAutocomplete({ label, value, onChangeText, placeholder }: Props) {
  const { colors } = useAppTheme();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!focused) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      searchPlaces(value)
        .then((results) => {
          if (requestIdRef.current === requestId) setSuggestions(results);
        })
        .finally(() => {
          if (requestIdRef.current === requestId) setLoading(false);
        });
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, focused]);

  function handleSelect(s: PlaceSuggestion) {
    onChangeText(s.description);
    setSuggestions([]);
    setFocused(false);
  }

  if (!googlePlacesConfigured) {
    return <TextField label={label} value={value} onChangeText={onChangeText} placeholder={placeholder} />;
  }

  const showDropdown = focused && (loading || suggestions.length > 0);

  return (
    <View style={{ marginBottom: showDropdown ? 0 : 12 }}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        // Delay so a tap on a suggestion below registers before the list unmounts.
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {showDropdown && (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            marginTop: -8,
            marginBottom: 12,
            backgroundColor: colors.surfaceAlt,
            overflow: 'hidden',
          }}
        >
          {loading && (
            <View style={{ padding: 10, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          )}
          {!loading &&
            suggestions.map((s, i) => (
              <Pressable
                key={s.placeId}
                onPress={() => handleSelect(s)}
                style={{ paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
              >
                <Text style={{ fontSize: 13, color: colors.text }}>{s.description}</Text>
              </Pressable>
            ))}
        </View>
      )}
    </View>
  );
}

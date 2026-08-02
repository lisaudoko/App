import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useThemeStore, type ThemeMode } from '@/theme/themeStore';
import { useAuthStore } from '@/store/authStore';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export function SettingsScreen() {
  const { colors } = useAppTheme();
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const isBusy = useAuthStore((s) => s.isBusy);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  async function handleDelete() {
    await deleteAccount();
    setConfirmVisible(false);
    setConfirmText('');
    router.replace('/login');
  }

  function closeConfirm() {
    setConfirmVisible(false);
    setConfirmText('');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Settings" onBack={() => router.back()} />
      <Screen>
        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{session?.name}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{session?.email}</Text>
          <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 4 }}>
            {session?.programmeName} · {session?.role === 'coach' ? 'Coach' : 'Athlete'}
          </Text>
        </Card>

        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Appearance
        </Text>
        <Card style={{ flexDirection: 'row', gap: 8, padding: 8 }}>
          {THEME_OPTIONS.map((opt) => {
            const active = themeMode === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                onPress={() => setThemeMode(opt.mode)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: active ? colors.accent : 'transparent',
                }}
              >
                <Ionicons name={opt.icon} size={18} color={active ? colors.accentText : colors.textMuted} />
                <Text style={{ fontSize: 11, marginTop: 4, color: active ? colors.accentText : colors.textMuted }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </Card>

        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Account
        </Text>
        <Button label="Log out" variant="outline" onPress={handleLogout} />
        <Button label="Delete account" variant="danger" onPress={() => setConfirmVisible(true)} />

        <Text style={{ fontSize: 10, color: colors.textFaint, marginTop: 24, textAlign: 'center', lineHeight: 15 }}>
          TRU Performance · v1.0.0{'\n'}Deleting your account permanently removes your profile and logged results from this device.
        </Text>
      </Screen>

      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={closeConfirm}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
            <MotiView
              from={{ translateY: 300 }}
              animate={{ translateY: 0 }}
              transition={{ type: 'timing', duration: 250 }}
              style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Delete your account?</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16, lineHeight: 18 }}>
                This permanently deletes your profile, logged results, and workout history. This cannot be undone.
              </Text>
              <TextField
                placeholder='Type "DELETE" to confirm'
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
              />
              <Button
                label="Permanently delete account"
                variant="danger"
                disabled={confirmText.trim().toUpperCase() !== 'DELETE'}
                loading={isBusy}
                onPress={handleDelete}
              />
              <Button label="Cancel" variant="outline" onPress={closeConfirm} />
            </MotiView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, Text, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useThemeStore, type ThemeMode } from '@/theme/themeStore';
import { useAuthStore } from '@/store/authStore';
import { repository } from '@/data/repository';
import type { AppNotification } from '@/data/types';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [recentActivity, setRecentActivity] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (session?.role === 'coach') {
      repository.getMyProgrammeJoinCode().then(setTeamCode).catch(() => {});
    }
    repository
      .getNotifications()
      .then((all) => setRecentActivity(all.slice(0, 5)))
      .catch(() => {});
  }, [session?.role]);

  async function handleCopyTeamCode() {
    if (!teamCode) return;
    await Clipboard.setStringAsync(teamCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deleteAccount();
      setConfirmVisible(false);
      setConfirmText('');
      router.replace('/login');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete account. Try again.');
    }
  }

  function closeConfirm() {
    setConfirmVisible(false);
    setConfirmText('');
    setDeleteError(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Settings" onBack={router.canGoBack() ? () => router.back() : undefined} />
      <Screen>
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{session?.name}</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 2 }}>{session?.email}</Text>
          <Text style={{ fontSize: 13, color: colors.textFaint, marginTop: 4 }}>
            {session?.programmeName} · {session?.role === 'coach' ? 'Coach' : 'Athlete'}
          </Text>
        </Card>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Appearance
        </Text>
        <Card style={{ flexDirection: 'row', gap: 8, padding: 8 }}>
          {THEME_OPTIONS.map((opt) => {
            const active = themeMode === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                onPress={() => setThemeMode(opt.mode)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={opt.label}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: active ? colors.accent : 'transparent',
                }}
              >
                <Ionicons name={opt.icon} size={18} color={active ? colors.accentText : colors.textMuted} />
                <Text style={{ fontSize: 13, marginTop: 4, color: active ? colors.accentText : colors.textMuted }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </Card>

        {session?.role === 'coach' && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Team code
            </Text>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: 1 }}>{teamCode ?? '…'}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Share this so athletes can join your team from the signup screen.
                </Text>
              </View>
              <Pressable
                onPress={handleCopyTeamCode}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Copy team code"
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Ionicons name={codeCopied ? 'checkmark' : 'copy-outline'} size={18} color={codeCopied ? colors.success : colors.text} />
              </Pressable>
            </Card>

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Manage programme
            </Text>
            <Card style={{ padding: 0 }}>
              <SettingsLink icon="add-circle-outline" label="Add athlete" onPress={() => router.push('/(coach)/add-athlete')} />
              <SettingsLink icon="people-outline" label="Manage squad" onPress={() => router.push('/(coach)/settings/squad')} />
              <SettingsLink
                icon="options-outline"
                label="Event groups & standards"
                onPress={() => router.push('/(coach)/settings/config')}
                last
              />
            </Card>
          </>
        )}

        {recentActivity.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Recent activity
            </Text>
            <Card style={{ padding: 0 }}>
              {recentActivity.map((n, i) => (
                <View
                  key={n.id}
                  style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: i === recentActivity.length - 1 ? 0 : 1, borderBottomColor: colors.border }}
                >
                  <Text style={{ fontSize: 14, color: colors.text }}>{n.body}</Text>
                  <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 2 }}>{timeAgo(n.createdAt)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Support
        </Text>
        <Card style={{ padding: 0 }}>
          <SettingsLink
            icon="mail-outline"
            label="Contact support"
            onPress={() => Linking.openURL('mailto:support@truperformance.app?subject=TRU%20Performance%20Support')}
            last
          />
        </Card>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Legal
        </Text>
        <Card style={{ padding: 0 }}>
          <SettingsLink icon="document-text-outline" label="Privacy Policy" onPress={() => router.push('/privacy-policy')} />
          <SettingsLink icon="document-text-outline" label="Terms of Service" onPress={() => router.push('/terms')} last />
        </Card>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Account
        </Text>
        <Card style={{ padding: 0 }}>
          <SettingsLink icon="key-outline" label="Change password" onPress={() => router.push('/change-password')} last />
        </Card>
        <Button label="Log out" variant="outline" onPress={handleLogout} />
        <Button label="Delete account" variant="danger" onPress={() => setConfirmVisible(true)} />

        <Text style={{ fontSize: 12, color: colors.textFaint, marginTop: 24, textAlign: 'center', lineHeight: 15 }}>
          TRU Performance · v1.0.0{'\n'}Deleting your account permanently removes your profile and logged results from this device.
        </Text>
      </Screen>

      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={closeConfirm}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
            <MotiView
              from={{ translateY: 300 }}
              animate={{ translateY: 0 }}
              transition={{ type: 'timing', duration: 250 }}
              style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 }}
            >
              <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Delete your account?</Text>
              <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 16, lineHeight: 18 }}>
                This permanently deletes your profile, logged results, and workout history. This cannot be undone.
              </Text>
              <TextField
                placeholder='Type "DELETE" to confirm'
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
              />
              {deleteError && <Text style={{ color: colors.danger, fontSize: 15, marginBottom: 8 }}>{deleteError}</Text>}
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SettingsLink({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={{ fontSize: 17, color: colors.text, flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

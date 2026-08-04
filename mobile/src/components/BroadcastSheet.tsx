import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository } from '@/data/repository';
import type { Athlete } from '@/data/types';
import { Button } from '@/components/Button';
import { InlineNoteField } from '@/components/InlineNoteField';
import { radius, spacing } from '@/theme/spacing';

interface Props {
  visible: boolean;
  onClose: () => void;
  athletes: Athlete[];
}

export function BroadcastSheet({ visible, onClose, athletes }: Props) {
  const { colors } = useAppTheme();
  const [audience, setAudience] = useState<'squad' | 'select'>('squad');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);

  function reset() {
    setAudience('squad');
    setSelectedIds(new Set());
    setMessage('');
    setError(null);
    setSentCount(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleAthlete(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (!message.trim()) {
      setError('Write a message first.');
      return;
    }
    if (audience === 'select' && selectedIds.size === 0) {
      setError('Select at least one athlete.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const { sent } = await repository.broadcastToSquad(message.trim(), audience === 'select' ? Array.from(selectedIds) : undefined);
      setSentCount(sent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send broadcast');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={handleClose}>
        <Pressable style={{ marginTop: 'auto', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Broadcast to squad</Text>
          </View>

          {sentCount != null ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📣</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Sent</Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 16, textAlign: 'center' }}>
                Delivered to {sentCount} athlete{sentCount === 1 ? '' : 's'}.
              </Text>
              <Button label="Done" onPress={handleClose} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Audience</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.md }}>
                {(['squad', 'select'] as const).map((a) => {
                  const active = audience === a;
                  return (
                    <Pressable
                      key={a}
                      onPress={() => setAudience(a)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={a === 'squad' ? 'Whole squad' : 'Select athletes'}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        paddingVertical: 8,
                        borderRadius: radius.md,
                        backgroundColor: active ? colors.accent : 'transparent',
                        borderWidth: active ? 0 : 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>
                        {a === 'squad' ? `Whole squad (${athletes.length})` : 'Select athletes'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {audience === 'select' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
                  {athletes.map((a) => {
                    const active = selectedIds.has(a.id);
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => toggleAthlete(a.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: active }}
                        accessibilityLabel={a.name}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: radius.pill,
                          backgroundColor: active ? colors.accent : 'transparent',
                          borderWidth: active ? 0 : 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: active ? colors.accentText : colors.textMuted }}>{a.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Message</Text>
              <InlineNoteField
                value={message}
                onChangeText={setMessage}
                placeholder="Message your squad…"
                multiline
                minHeight={90}
                autoFocus
              />

              {error && <Text style={{ color: colors.danger, fontSize: 13, marginTop: 8 }}>{error}</Text>}
              <Button
                label={audience === 'squad' ? `Send to whole squad` : `Send to ${selectedIds.size} athlete${selectedIds.size === 1 ? '' : 's'}`}
                onPress={handleSend}
                loading={sending}
                disabled={!message.trim()}
              />
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository } from '@/data/repository';
import type { Meet } from '@/data/types';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';

interface StandardRow {
  event: string;
  value: string;
}

function emptyForm() {
  return { name: '', date: '', standards: [{ event: '', value: '' }] as StandardRow[] };
}

export default function MeetsScreen() {
  const { colors } = useAppTheme();
  const [meets, setMeets] = useState<Meet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Meet | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    repository
      .getMeets()
      .then(setMeets)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setModalVisible(true);
  }

  function openEdit(meet: Meet) {
    setEditing(meet);
    setForm({
      name: meet.name,
      date: meet.date,
      standards: Object.entries(meet.standards).map(([event, value]) => ({ event, value: String(value) })),
    });
    setError(null);
    setModalVisible(true);
  }

  function updateStandardRow(index: number, patch: Partial<StandardRow>) {
    setForm((f) => ({ ...f, standards: f.standards.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
  }

  function addStandardRow() {
    setForm((f) => ({ ...f, standards: [...f.standards, { event: '', value: '' }] }));
  }

  function removeStandardRow(index: number) {
    setForm((f) => ({ ...f, standards: f.standards.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!form.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError('Name and a date (YYYY-MM-DD) are required.');
      return;
    }
    const standards: Record<string, number> = {};
    for (const row of form.standards) {
      if (row.event.trim() && row.value.trim()) standards[row.event.trim()] = parseFloat(row.value);
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await repository.updateMeet(editing.id, { name: form.name.trim(), date: form.date, standards });
      } else {
        await repository.createMeet({ name: form.name.trim(), date: form.date, standards });
      }
      setModalVisible(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save meet');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setSaving(true);
    try {
      await repository.deleteMeet(editing.id);
      setModalVisible(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete meet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Meets & schedule"
        onBack={() => router.back()}
        rightIcon="add-circle-outline"
        onRightPress={openCreate}
        rightLabel="Add meet"
      />
      {loading ? (
        <LoadingState />
      ) : (
        <Screen onRefresh={async () => load()}>
          {meets.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
              <Ionicons name="trophy-outline" size={32} color={colors.textFaint} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>
                No meets yet
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
                Add your season's competitions and qualifying standards — they'll show up on the Standards tab.
              </Text>
            </View>
          )}
          {meets.map((meet) => (
            <Pressable key={meet.id} onPress={() => openEdit(meet)}>
              <Card>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{meet.name}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{meet.date}</Text>
                <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 4 }}>
                  {Object.entries(meet.standards)
                    .map(([event, v]) => `${event} ${v}m`)
                    .join(' · ') || 'No standards set'}
                </Text>
              </Card>
            </Pressable>
          ))}
        </Screen>
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <ScreenHeader title={editing ? 'Edit meet' : 'Add meet'} onBack={() => setModalVisible(false)} />
          <Screen>
            <TextField label="Meet name" value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} placeholder="e.g. Carifta Games" />
            <TextField
              label="Date (YYYY-MM-DD)"
              value={form.date}
              onChangeText={(t) => setForm((f) => ({ ...f, date: t }))}
              placeholder="2026-04-11"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 8 }}>
              Qualifying standards by event
            </Text>
            {form.standards.map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <View style={{ flex: 1.4 }}>
                  <TextField placeholder="Event (e.g. Shot Put)" value={row.event} onChangeText={(t) => updateStandardRow(i, { event: t })} />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    placeholder="Standard (m)"
                    keyboardType="decimal-pad"
                    value={row.value}
                    onChangeText={(t) => updateStandardRow(i, { value: t })}
                  />
                </View>
                <Pressable onPress={() => removeStandardRow(i)} hitSlop={8} style={{ paddingTop: 14 }}>
                  <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}
            <Button label="Add event standard" variant="outline" onPress={addStandardRow} />

            {error && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{error}</Text>}

            <Button label={editing ? 'Save changes' : 'Add meet'} onPress={handleSave} loading={saving} />
            {editing && <Button label="Delete meet" variant="danger" onPress={handleDelete} loading={saving} />}
          </Screen>
        </View>
      </Modal>
    </View>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { ScreenHeader } from '@/components/ScreenHeader';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTED_PROMPTS = [
  'How is the squad tracking for qualifying standards?',
  'Who is at risk of overtraining this week?',
  'Any anomalies I should look into?',
];

async function streamAiCoach(
  message: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  deepAnalysis: boolean,
  onDelta: (chunk: string) => void,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const resp = await expoFetch(`${baseUrl}/functions/v1/ai-coach`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey ?? '',
    },
    body: JSON.stringify({ message, conversationHistory, deepAnalysis }),
  });

  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => '');
    let message = `The AI assistant is unavailable right now. Please try again.`;
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed?.error === 'string') message = parsed.error;
      } catch {
        // Not JSON — keep the generic message rather than showing raw text.
      }
    }
    throw new Error(message);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value, { stream: true }));
  }
}

export default function AiAssistantScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, thinking]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || thinking) return;
    setInput('');
    setError(null);

    const history = messages.map((m) => ({ role: m.role, content: m.text }));
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: trimmed }]);
    setThinking(true);

    const assistantId = `a-${Date.now()}`;
    let started = false;

    try {
      await streamAiCoach(trimmed, history, deepAnalysis, (chunk) => {
        if (!started) {
          started = true;
          setThinking(false);
          setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: chunk }]);
        } else {
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + chunk } : m)));
        }
      });
    } catch (err) {
      setThinking(false);
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setThinking(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="AI assistant" />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}
      >
        <Text style={{ fontSize: 13, color: colors.textMuted }}>Deep analysis</Text>
        <Switch
          value={deepAnalysis}
          onValueChange={setDeepAnalysis}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.surface}
          accessibilityLabel="Deep analysis"
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {messages.length === 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 17, color: colors.textMuted, marginBottom: 8 }}>
                Ask me anything about your squad — qualifying status, risk flags, or a specific athlete.
              </Text>
              <Text style={{ fontSize: 12, color: colors.textFaint, marginBottom: 14, lineHeight: 14 }}>
                Responses are AI-generated from your squad&apos;s logged data and may be incomplete or inaccurate —
                use your own judgement before acting on them.
              </Text>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt}
                  onPress={() => send(prompt)}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 15, color: colors.text }}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {messages.map((m) => (
            <MotiView
              key={m.id}
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 200 }}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  backgroundColor: m.role === 'user' ? colors.accent : colors.surfaceAlt,
                  borderWidth: m.role === 'user' ? 0 : 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  borderBottomRightRadius: m.role === 'user' ? 2 : 12,
                  borderBottomLeftRadius: m.role === 'assistant' ? 2 : 12,
                  padding: 11,
                }}
              >
                <Text style={{ fontSize: 17, lineHeight: 19, color: m.role === 'user' ? colors.accentText : colors.text }}>
                  {m.text}
                </Text>
              </View>
            </MotiView>
          ))}
          {thinking && (
            <View style={{ alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 15, color: colors.textFaint }}>Thinking…</Text>
            </View>
          )}
          {error && (
            <View style={{ alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 15, color: colors.danger }}>{error}</Text>
            </View>
          )}
        </ScrollView>
        </TouchableWithoutFeedback>

        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            padding: 10,
            paddingBottom: insets.bottom + 10,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your squad…"
            placeholderTextColor={colors.textFaint}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 9,
              fontSize: 17,
              color: colors.text,
            }}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => send(input)}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: thinking }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: thinking ? 0.5 : 1,
            }}
            disabled={thinking}
          >
            <Ionicons name="arrow-up" size={16} color={colors.accentText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

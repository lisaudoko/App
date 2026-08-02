import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { answerCoachQuestion } from '@/engine/aiAssistant';
import { ScreenHeader } from '@/components/ScreenHeader';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export default function AiAssistantScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data } = useProgrammeData();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'greeting',
      role: 'assistant',
      text: 'Good morning, Coach. Ask me anything about your squad — qualifying status, risk flags, or a specific athlete.',
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, thinking]);

  function send() {
    const question = input.trim();
    if (!question) return;
    setInput('');
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: question }]);
    setThinking(true);
    setTimeout(() => {
      const answer = answerCoachQuestion(question, data);
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: answer }]);
      setThinking(false);
    }, 500);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="AI assistant" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} bounces={false}>
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
                <Text style={{ fontSize: 13, lineHeight: 19, color: m.role === 'user' ? colors.accentText : colors.text }}>
                  {m.text}
                </Text>
              </View>
            </MotiView>
          ))}
          {thinking && (
            <View style={{ alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 12, color: colors.textFaint }}>Thinking…</Text>
            </View>
          )}
        </ScrollView>

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
              fontSize: 13,
              color: colors.text,
            }}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable
            onPress={send}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-up" size={16} color={colors.accentText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

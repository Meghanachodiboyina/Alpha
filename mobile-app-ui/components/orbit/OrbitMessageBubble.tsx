import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export type MessageType =
  | 'user_message'
  | 'orbit_message'
  | 'clarification_question'
  | 'thinking_state'
  | 'routine_summary'
  | 'routine_preview_card'
  | 'task_recovery_prompt'
  | 'replan_suggestion'
  | 'ai_insight';

export interface OrbitMsg {
  id: number | string;
  role: 'user' | 'orbit';
  content: string;
  message_type: MessageType;
  metadata_json?: any;
  created_at?: string;
}

interface Props {
  message: OrbitMsg;
  theme: any;
  onClarificationAnswer?: (clarifications: Record<string, string>, originalMessage: string) => void;
  onRecoveryAction?: (action: 'today' | 'weekend' | 'dismiss', tasks: any[]) => void;
}

// ─── Typing Indicator ───────────────────────────────────────────────────────
export function TypingIndicator({ theme }: { theme: any }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    anim(dot1, 0).start();
    anim(dot2, 150).start();
    anim(dot3, 300).start();
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
      <View style={[styles.orbitAvatar, { backgroundColor: theme.orange + '22', borderColor: theme.orange + '44' }]}>
        <Text style={{ fontSize: 14, color: theme.orange }}>✦</Text>
      </View>
      <View style={[styles.orbitBubble, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4, paddingHorizontal: 2 }}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: theme.text3,
                transform: [{ translateY: dot }],
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Main Bubble ───────────────────────────────────────────────────────────
export default function OrbitMessageBubble({ message, theme, onClarificationAnswer, onRecoveryAction }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const isUser = message.role === 'user';

  const wrapper = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
    flexDirection: 'row' as const,
    justifyContent: isUser ? 'flex-end' as const : 'flex-start' as const,
    alignItems: 'flex-end' as const,
    gap: 10,
    marginBottom: 14,
  };

  if (isUser) {
    return (
      <Animated.View style={wrapper}>
        <View style={[styles.userBubble, { backgroundColor: theme.orange }]}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </Animated.View>
    );
  }

  // Orbit messages
  return (
    <Animated.View style={wrapper}>
      <View style={[styles.orbitAvatar, { backgroundColor: theme.orange + '22', borderColor: theme.orange + '44' }]}>
        <Text style={{ fontSize: 14, color: theme.orange }}>✦</Text>
      </View>
      <View style={{ flex: 1, maxWidth: '85%' }}>
        {message.message_type === 'thinking_state' ? (
          <ThinkingBubble content={message.content} theme={theme} />
        ) : message.message_type === 'clarification_question' ? (
          <ClarificationBubble
            message={message}
            theme={theme}
            onAnswer={onClarificationAnswer}
          />
        ) : message.message_type === 'routine_preview_card' ? (
          <RoutinePreviewCard message={message} theme={theme} />
        ) : message.message_type === 'routine_summary' ? (
          <SummaryBubble message={message} theme={theme} />
        ) : message.message_type === 'task_recovery_prompt' ? (
          <RecoveryCard message={message} theme={theme} onAction={onRecoveryAction} />
        ) : message.message_type === 'ai_insight' ? (
          <InsightBubble message={message} theme={theme} />
        ) : (
          <View style={[styles.orbitBubble, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[styles.orbitText, { color: theme.text }]}>{message.content}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Thinking Stages ───────────────────────────────────────────────────────
function ThinkingBubble({ content, theme }: { content: string; theme: any }) {
  const lines = content.split('\n').filter(Boolean);
  return (
    <View style={[styles.orbitBubble, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      {lines.map((line, i) => (
        <Text
          key={i}
          style={{
            fontSize: 13,
            color: theme.orange,
            fontWeight: '500',
            lineHeight: 22,
          }}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

// ─── Clarification Questions ────────────────────────────────────────────────
function ClarificationBubble({
  message, theme, onAnswer,
}: {
  message: OrbitMsg;
  theme: any;
  onAnswer?: (clarifications: Record<string, string>, originalMessage: string) => void;
}) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const clarifications: any[] = message.metadata_json?.clarifications || [];

  const handleSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const allAnswered = clarifications.length > 0 && clarifications.every(q => answers[q.id]);

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.orbitBubble, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.orbitText, { color: theme.text }]}>
          I need a few more details to build the perfect schedule:
        </Text>
      </View>
      {clarifications.map((q: any) => (
        <View key={q.id} style={[styles.orbitBubble, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {q.task_title && (
            <Text style={{ fontSize: 10, color: theme.orange, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {q.task_title}
            </Text>
          )}
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 10, lineHeight: 20 }}>
            {q.question}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(q.options || []).map((opt: any) => {
              const isSelected = answers[q.id] === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => handleSelect(q.id, opt.value)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingVertical: 8, paddingHorizontal: 12,
                    borderRadius: 20, borderWidth: 1.5,
                    backgroundColor: isSelected ? theme.orange + '22' : theme.surface,
                    borderColor: isSelected ? theme.orange : theme.border,
                  }}
                >
                  {opt.emoji ? <Text style={{ fontSize: 13 }}>{opt.emoji}</Text> : null}
                  <Text style={{ fontSize: 13, fontWeight: isSelected ? '700' : '500', color: isSelected ? theme.orange : theme.text2 }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      {allAnswered && (
        <TouchableOpacity
          onPress={() => onAnswer?.(answers, message.content)}
          style={{
            backgroundColor: theme.orange,
            paddingVertical: 12, paddingHorizontal: 20,
            borderRadius: 20, alignItems: 'center',
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
            ✦ Build My Schedule
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Routine Summary ────────────────────────────────────────────────────────
function SummaryBubble({ message, theme }: { message: OrbitMsg; theme: any }) {
  const lines = message.content.split('\n').filter(Boolean);
  const tips: string[] = message.metadata_json?.productivity_tips || [];

  return (
    <View style={[styles.orbitBubble, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <Text style={{ fontSize: 12, color: theme.orange, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Changes I made
      </Text>
      {lines.map((line, i) => (
        <Text key={i} style={{ fontSize: 14, color: theme.text, lineHeight: 22 }}>
          {line}
        </Text>
      ))}
      {tips.length > 0 && (
        <>
          <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 10 }} />
          {tips.slice(0, 3).map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
              <Text style={{ color: theme.orange, fontSize: 13 }}>•</Text>
              <Text style={{ fontSize: 13, color: theme.text2, lineHeight: 18, flex: 1 }}>{tip}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// ─── Routine Preview Card ────────────────────────────────────────────────────
function RoutinePreviewCard({ message, theme }: { message: OrbitMsg; theme: any }) {
  const router = useRouter();
  const meta = message.metadata_json || {};
  const taskCount: number = meta.task_count || 0;
  const hoursPlanned: number = meta.hours_planned || 0;
  const focusBlocks: number = meta.focus_blocks || 0;

  return (
    <View
      style={{
        borderRadius: 16, overflow: 'hidden',
        borderWidth: 1.5, borderColor: theme.orange + '55',
        backgroundColor: theme.cardBg,
      }}
    >
      {/* Header */}
      <View
        style={{
          padding: 16,
          backgroundColor: theme.orange + '15',
          borderBottomWidth: 1,
          borderBottomColor: theme.orange + '33',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: 16 }}>✦</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>Today's Routine Ready</Text>
        </View>
        <Text style={{ fontSize: 12, color: theme.text2 }}>Your optimized schedule is set</Text>
      </View>
      {/* Stats */}
      <View style={{ flexDirection: 'row', padding: 16, gap: 0 }}>
        {[
          { label: 'Tasks', value: taskCount, icon: '📋' },
          { label: 'Hours Planned', value: `${hoursPlanned}h`, icon: '⏱' },
          { label: 'Focus Blocks', value: focusBlocks, icon: '🎯' },
        ].map((stat, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 18 }}>{stat.icon}</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text, marginTop: 4 }}>{stat.value}</Text>
            <Text style={{ fontSize: 11, color: theme.text3, marginTop: 2 }}>{stat.label}</Text>
          </View>
        ))}
      </View>
      {/* CTA */}
      <TouchableOpacity
        onPress={() => router.navigate('/(tabs)/routines')}
        activeOpacity={0.8}
        style={{
          margin: 12, marginTop: 0,
          backgroundColor: theme.orange,
          padding: 14, borderRadius: 12,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>View My Routine</Text>
        <Feather name="arrow-right" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Task Recovery Card ─────────────────────────────────────────────────────
function RecoveryCard({
  message, theme, onAction,
}: {
  message: OrbitMsg;
  theme: any;
  onAction?: (action: 'today' | 'weekend' | 'dismiss', tasks: any[]) => void;
}) {
  const tasks: any[] = message.metadata_json?.tasks || [];

  return (
    <View style={[styles.orbitBubble, { backgroundColor: theme.cardBg, borderColor: '#f59e0b55' }]}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <Text style={{ fontSize: 16 }}>⚠️</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Unfinished from yesterday</Text>
      </View>
      {tasks.slice(0, 5).map((t: any, i: number) => (
        <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
          <Text style={{ color: '#f59e0b', fontSize: 13 }}>•</Text>
          <Text style={{ fontSize: 13, color: theme.text2 }}>{t.task_title}</Text>
        </View>
      ))}
      <Text style={{ fontSize: 13, color: theme.text2, marginTop: 8, marginBottom: 12 }}>
        What would you like to do with these?
      </Text>
      <View style={{ gap: 8 }}>
        {[
          { label: '📅 Move to Today', action: 'today' as const, primary: true },
          { label: '🗓 Move to This Weekend', action: 'weekend' as const, primary: false },
          { label: '✕ Dismiss', action: 'dismiss' as const, primary: false },
        ].map(btn => (
          <TouchableOpacity
            key={btn.action}
            onPress={() => onAction?.(btn.action, tasks)}
            activeOpacity={0.7}
            style={{
              padding: 12, borderRadius: 12,
              backgroundColor: btn.primary ? theme.orange : theme.surface,
              borderWidth: btn.primary ? 0 : 1,
              borderColor: theme.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: btn.primary ? '#fff' : theme.text2 }}>
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── AI Insight ─────────────────────────────────────────────────────────────
function InsightBubble({ message, theme }: { message: OrbitMsg; theme: any }) {
  return (
    <View style={[styles.orbitBubble, { backgroundColor: '#8b5cf611', borderColor: '#8b5cf655' }]}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
        <Text style={{ fontSize: 14 }}>💡</Text>
        <Text style={{ fontSize: 12, color: '#8b5cf6', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Orbit Insight</Text>
      </View>
      <Text style={{ fontSize: 14, color: theme.text, lineHeight: 20 }}>{message.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  userBubble: {
    maxWidth: '80%',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  userText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  orbitAvatar: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
    marginBottom: 4,
  },
  orbitBubble: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    padding: 14,
  },
  orbitText: {
    fontSize: 14,
    lineHeight: 21,
  },
});

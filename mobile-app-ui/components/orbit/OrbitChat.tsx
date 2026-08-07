import React from 'react';
import { FlatList, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { OrbitMsg } from './orbitTypes';
import ChatMessage from './ChatMessage';
import SchedulePreviewCard from './SchedulePreviewCard';
import { Animated } from 'react-native';

interface Props {
  messages: OrbitMsg[];
  theme: any;
  flatListRef: React.RefObject<FlatList>;
  status: string;
  isThinking: boolean;
  onRecoveryAction: (action: 'today' | 'weekend' | 'dismiss', tasks: any[]) => void;
}

// ─── Routine Summary (Ported from V2) ───────────────────────────────────────
function SummaryBubble({ message, theme }: { message: OrbitMsg; theme: any }) {
  const lines = message.content.split('\n').filter(Boolean);
  const tips: string[] = message.metadata_json?.productivity_tips || [];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 14 }}>
      <View style={[styles.orbitAvatar, { backgroundColor: theme.orange + '22', borderColor: theme.orange + '44' }]}>
        <Text style={{ fontSize: 14, color: theme.orange }}>✦</Text>
      </View>
      <View style={{ flex: 1, maxWidth: '85%' }}>
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
      </View>
    </View>
  );
}

// ─── AI Insight (Ported from V2) ────────────────────────────────────────────
function InsightBubble({ message, theme }: { message: OrbitMsg; theme: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 14 }}>
      <View style={[styles.orbitAvatar, { backgroundColor: theme.orange + '22', borderColor: theme.orange + '44' }]}>
        <Text style={{ fontSize: 14, color: theme.orange }}>✦</Text>
      </View>
      <View style={{ flex: 1, maxWidth: '85%' }}>
        <View style={[styles.orbitBubble, { backgroundColor: '#8b5cf611', borderColor: '#8b5cf655' }]}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 14 }}>💡</Text>
            <Text style={{ fontSize: 12, color: '#8b5cf6', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Orbit Insight</Text>
          </View>
          <Text style={{ fontSize: 14, color: theme.text, lineHeight: 20 }}>{message.content.split('\n\n[System Context:')[0]}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Task Recovery (Ported from V2) ─────────────────────────────────────────
function RecoveryCard({
  message, theme, onAction,
}: {
  message: OrbitMsg;
  theme: any;
  onAction?: (action: 'today' | 'weekend' | 'dismiss', tasks: any[]) => void;
}) {
  const tasks: any[] = message.metadata_json?.tasks || [];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 14 }}>
      <View style={[styles.orbitAvatar, { backgroundColor: theme.orange + '22', borderColor: theme.orange + '44' }]}>
        <Text style={{ fontSize: 14, color: theme.orange }}>✦</Text>
      </View>
      <View style={{ flex: 1, maxWidth: '85%' }}>
        <View style={[styles.orbitBubble, { backgroundColor: theme.cardBg, borderColor: '#f59e0b55' }]}>
          {/* Recovery content remains the same */}
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
          {tasks.length > 5 && (
            <Text style={{ fontSize: 13, color: theme.orange, marginTop: 2, fontStyle: 'italic' }}>
              + {tasks.length - 5} more tasks
            </Text>
          )}
          <Text style={{ fontSize: 13, color: theme.text2, marginTop: 8, marginBottom: 12 }}>
            What would you like to do with these?
          </Text>
          <View style={{ flexDirection: 'column', gap: 8 }}>
            <TouchableOpacity 
              onPress={() => onAction?.('today', tasks)}
              style={{ backgroundColor: theme.orange, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Add to Today</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity 
                onPress={() => onAction?.('weekend', tasks)}
                style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
              >
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>Weekend</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => onAction?.('dismiss', tasks)}
                style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
              >
                <Text style={{ color: theme.text3, fontSize: 13, fontWeight: '600' }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Status Components ──────────────────────────────────────────────────────
function SequentialStatus({ theme }: { theme: any }) {
  const [index, setIndex] = React.useState(0);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const statuses = [
    "Orbit is understanding your tasks...",
    "Orbit is checking your schedule...",
    "Orbit is creating your routine...",
    "Orbit is finalizing your day..."
  ];

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setIndex((prev) => (prev + 1 < statuses.length ? prev + 1 : prev));
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <View style={[styles.orbitAvatar, { backgroundColor: theme.orange + '22', borderColor: theme.orange + '44' }]}>
        <Text style={{ fontSize: 14, color: theme.orange }}>✦</Text>
      </View>
      <Animated.Text style={{ color: theme.text3, fontSize: 13, opacity: fadeAnim }}>
        {statuses[index]}
      </Animated.Text>
    </View>
  );
}

export function TypingIndicator({ theme }: { theme: any }) {
  const opacities = [
    React.useRef(new Animated.Value(0.3)).current,
    React.useRef(new Animated.Value(0.3)).current,
    React.useRef(new Animated.Value(0.3)).current,
  ];

  React.useEffect(() => {
    const animateDot = (index: number) => {
      Animated.sequence([
        Animated.timing(opacities[index], { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacities[index], { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        if (index === 2) animateDot(0);
        else animateDot(index + 1);
      });
    };
    animateDot(0);
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <View style={[styles.orbitAvatar, { backgroundColor: theme.orange + '22', borderColor: theme.orange + '44' }]}>
        <Text style={{ fontSize: 14, color: theme.orange }}>✦</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: theme.cardBg, padding: 12, borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.border, alignSelf: 'flex-start' }}>
        {opacities.map((op, i) => (
          <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.text2, opacity: op }} />
        ))}
      </View>
    </View>
  );
}

export default function OrbitChat({ messages, theme, flatListRef, status, isThinking, onRecoveryAction }: Props) {
  
  const renderItem = ({ item }: { item: OrbitMsg }) => {
    switch (item.message_type) {
      case 'routine_preview_card':
        return <SchedulePreviewCard message={item} theme={theme} />;
      case 'routine_summary':
        return <SummaryBubble message={item} theme={theme} />;
      case 'task_recovery_prompt':
        return <RecoveryCard message={item} theme={theme} onAction={onRecoveryAction} />;
      case 'ai_insight':
        return <InsightBubble message={item} theme={theme} />;
      case 'thinking_state':
        return null; // Handled by footer
      default:
        return <ChatMessage message={item} theme={theme} />;
    }
  };

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      renderItem={renderItem}
      ListFooterComponent={
        isThinking && status === 'GENERATING' ? (
          <SequentialStatus theme={theme} />
        ) : isThinking ? (
          <TypingIndicator theme={theme} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
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
});

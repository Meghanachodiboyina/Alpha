import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { OrbitMsg } from './orbitTypes';

interface Props {
  message: OrbitMsg;
  theme: any;
}

export default function ChatMessage({ message, theme }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
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
          <Text style={styles.userText}>{message.content.split('\n\n[System Context:')[0]}</Text>
        </View>
      </Animated.View>
    );
  }

  // Generic Orbit Text Message
  return (
    <Animated.View style={wrapper}>
      <View style={[styles.orbitAvatar, { backgroundColor: theme.orange + '22', borderColor: theme.orange + '44' }]}>
        <Text style={{ fontSize: 14, color: theme.orange }}>✦</Text>
      </View>
      <View style={{ flex: 1, maxWidth: '85%' }}>
        <View style={[styles.orbitBubble, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.orbitText, { color: theme.text }]}>{message.content}</Text>
        </View>
      </View>
    </Animated.View>
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

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, TouchableOpacity } from 'react-native';

interface Props {
  theme: any;
  isInputFocused: boolean;
  onSuggestionPress: (text: string) => void;
}

const SUGGESTIONS = [
  '📚 Study SQL + Gym',
  '⚡️ Deep Work Day',
  '🗓 Weekend Planner',
  '🚀 Project Sprint',
  '📝 Exam Preparation',
];

export default function OrbitLanding({ theme, isInputFocused, onSuggestionPress }: Props) {
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const titleTranslateY = useRef(new Animated.Value(0)).current;
  const subOpacity = useRef(new Animated.Value(1)).current;
  const chipsOpacity = useRef(new Animated.Value(1)).current;
  const chipsTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isInputFocused) {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: -30, duration: 250, useNativeDriver: true }),
        Animated.timing(subOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(chipsOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(chipsTranslateY, { toValue: 20, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(subOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(chipsOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(chipsTranslateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [isInputFocused]);

  return (
    <View style={styles.container} pointerEvents={isInputFocused ? 'none' : 'auto'}>
      <Animated.View style={[styles.centerBlock, { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]}>
        <Text style={[styles.orbitTitle, { color: theme.text }]}>
          Orbit <Text style={{ color: theme.orange }}>✦</Text>
        </Text>
      </Animated.View>

      <Animated.View style={{ opacity: subOpacity, alignItems: 'center' }}>
        <Text style={[styles.orbitSubtitle, { color: theme.text3 }]}>
          Plan your day with AI
        </Text>
      </Animated.View>

      <Animated.View style={[styles.chipsContainer, { opacity: chipsOpacity, transform: [{ translateY: chipsTranslateY }] }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {SUGGESTIONS.map((sug, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.chip, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => onSuggestionPress(sug.replace(/^[^\s]+\s/, ''))}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: theme.text2 }]}>{sug}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40, // offset slightly
  },
  centerBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  orbitTitle: {
    fontSize: 32, // reduced from 44
    fontWeight: '800',
    letterSpacing: -1,
  },
  orbitSubtitle: {
    fontSize: 14,
    marginBottom: 32,
  },
  chipsContainer: {
    width: '100%',
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  }
});

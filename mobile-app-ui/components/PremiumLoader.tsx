/**
 * PremiumLoader.tsx
 *
 * Exports:
 *  - SplashAnimation     — Premium Routinely orbit logo construction animation.
 *  - DashboardSkeleton   — Alias → SplashAnimation wrapper
 *  - ClickUpStyleLoader  — Legacy 3-dot loader
 *  - FadeInView          — Fade-in wrapper for content reveal
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
  Circle,
} from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';

import SplashAnimation from './SplashAnimation';

// ─────────────────────────────────────────────────────────────────
// DASHBOARD SKELETON (In-app loading)
// ─────────────────────────────────────────────────────────────────
export const appState = { justLoggedIn: false };
export const DashboardSkeleton = (props: any) => <ClickUpStyleLoader {...props} />;

// ── Legacy aliases ────────────────────────────────────────────────
export const RoutinesSkeleton  = DashboardSkeleton;
export const WorkspaceSkeleton = DashboardSkeleton;
export const AnalyticsSkeleton = DashboardSkeleton;

// ── Legacy 3-dot bounce loader ────────────────────────────────────
export const ClickUpStyleLoader = () => {
  const { theme } = useTheme();
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (a: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(a, { toValue: -12, duration: 300, useNativeDriver: true }),
            Animated.timing(a, { toValue: 0,   duration: 300, useNativeDriver: true }),
            Animated.delay(400),
          ])
        ),
      ]);
    Animated.parallel([bounce(anim1, 0), bounce(anim2, 150), bounce(anim3, 300)]).start();
  }, [anim1, anim2, anim3]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {([anim1, anim2, anim3] as Animated.Value[]).map((a, i) => (
          <Animated.View key={i} style={{
            width: 14, height: 14, borderRadius: 4,
            backgroundColor: [theme.blue, theme.purple, theme.orange][i] as string,
            transform: [{ translateY: a }],
          }} />
        ))}
      </View>
    </View>
  );
};

// ── FadeInView ────────────────────────────────────────────────────
export const FadeInView = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) => {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Animated.View style={[{ flex: 1, opacity }, style]}>
        {children}
      </Animated.View>
    </View>
  );
};

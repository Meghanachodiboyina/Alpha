/**
 * SplashAnimation.tsx
 *
 * Small, elegant Routinely logo animation for post-login transition.
 * Uses the exact same 32×32 logo paths as the Navbar.
 *
 * Sequence:
 *  1. Dark bg fades in
 *  2. Orbit arc draws itself (strokeDashoffset)
 *  3. Orbital dot fades in
 *  4. "R" softly fades in at center
 *  5. Hold completed logo ~1s
 *  6. Whole screen fades out → onFinished()
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
  Circle,
} from 'react-native-svg';

// ── Use the exact 32×32 viewBox matching the Navbar logo ─────────
const VIEWBOX = 32;

// Exact paths from Navbar.tsx
const ORBIT_PATH = 'M 19.6 2.5 A 14 14 0 1 0 29.5 12.4';
const R_PATH = 'M 12 8 L 18 8 A 5.5 5.5 0 0 1 18 19 L 9 19 L 14 24 L 18 24 L 10 16 L 18 16 A 2.5 2.5 0 0 0 18 11 L 9 11 Z';
const DOT_CX = 25.9;
const DOT_CY = 6.1;
const DOT_R = 2.8;

// Approximate orbit arc length for dash animation
const ORBIT_ARC_LENGTH = 2 * Math.PI * 14 * (310 / 360); // ~75.9

const BRAND = {
  bg:     '#0a0a0f',
  orange: '#ff6b35',
  pink:   '#ec4899',
  purple: '#8b5cf6',
};

// Display size — small and crisp, not oversized
const LOGO_SIZE = 80;

const AnimatedPath = Animated.createAnimatedComponent(Path as any);

// ─────────────────────────────────────────────────────────────────
export interface SplashAnimationProps {
  onFinished?: () => void;
  isFullScreen?: boolean;
}

export default function SplashAnimation({ onFinished, isFullScreen = true }: SplashAnimationProps) {
  const orbitProgress = useRef(new Animated.Value(0)).current;
  const dotOpacity    = useRef(new Animated.Value(0)).current;
  const rOpacity      = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const sequence = [
      // Phase 1: Draw orbit arc over 900ms
      Animated.timing(orbitProgress, {
        toValue: 1,
        duration: 900,
        delay: 300,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      // Phase 2: Dot + R fade in together
      Animated.parallel([
        Animated.timing(dotOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ];

    if (isFullScreen) {
      sequence.push(
        // Phase 3: Hold completed logo
        Animated.delay(1000),
        // Phase 4: Fade out entire overlay
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      );
    }

    Animated.sequence(sequence).start(({ finished }) => {
      if (finished && onFinished) onFinished();
      
      // If it's an in-app loader, we can add a subtle infinite pulse here
      if (finished && !isFullScreen) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(rOpacity, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
            Animated.timing(rOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
          ])
        ).start();
      }
    });
  }, []);

  // strokeDashoffset: full → 0 (draws the arc)
  const strokeDashoffset = orbitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [ORBIT_ARC_LENGTH, 0],
  });

  return (
    <Animated.View style={[
      isFullScreen ? StyleSheet.absoluteFillObject : { flex: 1 }, 
      styles.container, 
      { opacity: screenOpacity }
    ]}>

      {/* Orbit arc — draws itself */}
      <View style={styles.logoWrap}>
        <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          <Defs>
            <SvgLinearGradient id="sp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor={BRAND.orange} />
              <Stop offset="50%"  stopColor={BRAND.pink}   />
              <Stop offset="100%" stopColor={BRAND.purple} />
            </SvgLinearGradient>
          </Defs>

          {/* Orbit arc */}
          <AnimatedPath
            d={ORBIT_PATH}
            fill="none"
            stroke="url(#sp-grad)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={ORBIT_ARC_LENGTH}
            strokeDashoffset={strokeDashoffset}
          />
        </Svg>
      </View>

      {/* Orbital dot */}
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.logoWrap, { opacity: dotOpacity }]} pointerEvents="none">
        <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          <Defs>
            <SvgLinearGradient id="sp-dot" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor={BRAND.orange} />
              <Stop offset="100%" stopColor={BRAND.pink}   />
            </SvgLinearGradient>
          </Defs>
          <Circle cx={DOT_CX} cy={DOT_CY} r={DOT_R} fill="url(#sp-dot)" />
        </Svg>
      </Animated.View>

      {/* R letter */}
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.logoWrap, { opacity: rOpacity }]} pointerEvents="none">
        <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          <Defs>
            <SvgLinearGradient id="sp-r" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor={BRAND.orange} />
              <Stop offset="50%"  stopColor={BRAND.pink}   />
              <Stop offset="100%" stopColor={BRAND.purple} />
            </SvgLinearGradient>
          </Defs>
          <Path d={R_PATH} fill="url(#sp-r)" />
        </Svg>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.bg,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

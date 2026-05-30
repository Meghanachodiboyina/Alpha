import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export const ClickUpStyleLoader = () => {
  const { theme, isDarkMode } = useTheme();
  
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (anim: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: -12,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.delay(400),
          ])
        )
      ]);
    };

    Animated.parallel([
      createBounce(anim1, 0),
      createBounce(anim2, 150),
      createBounce(anim3, 300),
    ]).start();
  }, [anim1, anim2, anim3]);

  const dotStyle = (anim: Animated.Value, color: string) => ({
    width: 14,
    height: 14,
    borderRadius: 4, // Slight curve like ClickUp squares
    backgroundColor: color,
    transform: [{ translateY: anim }],
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Animated.View style={dotStyle(anim1, theme.blue || '#3B82F6')} />
        <Animated.View style={dotStyle(anim2, theme.purple || '#8B5CF6')} />
        <Animated.View style={dotStyle(anim3, theme.orange || '#FF6B35')} />
      </View>
    </View>
  );
};

// Export aliases so the other files don't need their imports changed
export const DashboardSkeleton = ClickUpStyleLoader;
export const RoutinesSkeleton = ClickUpStyleLoader;
export const WorkspaceSkeleton = ClickUpStyleLoader;
export const AnalyticsSkeleton = ClickUpStyleLoader;

export const FadeInView = ({ children, style }: { children: React.ReactNode, style?: any }) => {
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

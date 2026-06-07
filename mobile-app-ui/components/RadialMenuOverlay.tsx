import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Alert, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function RadialMenuOverlay({ isOpen, onClose }: Props) {
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();
  
  const animValue = useRef(new Animated.Value(0)).current;
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      Animated.spring(animValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.spring(animValue, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start(() => {
        setRender(false);
      });
    }
  }, [isOpen]);

  if (!render) return null;

  const actions = [
    { id: 'focus', label: 'Focus', icon: 'target', color: theme.red, route: '/focus-mode' },
    { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2', color: theme.blue, route: '/(tabs)/analytics' },
    { id: 'builder', label: 'AI Builder', icon: 'orbit', color: theme.orange, route: '/(tabs)/ai-planner' },
    { id: 'routine', label: 'Routine', icon: 'plus-circle', color: theme.green, route: '/(tabs)/routines' },
  ];

  // Distribute 4 items symmetrically around the 90-degree center
  const angles = [150, 110, 70, 30];
  const radius = 150;

  const handlePress = (route: string) => {
    onClose();
    if (route === 'placeholder') {
      Alert.alert('Coming Soon', 'This feature is coming soon!');
    } else {
      setTimeout(() => {
        router.navigate(route as any);
      }, 100);
    }
  };

  const bgOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isDarkMode ? 0.85 : 0.75],
  });

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? '#0a0a0f' : '#f9fafb', opacity: bgOpacity }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      
      {/* Positioned slightly higher to prevent dropping items below tab bar */}
      <View style={{ position: 'absolute', bottom: 60, left: '50%', zIndex: 101 }} pointerEvents="box-none">
        {actions.map((action, index) => {
          const angleRad = (angles[index] * Math.PI) / 180;
          
          const tx = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, radius * Math.cos(angleRad)]
          });
          const ty = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -radius * Math.sin(angleRad)]
          });
          const scale = animValue.interpolate({
            inputRange: [0, 0.6, 1],
            outputRange: [0.4, 1.1, 1]
          });
          const opacity = animValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 1, 1]
          });

          return (
            <Animated.View
              key={action.id}
              style={{
                position: 'absolute',
                transform: [{ translateX: tx }, { translateY: ty }, { scale }],
                opacity: opacity,
                alignItems: 'center',
                marginLeft: -30, // center 60px width
                marginTop: -30,
              }}
            >
              <TouchableOpacity
                onPress={() => handlePress(action.route)}
                activeOpacity={0.7}
                style={{
                  width: 60, height: 60, borderRadius: 30, // Larger touch targets
                  backgroundColor: isDarkMode ? '#1f1f2e' : '#ffffff',
                  borderWidth: 1, borderColor: `${action.color}40`,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: action.color, shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: isDarkMode ? 0.4 : 0.15, shadowRadius: 16,
                  marginBottom: 10,
                }}
              >
                {action.icon === 'orbit' ? (
                  <Text style={{ fontSize: 28, color: action.color, marginBottom: 2 }}>✦</Text>
                ) : (
                  <Feather name={action.icon as any} size={24} color={action.color} />
                )}
              </TouchableOpacity>
              
              {/* Clean, floating text label without background boxes */}
              <Text style={{ 
                fontSize: 12, fontWeight: '700', color: theme.text,
                textShadowColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
                textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
              }}>
                {action.label}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

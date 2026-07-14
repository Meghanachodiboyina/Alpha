import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Platform, TouchableOpacity, Animated } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RadialMenuOverlay from '../../components/RadialMenuOverlay';

const CenterFabButton = ({ isMenuOpen, onPress, theme }: any) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(spinAnim, {
      toValue: isMenuOpen ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, [isMenuOpen]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  const zapOpacity = spinAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0]
  });

  const plusOpacity = spinAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1]
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        top: -18,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Animated.View style={{
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: theme.orange,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: theme.orange,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 8,
        transform: [{ rotate: spin }]
      }}>
        <Animated.View style={{ opacity: zapOpacity, position: 'absolute' }}>
          <Text style={{ fontSize: 26, color: '#fff', marginBottom: 2 }}>✦</Text>
        </Animated.View>
        <Animated.View style={{ opacity: plusOpacity, position: 'absolute' }}>
          <Feather name="plus" size={28} color="#fff" />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function TabsLayout() {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDarkMode ? 'rgba(13,13,20,0.92)' : 'rgba(255,255,255,0.92)',
            borderTopWidth: 1,
            borderTopColor: theme.border,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
          tabBarActiveTintColor: theme.orange,
          tabBarInactiveTintColor: theme.text3,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 2,
          },
          animation: 'fade',
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <Feather name="home" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="routines"
          options={{
            title: 'Planner',
            tabBarIcon: ({ color }) => (
              <Feather name="calendar" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ai-planner"
          options={{
            title: '',
            tabBarButton: (props) => (
              <CenterFabButton isMenuOpen={isMenuOpen} onPress={() => setIsMenuOpen(!isMenuOpen)} theme={theme} />
            ),
          }}
        />
        <Tabs.Screen
          name="workspace"
          options={{
            title: 'Workspace',
            tabBarIcon: ({ color }) => (
              <Feather name="briefcase" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <Feather name="user" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="analytics" options={{ href: null }} />
        <Tabs.Screen name="history" options={{ href: null }} />
      </Tabs>
      <RadialMenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </View>
  );
}

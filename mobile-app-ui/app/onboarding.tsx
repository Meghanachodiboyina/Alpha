import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Slide = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  renderGraphic: (theme: any, isDarkMode: boolean) => React.ReactNode;
};

export default function OnboardingScreen() {
  const { theme, isDarkMode } = useTheme();
  const { completeOnboarding } = useAuth();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  const { width } = useWindowDimensions();

  const slides: Slide[] = [
    {
      id: '1',
      title: 'Routinely.',
      subtitle: 'Design Your Day',
      description: 'Create positive habits, structure your routines, and watch your daily progress ring fill up as you accomplish goals.',
      icon: 'check-circle',
      color: theme.orange,
      renderGraphic: (t, isDark) => (
        <View style={styles.graphicContainer}>
          <Svg width="180" height="180" viewBox="0 0 100 100">
            {/* Background ring */}
            <Circle
              cx="50"
              cy="50"
              r="40"
              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
              strokeWidth="6"
              fill="none"
            />
            {/* Orange progress ring */}
            <Circle
              cx="50"
              cy="50"
              r="40"
              stroke={t.orange}
              strokeWidth="7"
              strokeDasharray="251.2"
              strokeDashoffset="75" // 70% completed
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90, 50, 50)"
            />
            {/* Purple progress ring (inner) */}
            <Circle
              cx="50"
              cy="50"
              r="28"
              stroke={t.purple}
              strokeWidth="6"
              strokeDasharray="175.8"
              strokeDashoffset="87.9" // 50% completed
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90, 50, 50)"
            />
          </Svg>
          <View style={[styles.centerIconOverlay, { backgroundColor: isDark ? '#111118' : '#ffffff' }]}>
            <Feather name="check" size={32} color={t.orange} />
          </View>
        </View>
      ),
    },
    {
      id: '2',
      title: 'Flow.',
      subtitle: 'Deep Focus Sessions',
      description: 'Get into the flow state. Activate Focus Mode to lock out distractions, track custom deep work segments, and build streaks.',
      icon: 'target',
      color: theme.blue,
      renderGraphic: (t, isDark) => (
        <View style={styles.graphicContainer}>
          <Svg width="180" height="180" viewBox="0 0 100 100">
            {/* Dial scale dots */}
            <Circle
              cx="50"
              cy="50"
              r="42"
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              strokeWidth="1"
              strokeDasharray="2, 6"
              fill="none"
            />
            {/* Blue active segment */}
            <Circle
              cx="50"
              cy="50"
              r="34"
              stroke={t.blue}
              strokeWidth="5"
              strokeDasharray="213.6"
              strokeDashoffset="42" // 80% active
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90, 50, 50)"
            />
          </Svg>
          <View style={[styles.centerIconOverlay, { backgroundColor: isDark ? '#111118' : '#ffffff' }]}>
            <Feather name="clock" size={32} color={t.blue} />
          </View>
          {/* Subtle floating pills to resemble focus intervals */}
          <View style={[styles.floatingPill, { top: 20, right: 10, backgroundColor: isDark ? '#1a1a26' : '#ffffff', borderColor: t.border }]}>
            <Feather name="zap" size={12} color={t.orange} />
            <Text style={[styles.pillText, { color: t.text }]}>25m</Text>
          </View>
          <View style={[styles.floatingPill, { bottom: 20, left: 10, backgroundColor: isDark ? '#1a1a26' : '#ffffff', borderColor: t.border }]}>
            <Feather name="coffee" size={12} color={t.green} />
            <Text style={[styles.pillText, { color: t.text }]}>5m</Text>
          </View>
        </View>
      ),
    },
    {
      id: '3',
      title: 'Action.',
      subtitle: 'Intelligent Quick Actions',
      description: 'Tap the center AI button anywhere in the app to open the radial menu. Speedily build routines, log focus, or see analytics.',
      icon: 'zap',
      color: theme.purple,
      renderGraphic: (t, isDark) => (
        <View style={styles.graphicContainer}>
          {/* Radial arc representation */}
          <Svg width="200" height="150" viewBox="0 0 100 75">
            {/* Center target line arcs */}
            <Circle
              cx="50"
              cy="65"
              r="40"
              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
              strokeWidth="2"
              fill="none"
            />
            {/* Dotted lines radiating from center button to actions */}
            <Line x1="50" y1="65" x2="20" y2="35" stroke={t.border} strokeWidth="1" strokeDasharray="2, 2" />
            <Line x1="50" y1="65" x2="40" y2="20" stroke={t.border} strokeWidth="1" strokeDasharray="2, 2" />
            <Line x1="50" y1="65" x2="60" y2="20" stroke={t.border} strokeWidth="1" strokeDasharray="2, 2" />
            <Line x1="50" y1="65" x2="80" y2="35" stroke={t.border} strokeWidth="1" strokeDasharray="2, 2" />
          </Svg>
          
          {/* Center FAB */}
          <View style={[styles.centerFabMock, { backgroundColor: t.orange, shadowColor: t.orange }]}>
            <Feather name="plus" size={24} color="#ffffff" />
          </View>

          {/* Symmetrical Arc Actions */}
          <View style={[styles.arcItemMock, { left: 20, top: 40, backgroundColor: isDark ? '#1a1a26' : '#ffffff', borderColor: t.red + '40' }]}>
            <Feather name="target" size={14} color={t.red} />
          </View>
          <View style={[styles.arcItemMock, { left: 52, top: 15, backgroundColor: isDark ? '#1a1a26' : '#ffffff', borderColor: t.blue + '40' }]}>
            <Feather name="bar-chart-2" size={14} color={t.blue} />
          </View>
          <View style={[styles.arcItemMock, { right: 52, top: 15, backgroundColor: isDark ? '#1a1a26' : '#ffffff', borderColor: t.orange + '40' }]}>
            <Feather name="zap" size={14} color={t.orange} />
          </View>
          <View style={[styles.arcItemMock, { right: 20, top: 40, backgroundColor: isDark ? '#1a1a26' : '#ffffff', borderColor: t.green + '40' }]}>
            <Feather name="plus-circle" size={14} color={t.green} />
          </View>
        </View>
      ),
    },
  ];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    await completeOnboarding();
    // Router replacement will be triggered automatically by useProtectedRoute in _layout
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      {/* Skip Button */}
      <View style={styles.header}>
        {currentIndex < slides.length - 1 ? (
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.6}>
            <Text style={[styles.skipText, { color: theme.text2 }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 1 }} />
        )}
      </View>

      {/* Slides FlatList */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={[styles.slideContainer, { width }]}>
            {/* Graphic Illustration */}
            <View style={styles.illustrationWrapper}>
              {item.renderGraphic(theme, isDarkMode)}
            </View>

            {/* Core Titles */}
            <View style={styles.textWrapper}>
              <Text style={[styles.brandTitle, { color: item.color }]}>
                {item.title}
              </Text>
              <Text style={[styles.subtitle, { color: theme.text }]}>
                {item.subtitle}
              </Text>
              <Text style={[styles.description, { color: theme.text2 }]}>
                {item.description}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Footer Controls */}
      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.paginationWrapper}>
          {slides.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? theme.orange : theme.borderStrong,
                    width: isActive ? 24 : 8,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.8}
          style={[
            styles.primaryButton,
            {
              width: width - 64,
              backgroundColor: theme.orange,
              shadowColor: theme.orange,
            },
          ]}
        >
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Feather
            name={currentIndex === slides.length - 1 ? 'arrow-right' : 'chevron-right'}
            size={18}
            color="#ffffff"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustrationWrapper: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  graphicContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIconOverlay: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    // shadow elevation
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  floatingPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  centerFabMock: {
    position: 'absolute',
    bottom: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  arcItemMock: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  textWrapper: {
    alignItems: 'center',
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 20 : 32,
    alignItems: 'center',
  },
  paginationWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH - 64,
    height: 54,
    borderRadius: 27,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

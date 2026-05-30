import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Modal, Animated, Dimensions, Easing, Platform, TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { Radius, FontSize } from '@/constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define the focus modes with their unique behaviors
type FocusModeType = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  gradientColors: string[];
  bgStyle: 'peach' | 'lavender' | 'pink' | 'sage';
  timerType: 'countdown' | 'countup';
  aiTips: string[];
};

const FOCUS_MODES: FocusModeType[] = [
  {
    id: 'deep_work',
    name: 'Focus Mode',
    icon: 'zap',
    tagline: 'High intensity concentration and execute focus.',
    primaryColor: '#ff6b35',
    secondaryColor: '#ff9f7d',
    gradientColors: ['#fffbf7', '#ffece3'],
    bgStyle: 'peach',
    timerType: 'countdown',
    aiTips: [
      "Avoid task switching now. Multitasking lowers efficiency by 40%.",
      "Distraction shield is active. Put your phone face down.",
      "Stay in the zone. You are working on your highest priority task.",
      "Block out internal distractions. Keep executing.",
    ],
  }
];

const AMBIENT_SOUNDS = [
  { id: 'none', name: 'Mute', icon: 'volume-x', desc: 'Silence' },
  { id: 'rain', name: 'Gentle Rain', icon: 'cloud-rain', desc: 'Soft window drops' },
  { id: 'forest', name: 'Summer Forest', icon: 'wind', desc: 'Birds & breeze' },
  { id: 'waves', name: 'Ocean Waves', icon: 'droplet', desc: 'Calm rolling tide' },
  { id: 'cafe', name: 'Coffee Shop', icon: 'coffee', desc: 'Subtle chatter & clinking' },
  { id: 'white', name: 'White Noise', icon: 'cloud', desc: 'Steady focus hum' },
];

export default function FocusModeScreen() {
  const { theme, themeMode } = useTheme();
  const isDarkMode = themeMode === 'dark';
  const router = useRouter();
  
  // Route parameters
  const params = useLocalSearchParams();
  const taskTitle = (params.title as string) || 'Deep Work Session';
  const taskCategory = (params.category as string) || 'Personal';
  const initialDuration = parseInt(params.estimatedTime as string) || 45;

  // Primary State
  const [currentMode, setCurrentMode] = useState<FocusModeType>(FOCUS_MODES[0]);
  const [timeLeft, setTimeLeft] = useState(initialDuration * 60);
  const [totalSessionTime, setTotalSessionTime] = useState(initialDuration * 60);
  const [elapsedTime, setElapsedTime] = useState(0); // Used for Creative Mode count-up
  const [isActive, setIsActive] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Pomodoro-specific state (Study Mode)
  const [pomodoroCycle, setPomodoroCycle] = useState<'study' | 'break'>('study');
  const [studyRoundsCompleted, setStudyRoundsCompleted] = useState(0);

  // Creative Mode notepad state
  const [creativeNotes, setCreativeNotes] = useState('');
  
  // Quiet Study Mode active recall inputs
  const [recallAnswer1, setRecallAnswer1] = useState('');
  const [recallAnswer2, setRecallAnswer2] = useState('');
  const [recallAnswer3, setRecallAnswer3] = useState('');

  // Calm Mode breathing guide state
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  // Bottom Sheets State
  const [soundSheetVisible, setSoundSheetVisible] = useState(false);
  const [controlsSheetVisible, setControlsSheetVisible] = useState(false);
  const [insightsModalVisible, setInsightsModalVisible] = useState(false);

  // Sound settings
  const [activeSound, setActiveSound] = useState(AMBIENT_SOUNDS[0]);
  const [volume, setVolume] = useState(50); // 0 to 100

  // Stat tracking
  const [interruptionCount, setInterruptionCount] = useState(0);
  const [currentTip, setCurrentTip] = useState(currentMode.aiTips[0]);

  // Breathing Guide / Glow Animation
  const glowAnim = useRef(new Animated.Value(1)).current;
  const timerInterval = useRef<any>(null);

  // Background drifting blobs animation
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;

  // Sync current mode tips
  useEffect(() => {
    setCurrentTip(currentMode.aiTips[0]);
  }, [currentMode]);

  // Animate breathing/glow when active
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    
    if (isActive) {
      if (currentMode.id === 'calm') {
        // Calm mode: slower 8-second breathing loop (4s expand, 4s shrink)
        const breatheLoop = () => {
          setBreathingPhase('inhale');
          Animated.timing(glowAnim, {
            toValue: 1.35,
            duration: 4000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }).start((result) => {
            if (result.finished) {
              setBreathingPhase('exhale');
              Animated.timing(glowAnim, {
                toValue: 0.95,
                duration: 4000,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.quad),
              }).start((res) => {
                if (res.finished) {
                  breatheLoop();
                }
              });
            }
          });
        };
        breatheLoop();
      } else {
        // Standard slow pulse
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1.25,
              duration: 4000,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.quad),
            }),
            Animated.timing(glowAnim, {
              toValue: 0.95,
              duration: 4000,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.quad),
            }),
          ])
        );
        animation.start();
      }
    } else {
      glowAnim.setValue(1.0);
    }

    return () => {
      if (animation) animation.stop();
      glowAnim.setValue(1.0);
    };
  }, [isActive, currentMode]);

  // Background drifting blobs animation
  useEffect(() => {
    const drift = (val: Animated.Value, dest: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: dest,
            duration: 15000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 15000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      );
    };

    const b1 = drift(blob1Y, 30);
    const b2 = drift(blob2Y, -30);

    b1.start();
    b2.start();

    return () => {
      b1.stop();
      b2.stop();
    };
  }, []);

  // Timer interval handling
  useEffect(() => {
    if (isActive) {
      timerInterval.current = setInterval(() => {
        if (currentMode.timerType === 'countdown') {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerInterval.current!);
              setIsActive(false);

              // Handle Pomodoro study-to-break transitions
              if (currentMode.id === 'study') {
                if (pomodoroCycle === 'study') {
                  setPomodoroCycle('break');
                  setTimeLeft(5 * 60); // 5 minute break
                  setTotalSessionTime(5 * 60);
                  setStudyRoundsCompleted((r) => r + 1);
                  setIsActive(true);
                  return 5 * 60;
                } else {
                  setPomodoroCycle('study');
                  setTimeLeft(25 * 60); // 25 minute study
                  setTotalSessionTime(25 * 60);
                  setIsActive(true);
                  return 25 * 60;
                }
              }

              setSessionCompleted(true);
              return 0;
            }
            return prev - 1;
          });
        } else {
          // Count up timer (Creative Mode)
          setElapsedTime((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    }

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isActive, currentMode, pomodoroCycle]);

  // Handle study rounds Pomodoro configuration
  useEffect(() => {
    if (currentMode.id === 'study' && !sessionCompleted) {
      // Quiet Study mode default is Pomodoro: 25 minutes
      setTimeLeft(25 * 60);
      setTotalSessionTime(25 * 60);
      setPomodoroCycle('study');
    } else if (currentMode.timerType === 'countdown') {
      setTimeLeft(initialDuration * 60);
      setTotalSessionTime(initialDuration * 60);
    }
  }, [currentMode]);

  const handlePauseToggle = () => {
    if (isActive) {
      setInterruptionCount((prev) => prev + 1);
    }
    setIsActive(!isActive);
  };

  const handleCompleteSession = () => {
    setIsActive(false);
    setSessionCompleted(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getFocusScoreText = (score: number) => {
    if (score >= 90) return 'Elite Focus';
    if (score >= 75) return 'Great Focus';
    if (score >= 50) return 'Moderate Focus';
    return 'Distracted';
  };

  // Timer Circle properties
  const radius = 95;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate dynamic progress
  const getProgress = () => {
    if (currentMode.timerType === 'countdown') {
      return timeLeft / totalSessionTime;
    } else {
      // Creative Mode has flexible timings, lets pulse progress or keep full
      return 1;
    }
  };
  const strokeDashoffset = circumference - getProgress() * circumference;

  // Determine current ambient background colors
  const getGradientColors = () => {
    if (isDarkMode) {
      switch (currentMode.bgStyle) {
        case 'peach': return ['#140d0a', '#1f130e'];
        case 'lavender': return ['#0f0d1a', '#171228'];
        case 'pink': return ['#130a11', '#1f0e1a'];
        case 'sage': return ['#0a0e0d', '#111b16'];
      }
    }
    return currentMode.gradientColors;
  };

  // Generate simulated EQ visualizer heights
  const [eqHeights, setEqHeights] = useState([12, 18, 14, 20, 16]);
  useEffect(() => {
    let eqInterval: any = null;
    if (activeSound.id !== 'none' && !sessionCompleted) {
      eqInterval = setInterval(() => {
        setEqHeights([
          Math.floor(6 + Math.random() * 18),
          Math.floor(10 + Math.random() * 20),
          Math.floor(8 + Math.random() * 16),
          Math.floor(12 + Math.random() * 22),
          Math.floor(6 + Math.random() * 18),
        ]);
      }, 150);
    } else {
      setEqHeights([3, 3, 3, 3, 3]);
    }
    return () => {
      if (eqInterval) clearInterval(eqInterval);
    };
  }, [activeSound, sessionCompleted]);

  // Derived metrics for completion screen
  const getSecondsElapsed = () => {
    if (currentMode.timerType === 'countdown') {
      return totalSessionTime - timeLeft;
    } else {
      return elapsedTime;
    }
  };
  const secondsElapsed = getSecondsElapsed();
  const focusTimeFormatted = formatTime(secondsElapsed);
  
  const focusPercentage = Math.round((secondsElapsed / (currentMode.timerType === 'countdown' ? totalSessionTime : secondsElapsed || 1)) * 100) || 100;
  const baseScore = Math.max(50, 100 - interruptionCount * 8);
  const finalFocusScore = Math.min(100, Math.round(baseScore * (focusPercentage / 100)));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: getGradientColors()[0] }]} edges={['top', 'bottom']}>
      {/* Background Animated blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[
          styles.blob,
          {
            backgroundColor: currentMode.primaryColor,
            opacity: isDarkMode ? 0.08 : 0.04,
            transform: [{ translateY: blob1Y }],
            top: '20%',
            left: '-10%',
            width: SCREEN_WIDTH * 0.7,
            height: SCREEN_WIDTH * 0.7,
          }
        ]} />
        <Animated.View style={[
          styles.blob,
          {
            backgroundColor: currentMode.secondaryColor,
            opacity: isDarkMode ? 0.06 : 0.03,
            transform: [{ translateY: blob2Y }],
            bottom: '25%',
            right: '-15%',
            width: SCREEN_WIDTH * 0.8,
            height: SCREEN_WIDTH * 0.8,
          }
        ]} />
      </View>

      {!sessionCompleted ? (
        // ──────────────────────────────────────────────────
        // SCREEN 1: IMMERSIVE FOCUS SCREEN
        // ──────────────────────────────────────────────────
        <View style={styles.contentWrapper}>
          
          {/* Strict Distraction Shield Overlay for Deep Work Mode when Paused */}
          {!isActive && currentMode.id === 'deep_work' && secondsElapsed > 0 && (
            <View style={[styles.distractionShield, { backgroundColor: isDarkMode ? 'rgba(10,10,15,0.96)' : 'rgba(255,255,255,0.96)' }]}>
              <View style={styles.shieldContent}>
                <View style={[styles.shieldIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                  <Feather name="shield" size={32} color="#ef4444" />
                </View>
                <Text style={[styles.shieldTitle, { color: theme.text }]}>Distraction Shield Active</Text>
                <Text style={[styles.shieldDesc, { color: theme.text2 }]}>
                  You paused your deep work flow. Multi-tasking or checking notification feeds lowers performance by 40%. Stay locked in!
                </Text>
                <TouchableOpacity
                  onPress={() => setIsActive(true)}
                  style={[styles.shieldResumeBtn, { backgroundColor: currentMode.primaryColor }]}
                >
                  <Text style={styles.shieldResumeText}>Resume Deep Work</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={20} color={theme.text} />
            </TouchableOpacity>

            {/* Mode Indicator */}
            <View style={[styles.dropdownButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name={(currentMode as any).icon as any} size={14} color={currentMode.primaryColor} style={{ marginRight: 4 }} />
              <Text style={[styles.dropdownText, { color: theme.text }]}>{currentMode.name}</Text>
            </View>

            {/* Audio Controls trigger */}
            <TouchableOpacity
              onPress={() => setSoundSheetVisible(true)}
              style={[styles.iconButton, {
                backgroundColor: activeSound.id !== 'none' ? `${currentMode.primaryColor}15` : theme.surface,
                borderColor: activeSound.id !== 'none' ? `${currentMode.primaryColor}30` : theme.border,
              }]}
              activeOpacity={0.7}
            >
              {activeSound.id !== 'none' ? (
                <View style={styles.eqContainer}>
                  {eqHeights.map((h, i) => (
                    <View
                      key={i}
                      style={[
                        styles.eqBar,
                        { height: h, backgroundColor: currentMode.primaryColor }
                      ]}
                    />
                  ))}
                </View>
              ) : (
                <Feather name="music" size={17} color={theme.text2} />
              )}
            </TouchableOpacity>
          </View>

          {/* Central Focus Element */}
          <ScrollView
            contentContainerStyle={styles.centerSection}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Task Info */}
            <View style={styles.taskInfoContainer}>
              <View style={[styles.categoryTag, { backgroundColor: `${currentMode.primaryColor}10` }]}>
                <Feather name="folder" size={12} color={currentMode.primaryColor} style={{ marginRight: 4 }} />
                <Text style={[styles.categoryText, { color: currentMode.primaryColor }]}>
                  {taskCategory}
                </Text>
              </View>
              <Text style={[styles.taskTitle, { color: theme.text }]}>{taskTitle}</Text>
              
              {currentMode.id === 'study' ? (
                <Text style={[styles.timeBlockText, { color: currentMode.primaryColor, fontWeight: '700' }]}>
                  Pomodoro Round: {pomodoroCycle === 'study' ? 'Study State (25m)' : 'Break State (5m)'}
                </Text>
              ) : (
                <Text style={[styles.timeBlockText, { color: theme.text3 }]}>
                  {currentMode.id === 'creative' ? 'Flexi-Timer Session' : `Session Focus Block • ${initialDuration} mins`}
                </Text>
              )}
            </View>

            {/* Immersive Circular Timer */}
            <View style={styles.timerOuterContainer}>
              {/* Outer pulsing ring */}
              <Animated.View style={[
                styles.timerGlow,
                {
                  transform: [{ scale: glowAnim }],
                  backgroundColor: currentMode.primaryColor,
                  opacity: isActive ? 0.05 : 0.0,
                }
              ]} />
              
              <View style={[styles.timerContainer, { backgroundColor: isDarkMode ? 'rgba(15,15,22,0.6)' : 'rgba(255,255,255,0.7)' }]}>
                {/* Breathing Guide text for Calm Mode */}
                {currentMode.id === 'calm' && isActive && (
                  <Text style={[styles.breathingText, { color: currentMode.primaryColor }]}>
                    {breathingPhase === 'inhale' ? 'Inhale...' : 'Exhale...'}
                  </Text>
                )}

                <Svg width="220" height="220" viewBox="0 0 220 220">
                  <Defs>
                    <SvgLinearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={currentMode.primaryColor} />
                      <Stop offset="100%" stopColor={currentMode.secondaryColor} />
                    </SvgLinearGradient>
                  </Defs>
                  
                  {/* Track circle */}
                  <Circle
                    cx="110"
                    cy="110"
                    r={radius}
                    stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  {/* Active progress circle */}
                  <Circle
                    cx="110"
                    cy="110"
                    r={radius}
                    stroke="url(#timerGrad)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 110 110)"
                  />
                </Svg>

                {/* Inside Text */}
                <View style={styles.timerTextContainer}>
                  <Text style={[styles.timerText, { color: theme.text, fontSize: currentMode.id === 'calm' ? 36 : 42 }]}>
                    {currentMode.timerType === 'countdown' ? formatTime(timeLeft) : formatTime(elapsedTime)}
                  </Text>
                  <Text style={[styles.timerLabel, { color: theme.text3 }]}>
                    {currentMode.id === 'study' ? `${pomodoroCycle.toUpperCase()} CYCLE` : (currentMode.timerType === 'countdown' ? 'Time Remaining' : 'Time Elapsed')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Action Controls */}
            <View style={styles.controlsRow}>
              {/* Secondary Options button */}
              <TouchableOpacity
                onPress={() => setControlsSheetVisible(true)}
                style={[styles.secondaryControlBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                activeOpacity={0.7}
              >
                <Feather name="more-horizontal" size={20} color={theme.text2} />
              </TouchableOpacity>

              {/* Pause/Play Button (Primary Focus Target) */}
              <TouchableOpacity
                onPress={handlePauseToggle}
                style={[styles.playPauseBtn, { backgroundColor: currentMode.primaryColor }]}
                activeOpacity={0.9}
              >
                <Feather name={isActive ? "pause" : "play"} size={22} color="#fff" />
              </TouchableOpacity>

              {/* Instant Complete Button */}
              <TouchableOpacity
                onPress={handleCompleteSession}
                style={[styles.secondaryControlBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                activeOpacity={0.7}
              >
                <Feather name="check" size={20} color={currentMode.primaryColor} />
              </TouchableOpacity>
            </View>

            {/* Creative Mode Floating Notebook */}
            {currentMode.id === 'creative' && (
              <View style={[styles.notesCard, {
                backgroundColor: isDarkMode ? 'rgba(25,25,35,0.4)' : 'rgba(255,255,255,0.6)',
                borderColor: theme.border,
              }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Feather name="edit-3" size={14} color={currentMode.primaryColor} />
                  <Text style={[styles.notesCardTitle, { color: theme.text }]}>Quick Ideation Scratchpad</Text>
                </View>
                <TextInput
                  multiline
                  placeholder="Jot down quick thoughts, tasks, or insights that pop up while you brainstorm..."
                  placeholderTextColor={theme.text3}
                  value={creativeNotes}
                  onChangeText={setCreativeNotes}
                  style={[styles.notesInput, { color: theme.text }]}
                />
              </View>
            )}

            {/* AI Focus Tip Card */}
            <View style={[styles.tipCard, {
              backgroundColor: isDarkMode ? 'rgba(25,25,35,0.4)' : 'rgba(255,255,255,0.6)',
              borderColor: theme.border,
            }]}>
              <View style={[styles.tipIconWrap, { backgroundColor: `${currentMode.primaryColor}15` }]}>
                <Text style={{ fontSize: 13, color: currentMode.primaryColor }}>✦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tipTitle, { color: theme.text }]}>{currentMode.name} AI Guide</Text>
                <Text style={[styles.tipText, { color: theme.text2 }]}>{currentTip}</Text>
              </View>
            </View>

            {/* Up Next Card */}
            <View style={styles.upNextContainer}>
              <Text style={[styles.upNextLabel, { color: theme.text3 }]}>Up Next</Text>
              <View style={[styles.upNextCard, {
                backgroundColor: isDarkMode ? 'rgba(25,25,35,0.4)' : 'rgba(255,255,255,0.6)',
                borderColor: theme.border,
              }]}>
                <View style={styles.upNextTimeWrap}>
                  <Text style={[styles.upNextTime, { color: theme.text }]}>12:30 PM</Text>
                  <Text style={[styles.upNextSub, { color: theme.text3 }]}>In 1.5 Hours</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.upNextTitle, { color: theme.text }]} numberOfLines={1}>Client Presentation & Sync</Text>
                  <Text style={[styles.upNextCategory, { color: theme.text3 }]}><Feather name="briefcase" size={12} color={theme.text3} /> Work</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        // ──────────────────────────────────────────────────
        // SCREEN 2: SESSION COMPLETE SCREEN
        // ──────────────────────────────────────────────────
        <View style={styles.completionContainer}>
          <ScrollView
            contentContainerStyle={styles.completionScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top Celebration Glow */}
            <View style={styles.celebrationGlow}>
              <View style={styles.checkmarkOuterRing}>
                <View style={[styles.checkmarkInnerRing, { backgroundColor: currentMode.primaryColor }]}>
                  <Feather name="check" size={40} color="#fff" />
                </View>
              </View>
            </View>

            {/* Celebration Headings */}
            <Text style={[styles.completeTitle, { color: theme.text }]}>Great Focus Session!</Text>
            <Text style={[styles.completeSubtitle, { color: theme.text2 }]}>
              You did some deep, focused work today. Take a moment to appreciate your effort.
            </Text>

            {/* Active Recall input block for Quiet Study Mode */}
            {currentMode.id === 'study' && (
              <View style={[styles.recallCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Feather name="book-open" size={16} color={currentMode.primaryColor} />
                  <Text style={[styles.recallCardTitle, { color: theme.text }]}>AI Recall Assistant</Text>
                </View>
                <Text style={[styles.recallCardSubtitle, { color: theme.text2 }]}>
                  What are 3 important things you learned during this session? Write them down to improve memory retention:
                </Text>
                <TextInput
                  placeholder="Key concept 1..."
                  placeholderTextColor={theme.text3}
                  value={recallAnswer1}
                  onChangeText={setRecallAnswer1}
                  style={[styles.recallInput, { color: theme.text, borderColor: theme.border }]}
                />
                <TextInput
                  placeholder="Key concept 2..."
                  placeholderTextColor={theme.text3}
                  value={recallAnswer2}
                  onChangeText={setRecallAnswer2}
                  style={[styles.recallInput, { color: theme.text, borderColor: theme.border }]}
                />
                <TextInput
                  placeholder="Key concept 3..."
                  placeholderTextColor={theme.text3}
                  value={recallAnswer3}
                  onChangeText={setRecallAnswer3}
                  style={[styles.recallInput, { color: theme.text, borderColor: theme.border }]}
                />
              </View>
            )}

            {/* Stats Block (Apple-style tiles) */}
            <View style={styles.statsGrid}>
              <View style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { color: theme.text3 }]}>Focus Time</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{focusTimeFormatted}</Text>
              </View>

              <View style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { color: theme.text3 }]}>Deep Work %</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{focusPercentage}%</Text>
              </View>

              <View style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { color: theme.text3 }]}>Interruptions</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{interruptionCount}</Text>
              </View>

              <View style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { color: theme.text3 }]}>Focus Score</Text>
                <Text style={[styles.statValue, { color: currentMode.primaryColor }]}>{finalFocusScore}</Text>
                <Text style={{ fontSize: 10, color: theme.text3, fontWeight: '700', marginTop: 2 }}>
                  {getFocusScoreText(finalFocusScore)}
                </Text>
              </View>
            </View>

            {/* Reflection card */}
            <View style={[styles.reflectionCard, { backgroundColor: isDarkMode ? '#171424' : '#f5f3ff', borderColor: isDarkMode ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)' }]}>
              <Feather name="star" size={20} color={isDarkMode ? '#a78bfa' : '#8b5cf6'} style={{ marginBottom: 6 }} />
              <Text style={[styles.reflectionText, { color: theme.text }]}>
                {currentMode.id === 'calm'
                  ? '“Small progress is still progress. You showed up, and that is what matters.”'
                  : '“Your cognitive stamina is building up. Rest, recover, and prepare for your next block.”'}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.completeActionsContainer}>
              <TouchableOpacity
                onPress={() => setInsightsModalVisible(true)}
                style={[styles.primaryCompleteBtn, { backgroundColor: theme.orange }]}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryCompleteText}>View Insights Summary</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.replace('/(tabs)/dashboard')}
                style={[styles.secondaryCompleteBtn, { borderColor: theme.border }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryCompleteText, { color: theme.text2 }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* ──────────────────────────────────────────────────
          BOTTOM SHEET A: AMBIENT SOUND SHEET
          ────────────────────────────────────────────────── */}
      <Modal
        visible={soundSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSoundSheetVisible(false)}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity
            style={styles.sheetBackdropTarget}
            activeOpacity={1}
            onPress={() => setSoundSheetVisible(false)}
          />
          <View style={[styles.bottomSheetContainer, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Ambient Sound</Text>
              <TouchableOpacity
                onPress={() => setSoundSheetVisible(false)}
                style={[styles.sheetCloseBtn, { backgroundColor: theme.surface }]}
              >
                <Feather name="x" size={16} color={theme.text2} />
              </TouchableOpacity>
            </View>

            <View style={styles.soundGrid}>
              {AMBIENT_SOUNDS.map((sound) => {
                const isSelected = activeSound.id === sound.id;
                return (
                  <TouchableOpacity
                    key={sound.id}
                    onPress={() => setActiveSound(sound)}
                    style={[
                      styles.soundTile,
                      {
                        backgroundColor: isSelected ? `${currentMode.primaryColor}10` : theme.surface,
                        borderColor: isSelected ? currentMode.primaryColor : theme.border,
                      }
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={{ marginBottom: 12 }}>
                      <Feather name={(sound as any).icon as any} size={24} color={isSelected ? currentMode.primaryColor : theme.text2} />
                    </View>
                    <Text style={[styles.soundName, { color: theme.text }]}>{sound.name}</Text>
                    <Text style={[styles.soundDesc, { color: theme.text3 }]} numberOfLines={1}>{sound.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {activeSound.id !== 'none' && (
              <View style={styles.volumeControlsContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text3 }}>Volume</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>{volume}%</Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Feather name="volume-1" size={16} color={theme.text3} />
                  <View style={styles.sliderTrackContainer}>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={(e) => {
                        const ratio = e.nativeEvent.locationX / (SCREEN_WIDTH - 80);
                        setVolume(Math.min(100, Math.max(0, Math.round(ratio * 100))));
                      }}
                      style={[styles.sliderTrack, { backgroundColor: theme.border }]}
                    >
                      <View style={[styles.sliderFill, { width: `${volume}%`, backgroundColor: currentMode.primaryColor }]} />
                      <View style={[styles.sliderThumb, { left: `${volume}%`, backgroundColor: currentMode.primaryColor }]} />
                    </TouchableOpacity>
                  </View>
                  <Feather name="volume-2" size={16} color={theme.text3} />
                </View>
              </View>
            )}

            {activeSound.id !== 'none' && (
              <View style={styles.visualizationBarContainer}>
                <Text style={{ fontSize: 12, color: theme.text3, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
                  Playing {activeSound.name} ambient loop
                </Text>
                <View style={{ flexDirection: 'row', gap: 4, height: 26, justifyContent: 'center', alignItems: 'flex-end' }}>
                  {eqHeights.concat(eqHeights).map((h, i) => (
                    <View
                      key={i}
                      style={{
                        width: 3,
                        height: h,
                        borderRadius: 1.5,
                        backgroundColor: currentMode.primaryColor,
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ──────────────────────────────────────────────────
          BOTTOM SHEET C: SESSION CONTROLS SHEET
          ────────────────────────────────────────────────── */}
      <Modal
        visible={controlsSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setControlsSheetVisible(false)}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity
            style={styles.sheetBackdropTarget}
            activeOpacity={1}
            onPress={() => setControlsSheetVisible(false)}
          />
          <View style={[styles.bottomSheetContainer, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Session Controls</Text>
              <TouchableOpacity
                onPress={() => setControlsSheetVisible(false)}
                style={[styles.sheetCloseBtn, { backgroundColor: theme.surface }]}
              >
                <Feather name="x" size={16} color={theme.text2} />
              </TouchableOpacity>
            </View>

            <View style={styles.controlsList}>
              <TouchableOpacity
                onPress={() => {
                  setTimeLeft((prev) => prev + 15 * 60);
                  setTotalSessionTime((prev) => prev + 15 * 60);
                  setControlsSheetVisible(false);
                }}
                style={[styles.controlListItem, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.controlListIconWrap, { backgroundColor: `${currentMode.primaryColor}15` }]}>
                  <Feather name="clock" size={16} color={currentMode.primaryColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.controlListItemTitle, { color: theme.text }]}>Extend session</Text>
                  <Text style={[styles.controlListItemSub, { color: theme.text3 }]}>Add 15 minutes to active timer</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: currentMode.primaryColor }}>+15 min</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setTimeLeft(5 * 60);
                  setTotalSessionTime(5 * 60);
                  setPomodoroCycle('break');
                  setIsActive(true);
                  setControlsSheetVisible(false);
                }}
                style={[styles.controlListItem, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.controlListIconWrap, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                  <Feather name="coffee" size={16} color="#22c55e" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.controlListItemTitle, { color: theme.text }]}>Short Break</Text>
                  <Text style={[styles.controlListItemSub, { color: theme.text3 }]}>Take a quick 5-minute break</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#22c55e' }}>5 min</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setTimeLeft(15 * 60);
                  setTotalSessionTime(15 * 60);
                  setPomodoroCycle('break');
                  setIsActive(true);
                  setControlsSheetVisible(false);
                }}
                style={[styles.controlListItem, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.controlListIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                  <Feather name="clock" size={16} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.controlListItemTitle, { color: theme.text }]}>Long Break</Text>
                  <Text style={[styles.controlListItemSub, { color: theme.text3 }]}>Take a longer 15-minute break</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#8b5cf6' }}>15 min</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setControlsSheetVisible(false);
                  handleCompleteSession();
                }}
                style={styles.controlListItem}
                activeOpacity={0.7}
              >
                <View style={[styles.controlListIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                  <Feather name="x-circle" size={16} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.controlListItemTitle, { color: '#ef4444' }]}>End Session</Text>
                  <Text style={[styles.controlListItemSub, { color: theme.text3 }]}>Stop and save active progress</Text>
                </View>
                <Feather name="chevron-right" size={14} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ──────────────────────────────────────────────────
          MODAL D: POST-SESSION AI INSIGHTS DETAIL
          ────────────────────────────────────────────────── */}
      <Modal
        visible={insightsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setInsightsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Text style={{ fontSize: 16 }}>✦</Text>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Your AI Focus Insights</Text>
              </View>
              <TouchableOpacity
                onPress={() => setInsightsModalVisible(false)}
                style={[styles.sheetCloseBtn, { backgroundColor: theme.surface }]}
              >
                <Feather name="x" size={15} color={theme.text2} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Conditional outputs for Study Mode recall results */}
              {currentMode.id === 'study' && (recallAnswer1 || recallAnswer2 || recallAnswer3) && (
                <View style={[styles.insightRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <View style={[styles.insightIconWrap, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                    <Feather name="bookmark" size={16} color="#3b82f6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitleText, { color: theme.text }]}>Active Recall Summary</Text>
                    {recallAnswer1 ? <Text style={[styles.insightDescText, { color: theme.text2, marginBottom: 2 }]}>• {recallAnswer1}</Text> : null}
                    {recallAnswer2 ? <Text style={[styles.insightDescText, { color: theme.text2, marginBottom: 2 }]}>• {recallAnswer2}</Text> : null}
                    {recallAnswer3 ? <Text style={[styles.insightDescText, { color: theme.text2, marginBottom: 2 }]}>• {recallAnswer3}</Text> : null}
                  </View>
                </View>
              )}

              {/* Conditional output for Creative Mode notes */}
              {currentMode.id === 'creative' && creativeNotes && (
                <View style={[styles.insightRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <View style={[styles.insightIconWrap, { backgroundColor: 'rgba(236,72,153,0.12)' }]}>
                    <Feather name="edit-2" size={16} color="#ec4899" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitleText, { color: theme.text }]}>Brainstorming Scratchpad Notes</Text>
                    <Text style={[styles.insightDescText, { color: theme.text2, fontStyle: 'italic' }]}>"{creativeNotes}"</Text>
                  </View>
                </View>
              )}

              <View style={[styles.insightRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <View style={[styles.insightIconWrap, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                  <Feather name="trending-up" size={16} color="#22c55e" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightTitleText, { color: theme.text }]}>Focus Intensity Peak</Text>
                  <Text style={[styles.insightDescText, { color: theme.text2 }]}>
                    Your deep work consistency was 16% higher than your average session. You stayed locked in for the first 30 minutes!
                  </Text>
                </View>
              </View>

              <View style={[styles.insightRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <View style={[styles.insightIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                  <Feather name="clock" size={16} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightTitleText, { color: theme.text }]}>Best Focus Time: {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}</Text>
                  <Text style={[styles.insightDescText, { color: theme.text2 }]}>
                    This matches your productivity peaks! You generate your best creative work between 9:00 AM and 12:00 PM.
                  </Text>
                </View>
              </View>

              <View style={[styles.insightRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <View style={[styles.insightIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                  <Feather name="alert-triangle" size={16} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightTitleText, { color: theme.text }]}>Distraction Logged</Text>
                  <Text style={[styles.insightDescText, { color: theme.text2 }]}>
                    We registered {interruptionCount} pause event(s) during this session. Logging out of social apps beforehand is recommended next time!
                  </Text>
                </View>
              </View>

              <View style={styles.insightRow}>
                <View style={[styles.insightIconWrap, { backgroundColor: 'rgba(236,72,153,0.12)' }]}>
                  <Feather name="award" size={16} color="#ec4899" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightTitleText, { color: theme.text }]}>Focus Streak Active!</Text>
                  <Text style={[styles.insightDescText, { color: theme.text2 }]}>
                    This is your 5th consecutive focus session this week. Keep it up to build strong daily routines!
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setInsightsModalVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: currentMode.primaryColor }]}
              activeOpacity={0.9}
            >
              <Text style={styles.modalCloseBtnText}>Acknowledge Insights</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  distractionShield: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  shieldContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  shieldIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  shieldTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  shieldDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },
  shieldResumeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  shieldResumeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 13,
    fontWeight: '700',
  },
  eqContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 18,
    gap: 2,
    width: 18,
  },
  eqBar: {
    width: 2,
    borderRadius: 1,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  taskInfoContainer: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 10,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  timeBlockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timerOuterContainer: {
    position: 'relative',
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  timerGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
  },
  timerContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  breathingText: {
    position: 'absolute',
    top: 36,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  timerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 32,
  },
  playPauseBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  secondaryControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    marginBottom: 24,
  },
  notesCardTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  notesInput: {
    fontSize: 12,
    lineHeight: 18,
    minHeight: 60,
    textAlignVertical: 'top',
    padding: 0,
    marginTop: 4,
  },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 17,
  },
  upNextContainer: {
    width: '100%',
  },
  upNextLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  upNextCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  upNextTimeWrap: {
    alignItems: 'flex-start',
    width: 90,
  },
  upNextTime: {
    fontSize: 14,
    fontWeight: '700',
  },
  upNextSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: 16,
  },
  upNextTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  upNextCategory: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Completion Screen Styling
  completionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  completionScroll: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  celebrationGlow: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkmarkOuterRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34,197,94,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.12)',
  },
  checkmarkInnerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  completeTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  completeSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  recallCard: {
    width: '100%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  recallCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  recallCardSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  recallInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 12,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    marginBottom: 28,
  },
  statTile: {
    flex: 1,
    minWidth: '45%',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  reflectionCard: {
    width: '100%',
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 36,
  },
  reflectionText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  completeActionsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryCompleteBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  primaryCompleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryCompleteBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCompleteText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Bottom Sheets Core Styling
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetBackdropTarget: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom Sheet A Specifics
  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  soundTile: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  soundEmoji: {
    fontSize: 18,
    marginBottom: 6,
  },
  soundName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  soundDesc: {
    fontSize: 10,
    fontWeight: '600',
  },
  volumeControlsContainer: {
    width: '100%',
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  sliderTrackContainer: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  sliderThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    top: -5,
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  visualizationBarContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },

  // Bottom Sheet B Specifics
  modeList: {
    gap: 10,
  },
  modeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  modeListIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeListName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  modeListTagline: {
    fontSize: 11,
    fontWeight: '600',
  },
  selectedCheckWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom Sheet C Specifics
  controlsList: {
    gap: 6,
  },
  controlListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  controlListIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlListItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  controlListItemSub: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Modal D Specifics
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    paddingBottom: 14,
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalContent: {
    gap: 16,
  },
  insightRow: {
    flexDirection: 'row',
    gap: 14,
    paddingBottom: 16,
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitleText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightDescText: {
    fontSize: 12,
    lineHeight: 18,
  },
  modalCloseBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalCloseBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

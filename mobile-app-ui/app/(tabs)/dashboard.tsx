import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { DashboardSkeleton, FadeInView, appState } from '../../components/PremiumLoader';
import SplashAnimation from '../../components/SplashAnimation';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import api from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function DashboardScreen() {
  const { theme, isDarkMode } = useTheme();
  const isDark = isDarkMode;
  const isLight = !isDark;

  const [stats, setStats] = useState<any>(null);
  const [plannerSections, setPlannerSections] = useState<{ today: any[]; upcoming: any[]; completed: any[] }>({
    today: [], upcoming: [], completed: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [splashDone, setSplashDone] = useState(!appState.justLoggedIn);
  const { user } = useAuth();
  const [aiSuggestionDismissed, setAiSuggestionDismissed] = useState(false);
  const router = useRouter();

  // Search state (migrated from DashboardHeader)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ routines: any[]; tasks: any[] }>({ routines: [], tasks: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Notifications state (migrated from DashboardHeader)
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      // Don't setLoading(true) here, so tab switches instantly show stale data while background refreshing
      fetchData();
      fetchNotifications();
    }, [])
  );

  // Debounced search (migrated from DashboardHeader)
  useEffect(() => {
    if (searchQuery.length === 0) {
      setSearchResults({ routines: [], tasks: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res);
      } catch {
        setSearchResults({ routines: [], tasks: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchNotifications = async () => {
    // Fake notifications logic removed to prevent annoying unread badges on every refresh
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchData = async () => {
    try {
      const [statsData, plannerData] = await Promise.all([
        api.get('/dashboard/stats?weeks=1'),
        api.get('/routines/planner'),
      ]);
      setStats(statsData);
      setPlannerSections({
        today: plannerData.today || [],
        upcoming: plannerData.upcoming || [],
        completed: plannerData.completed || [],
      });
    } catch (err: any) {
      if (err.status === 401) {
        router.replace('/(auth)/login');
      } else {
        Alert.alert("Network Error", "Failed to fetch dashboard data.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const toggleRoutine = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      await api.put(`/routines/${id}`, { status: newStatus });
      // Re-fetch both stats and planner so metrics stay accurate
      const [statsData, plannerData] = await Promise.all([
        api.get('/dashboard/stats?weeks=1'),
        api.get('/routines/planner'),
      ]);
      setStats(statsData);
      setPlannerSections({
        today: plannerData.today || [],
        upcoming: plannerData.upcoming || [],
        completed: plannerData.completed || [],
      });
    } catch (error) {
      Alert.alert("Network Error", "Failed to fetch planner sections.");
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
  const firstName = displayName.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 16 ? 'Good afternoon' : 'Good evening';
  const contextHint = hour < 12
    ? { icon: 'sun', text: 'Focus peaks in the morning — tackle your hardest task first!', accent: theme.orange }
    : hour < 16
      ? { icon: 'zap', text: 'Protect your deep work time — stay in the zone!', accent: theme.orange }
      : { icon: 'moon', text: 'Wind down and plan tomorrow — you earned it!', accent: theme.purple };

  // ── Metric derivations (all date-scoped from new API fields) ────────────────
  const productivity = stats?.productivity_score ?? 0;

  // Today's metrics
  const todayTotal = stats?.today_total ?? 0;
  const todayCompleted = stats?.today_completed ?? 0;
  const todayPending = stats?.today_pending ?? 0;

  // This week's metrics (Productivity card)
  const weekTotal = stats?.week_total ?? 0;
  const weekCompleted = stats?.week_completed ?? 0;
  const weekPending = stats?.week_pending ?? 0;

  // Legacy aliases still used in Productivity card stat rows
  const totalRoutines = weekTotal;
  const completedRoutines = weekCompleted;
  const pendingRoutines = weekPending;

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Focus routine = first pending task from TODAY only (from planner API)
  const todayRoutines = plannerSections.today;
  const focusRoutine = todayRoutines.find((r: any) => r.status === 'Pending') ?? null;

  // Up Next = remaining pending today tasks (excluding the focus one), limited to 4
  const upNextRoutines = todayRoutines
    .filter((r: any) => r.status === 'Pending' && (focusRoutine ? r.id !== focusRoutine.id : true))
    .slice(0, 4);

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'work': return 'briefcase';
      case 'health': return 'activity';
      case 'study': return 'book';
      case 'personal': return 'user';
      case 'chores': return 'check-square';
      default: return 'bookmark';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'work': return theme.blue;
      case 'health': return theme.green;
      case 'study': return theme.purple;
      case 'personal': return theme.pink;
      case 'chores': return theme.amber;
      default: return theme.text3;
    }
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return <DashboardSkeleton />;
    }

    return (
      <FadeInView>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.orange} colors={[theme.orange]} />
        }
      >

        {/* ─── Header: Greeting + Search + Notifications ─── */}
        <View style={{ paddingTop: 4, gap: 14, marginBottom: 16 }}>
          {/* Top Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.5 }}>
                {greeting},
              </Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: theme.orange, letterSpacing: -0.5, marginTop: -2 }}>
                {firstName}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text3, marginTop: 4, fontWeight: '500' }}>
                {dateStr}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Search Toggle */}
              <TouchableOpacity
                onPress={() => { setSearchOpen(!searchOpen); setNotificationsOpen(false); }}
                activeOpacity={0.7}
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: searchOpen ? theme.orangeLight : theme.surface,
                  borderWidth: 1, borderColor: searchOpen ? theme.orange : theme.border,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Feather name="search" size={17} color={searchOpen ? theme.orange : theme.text2} />
              </TouchableOpacity>

            </View>
          </View>

          {/* Search Bar (expandable) */}
          {searchOpen && (
            <View style={{ position: 'relative', zIndex: 90 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: 12, paddingHorizontal: 12,
              }}>
                <Feather name="search" size={15} color={theme.text3} />
                <TextInput
                  placeholder="Search routines, tasks..."
                  placeholderTextColor={theme.text3}
                  value={searchQuery}
                  onChangeText={(text) => setSearchQuery(text)}
                  autoFocus
                  style={{
                    flex: 1, paddingVertical: 10, paddingLeft: 10,
                    color: theme.text, fontSize: 14,
                  }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Feather name="x" size={15} color={theme.text3} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Results Dropdown */}
              {searchQuery.length > 0 && (
                <View style={{
                  position: 'absolute', top: 48, left: 0, right: 0,
                  backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border,
                  borderRadius: 14, padding: 6, zIndex: 100,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.25, shadowRadius: 40,
                  maxHeight: 240,
                }}>
                  {searchLoading ? (
                    <Text style={{ padding: 16, textAlign: 'center', color: theme.text3, fontSize: 13 }}>Searching...</Text>
                  ) : searchResults.routines.length === 0 && searchResults.tasks.length === 0 ? (
                    <Text style={{ padding: 16, textAlign: 'center', color: theme.text3, fontSize: 13 }}>No results found</Text>
                  ) : (
                    <>
                      {searchResults.routines.length > 0 && (
                        <>
                          <Text style={{ paddingHorizontal: 10, paddingVertical: 6, fontSize: 10, fontWeight: '700', color: theme.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Routines</Text>
                          {searchResults.routines.map((r: any) => (
                            <TouchableOpacity
                              key={`r-${r.id}`}
                              onPress={() => { setSearchOpen(false); setSearchQuery(''); router.push('/(tabs)/routines'); }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 }}
                            >
                              <Feather name={r.status === 'Completed' ? 'check-circle' : 'calendar'} size={14} color={r.status === 'Completed' ? theme.green : theme.text3} />
                              <Text style={{ flex: 1, fontSize: 13, color: theme.text }} numberOfLines={1}>{r.title}</Text>
                              <Text style={{ fontSize: 11, color: theme.text3 }}>{r.date}</Text>
                            </TouchableOpacity>
                          ))}
                        </>
                      )}
                      {searchResults.tasks.length > 0 && (
                        <>
                          <Text style={{ paddingHorizontal: 10, paddingVertical: 6, fontSize: 10, fontWeight: '700', color: theme.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: searchResults.routines.length > 0 ? 4 : 0 }}>Tasks</Text>
                          {searchResults.tasks.map((t: any) => (
                            <TouchableOpacity
                              key={`t-${t.id}`}
                              onPress={() => { setSearchOpen(false); setSearchQuery(''); }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 }}
                            >
                              <Feather name="check" size={14} color={theme.text3} />
                              <Text style={{ flex: 1, fontSize: 13, color: theme.text }} numberOfLines={1}>{t.title}</Text>
                            </TouchableOpacity>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* ─── Today's Focus Card ─── */}
        <View style={{
          borderRadius: 20, overflow: 'hidden',
          backgroundColor: isDarkMode ? '#1a1028' : '#fff7ed',
          borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,107,53,0.15)' : 'rgba(255,107,53,0.12)',
          shadowColor: theme.orange, shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12, shadowRadius: 20,
        }}>
          {/* Gradient accent bar */}
          <View style={{
            height: 4,
            backgroundColor: theme.orange,
          }} />
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <View style={{
                width: 24, height: 24, borderRadius: 7,
                backgroundColor: `${theme.orange}20`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Feather name="target" size={12} color={theme.orange} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.orange, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Today's Focus
              </Text>
            </View>

            {focusRoutine ? (
              <>
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3, marginBottom: 6 }}>
                  {focusRoutine.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  {focusRoutine.start_time && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="clock" size={12} color={theme.text3} />
                      <Text style={{ fontSize: 12, color: theme.text2, fontWeight: '500' }}>
                        {focusRoutine.start_time}{focusRoutine.end_time ? ` – ${focusRoutine.end_time}` : ''}
                      </Text>
                    </View>
                  )}
                  {focusRoutine.category && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                      backgroundColor: `${getCategoryColor(focusRoutine.category)}15`,
                    }}>
                      <Feather name={getCategoryIcon(focusRoutine.category) as any} size={12} color={getCategoryColor(focusRoutine.category)} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: getCategoryColor(focusRoutine.category) }}>
                        {focusRoutine.category}
                      </Text>
                    </View>
                  )}
                </View>
                {focusRoutine?.focus_mode_recommended ? (
                  <View>
                    <TouchableOpacity
                      onPress={() => router.push({
                        pathname: '/focus-mode',
                        params: {
                          routineId: focusRoutine?.id,
                          title: focusRoutine?.title,
                          category: focusRoutine?.category,
                          estimatedTime: focusRoutine?.estimated_time || 45,
                        }
                      })}
                      activeOpacity={0.8}
                      style={{
                        alignSelf: 'flex-start',
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12,
                        backgroundColor: theme.orange,
                        shadowColor: theme.orange, shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3, shadowRadius: 10,
                      }}
                    >
                      <Feather name="play" size={13} color="#fff" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Start Focus</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <TouchableOpacity
                      onPress={() => toggleRoutine(focusRoutine?.id, focusRoutine?.status)}
                      activeOpacity={0.8}
                      style={{
                        alignSelf: 'flex-start',
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12,
                        backgroundColor: theme.green,
                        shadowColor: theme.green, shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3, shadowRadius: 10,
                      }}
                    >
                      <Feather name="check" size={13} color="#fff" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Mark Complete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Feather name="award" size={32} color={theme.orange} style={{ marginBottom: 6 }} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 2 }}>All clear!</Text>
                <Text style={{ fontSize: 12, color: theme.text3 }}>No pending routines for today.</Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── Up Next Section ─── */}
        {upNextRoutines.length > 0 && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Up Next</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/routines')}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.orange }}>View all →</Text>
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border,
              borderRadius: 16, overflow: 'hidden',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDarkMode ? 0.2 : 0.05, shadowRadius: 12,
            }}>
              {upNextRoutines.map((r, i) => (
                <Pressable
                  key={r.id ?? i}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 14, paddingHorizontal: 16, gap: 12,
                    backgroundColor: pressed ? theme.surface : 'transparent',
                    borderBottomWidth: i < upNextRoutines.length - 1 ? 1 : 0,
                    borderBottomColor: theme.border,
                  })}
                  onPress={() => toggleRoutine(r.id, r.status)}
                >
                  {/* Category icon */}
                  <View style={{
                    width: 38, height: 38, borderRadius: 11,
                    backgroundColor: `${getCategoryColor(r.category)}12`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Feather name={getCategoryIcon(r.category) as any} size={20} color={getCategoryColor(r.category)} />
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{
                      fontSize: 14, fontWeight: '600', color: theme.text,
                    }} numberOfLines={1}>{r.title}</Text>
                    <Text style={{ fontSize: 11, color: theme.text3, marginTop: 2 }}>
                      {r.start_time ? `${r.start_time}${r.end_time ? ` – ${r.end_time}` : ''}` : r.date}
                    </Text>
                  </View>

                  {/* Category tag + Priority */}
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {r.category && (
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
                        backgroundColor: `${getCategoryColor(r.category)}12`,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: getCategoryColor(r.category) }}>
                          {r.category}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ─── Productivity Score ─── */}
        <View style={{
          backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border,
          borderRadius: 16, padding: 20,
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.2 : 0.05, shadowRadius: 12,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Productivity</Text>
            <View style={{
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
              backgroundColor: theme.orangeLight,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.orange }}>This Week</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            {/* Ring */}
            <View style={{ position: 'relative', width: 80, height: 80 }}>
              <Svg width="80" height="80" viewBox="0 0 80 80">
                <Circle cx="40" cy="40" r="32" fill="none" stroke={theme.border} strokeWidth="6" />
                <Circle
                  cx="40" cy="40" r="32" fill="none" stroke={theme.orange} strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - productivity / 100)}`}
                  transform="rotate(-90 40 40)"
                />
              </Svg>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text }}>{productivity}%</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={{ flex: 1, gap: 8 }}>
              {/* Today sub-header inside Productivity card */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.text3 }}>{todayCompleted}/{todayTotal}</Text>
              </View>
              {[
                { label: 'Done this week', value: weekCompleted, icon: 'check-circle', color: theme.green },
                { label: 'Pending this week', value: weekPending, icon: 'clock', color: theme.amber },
                { label: 'Total this week', value: weekTotal, icon: 'layers', color: theme.blue },
              ].map(s => (
                <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 8,
                    backgroundColor: `${s.color}12`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Feather name={s.icon as any} size={13} color={s.color} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{s.value}</Text>
                  <Text style={{ fontSize: 12, color: theme.text3 }}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ─── AI Suggestion Card ─── */}
        {!aiSuggestionDismissed && (
          <View style={{
            backgroundColor: isDarkMode ? '#0f1428' : '#f0f4ff',
            borderWidth: 1, borderColor: isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.12)',
            borderRadius: 16, padding: 18,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: `${theme.blue}15`,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14 }}>✦</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.blue }}>AI Suggestion</Text>
              </View>
              <TouchableOpacity onPress={() => setAiSuggestionDismissed(true)} style={{ padding: 4 }}>
                <Feather name="x" size={14} color={theme.text3} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 14 }}>
              <Feather name={contextHint.icon as any} size={14} color={theme.text2} style={{ marginTop: 2 }} />
              <Text style={{ fontSize: 13, color: theme.text2, lineHeight: 20, flex: 1 }}>
                {contextHint.text}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/ai-planner')}
              activeOpacity={0.8}
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
                backgroundColor: `${theme.blue}15`,
                borderWidth: 1, borderColor: `${theme.blue}25`,
              }}
            >
              <Feather name="zap" size={13} color={theme.blue} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.blue }}>Optimize My Day</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions removed - now accessible via Radial Menu */}
      </ScrollView>
      </SafeAreaView>
    </FadeInView>
    );
  };

  return (
    <>
      {renderContent()}
      {!splashDone && (
        <SplashAnimation onFinished={() => {
          setSplashDone(true);
          appState.justLoggedIn = false;
        }} />
      )}
    </>
  );
}

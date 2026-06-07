import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { AnalyticsSkeleton, FadeInView } from '../../components/PremiumLoader';
import Svg, { Circle } from 'react-native-svg';
import api from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';

export default function AnalyticsScreen() {
  const { theme, themeMode } = useTheme();
  const padH = 16;

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const statsData = await api.get('/dashboard/stats?weeks=3');
      setStats(statsData);
    } catch (err: any) {
      if (err.status === 401) {
        router.replace('/(auth)/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const productivity = stats?.productivity_score ?? 0;
  const weekly = stats?.weekly_overview ?? [];

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks: { label: string; bars: { date: string; count: number }[] }[] = [];
  for (let i = 0; i < weekly.length; i += 7) {
    const chunk = weekly.slice(i, i + 7);
    if (chunk.length > 0) {
      const startDate = new Date(chunk[0].date);
      const endDate = new Date(chunk[chunk.length - 1].date);
      const today = new Date();
      const startOfCurrentWeek = new Date(today);
      startOfCurrentWeek.setDate(today.getDate() - today.getDay() + 1);
      const isCurrentWeek = startDate.toISOString().slice(0, 10) === startOfCurrentWeek.toISOString().slice(0, 10);
      const label = isCurrentWeek
        ? 'This Week'
        : `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      weeks.push({ label, bars: chunk });
    }
  }
  const allCounts = weekly.map((d: any) => d.count ?? 0);
  const barMax = Math.max(...allCounts, 1);
  const isLight = themeMode === 'light';

  if (loading && !refreshing) {
    return <AnalyticsSkeleton />;
  }

  return (
    <FadeInView>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: padH, paddingBottom: 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.orange} colors={[theme.orange]} />
        }
      >
        {/* Title Header */}
        <View style={{ paddingTop: 8, paddingBottom: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
            Performance Metrics
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, letterSpacing: -0.4 }}>
            Analytics Overview
          </Text>
        </View>

        {/* Weekly Overview Card */}
        <View style={{
          backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border,
          borderRadius: 16, padding: 16, overflow: 'hidden',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isLight ? 0.05 : 0.2, shadowRadius: 12,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Weekly Overview</Text>
              <Text style={{ fontSize: 12, color: theme.text3, marginTop: 2 }}>Swipe right for past weeks</Text>
            </View>
            <View style={{
              paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99,
              backgroundColor: theme.orangeLight, borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.orange }}>{weeks.length} week{weeks.length > 1 ? 's' : ''}</Text>
            </View>
          </View>

          {/* Scrollable weeks */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={240 + 24}
            decelerationRate="fast"
            contentContainerStyle={{ gap: 24, paddingBottom: 8 }}
            contentOffset={{ x: Math.max(0, (weeks.length - 1) * (240 + 24)), y: 0 }}
          >
            {weeks.map((week, wi) => (
              <View key={wi} style={{ width: 240 }}>
                <View style={{
                  alignSelf: 'center', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 6,
                  marginBottom: 8, width: '100%',
                  backgroundColor: week.label === 'This Week' ? theme.orangeLight : 'transparent',
                }}>
                  <Text style={{
                    fontSize: 11.5, fontWeight: '700', textAlign: 'center',
                    color: week.label === 'This Week' ? theme.orange : theme.text3,
                  }}>{week.label}</Text>
                </View>

                {/* Bar chart */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 }}>
                  {week.bars.map((bar, bi) => (
                    <View key={bi} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {bar.count > 0 && (
                        <Text style={{ fontSize: 9.6, fontWeight: '700', color: theme.text2, marginBottom: 4 }}>{bar.count}</Text>
                      )}
                      <View style={{
                        width: '100%',
                        height: `${Math.max((bar.count / barMax) * 100, 4)}%`,
                        borderTopLeftRadius: 5, borderTopRightRadius: 5,
                        backgroundColor: week.label === 'This Week' ? theme.orange : theme.text3,
                        opacity: bar.count === 0 ? 0.2 : 1,
                      }} />
                    </View>
                  ))}
                </View>

                {/* Day labels */}
                <View style={{ flexDirection: 'row', marginTop: 6, gap: 4 }}>
                  {dayLabels.map(d => (
                    <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 9.6, color: theme.text3, fontWeight: '600' }}>{d}</Text>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Productivity Ring */}
          <View style={{
            marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.border,
            flexDirection: 'row', alignItems: 'center', gap: 16,
          }}>
            <View style={{ position: 'relative', width: 60, height: 60 }}>
              <Svg width="60" height="60" viewBox="0 0 60 60">
                <Circle cx="30" cy="30" r="24" fill="none" stroke={theme.border} strokeWidth="5" />
                <Circle
                  cx="30" cy="30" r="24" fill="none" stroke={theme.orange} strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - productivity / 100)}`}
                  transform="rotate(-90 30 30)"
                />
              </Svg>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>{productivity}%</Text>
              </View>
            </View>
            <View>
              <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14.4 }}>Productivity Score</Text>
              <Text style={{ color: theme.text3, fontSize: 12.5, marginTop: 2 }}>
                {productivity >= 70 ? "You're on fire! 🔥" : productivity >= 40 ? 'Keep going! 💪' : 'Build the habit! 🌱'}
              </Text>
            </View>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>
    </FadeInView>
  );
}

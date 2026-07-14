import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import api from '../../lib/api';

interface Routine {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  date: string;
  category: string;
  actual_duration?: number;
  energy_score?: number;
}

export default function HistoryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
  const [tasks, setTasks] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  const LIMIT = 20;

  const fetchHistory = async (newOffset = 0, isRefresh = false) => {
    try {
      const data = await api.get(`/routines/history?limit=${LIMIT}&offset=${newOffset}`);
      if (data.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      if (isRefresh) {
        setTasks(data);
      } else {
        setTasks(prev => [...prev, ...data]);
      }
      setOffset(newOffset + LIMIT);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory(0, true);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory(0, true);
  }, []);

  const onLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    fetchHistory(offset);
  };

  const handleDeleteDay = (dateStr: string, formattedDate: string) => {
    Alert.alert(
      "Delete Day's History",
      `Are you sure you want to delete all historical routines for ${formattedDate}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/routines/history/by-date?date=${dateStr}`);
              setTasks(prev => prev.filter(t => t.date !== dateStr));
            } catch (error) {
              console.error("Failed to delete day's routines", error);
              Alert.alert("Error", "Could not delete routines for this day.");
            }
          }
        }
      ]
    );
  };

  // Group tasks by raw YYYY-MM-DD date for rendering
  const groupedTasks = tasks.reduce((groups: Record<string, Routine[]>, task) => {
    if (!groups[task.date]) groups[task.date] = [];
    groups[task.date].push(task);
    return groups;
  }, {});

  const renderTask = (r: Routine, isLast: boolean) => (
    <View key={r.id} style={s.taskRow}>
      <View style={s.timeCol}>
        <Text style={[s.timeText, { color: theme.text2 }]}>
          {r.start_time.substring(0,5)}
        </Text>
        <View style={s.timelineGfx}>
          <View style={[s.dot, { backgroundColor: theme.green, borderColor: theme.green }]} />
          {!isLast && <View style={[s.line, { backgroundColor: theme.green + '44' }]} />}
        </View>
      </View>
      
      <View style={[s.card, { backgroundColor: theme.bg2 }]}>
        <View style={s.cardHeader}>
          {r.category && (
            <View style={[s.catPill, { backgroundColor: theme.blue + '22' }]}>
              <Text style={[s.catText, { color: theme.blue }]}>{r.category}</Text>
            </View>
          )}
        </View>
        <Text style={[s.title, { color: theme.text }]} numberOfLines={2}>{r.title}</Text>
        
        <View style={s.metaRow}>
          {r.actual_duration ? (
            <View style={[s.metaPill, { backgroundColor: theme.bg }]}>
              <Feather name="clock" size={12} color={theme.text2} />
              <Text style={[s.metaText, { color: theme.text2 }]}>{r.actual_duration}m</Text>
            </View>
          ) : null}
          <View style={[s.metaPill, { backgroundColor: theme.green + '22' }]}>
            <Feather name="check" size={12} color={theme.green} />
            <Text style={[s.metaText, { color: theme.green, fontWeight: '600' }]}>Completed</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && tasks.length === 0 ? (
        <ActivityIndicator size="large" color={theme.orange} style={{ marginTop: 40 }} />
      ) : tasks.length === 0 ? (
        <View style={s.emptyState}>
          <Feather name="inbox" size={48} color={theme.text3} />
          <Text style={[s.emptyText, { color: theme.text2 }]}>No historical tasks found.</Text>
        </View>
      ) : (
        <FlatList
          data={Object.entries(groupedTasks)}
          keyExtractor={(item) => item[0]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.orange} />}
          renderItem={({ item: [dateGroup, dayTasks] }) => {
            const formattedDate = new Date(dateGroup).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            return (
              <View style={s.dayGroup}>
                <View style={[s.dateHeaderContainer, { backgroundColor: theme.bg }]}>
                  <Text style={[s.dateHeader, { color: theme.text }]}>{formattedDate}</Text>
                  <TouchableOpacity onPress={() => handleDeleteDay(dateGroup, formattedDate)} style={{ padding: 8 }}>
                    <Feather name="trash-2" size={16} color={theme.red} />
                  </TouchableOpacity>
                </View>
                <View style={s.dayTasksContainer}>
                  {dayTasks.map((task, i) => renderTask(task, i === dayTasks.length - 1))}
                </View>
              </View>
            );
          }}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={theme.orange} style={{ marginVertical: 20 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 16, fontSize: 16, fontFamily: 'Outfit-Medium' },
  dayGroup: {
    marginBottom: 24,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayTasksContainer: {
    paddingHorizontal: 20,
  },
  taskRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timeCol: {
    width: 60,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Outfit-SemiBold',
  },
  timelineGfx: {
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    zIndex: 2,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: -2,
    marginBottom: -16,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginLeft: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  catText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'Outfit-Medium',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  }
});

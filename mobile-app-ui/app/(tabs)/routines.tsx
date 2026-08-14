import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert, Animated, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/lib/api';
import { useRouter, useFocusEffect } from 'expo-router';
import { RoutinesSkeleton, FadeInView } from '../../components/PremiumLoader';
import { useTheme } from '@/context/ThemeContext';
import { syncRoutineNotifications } from '../../lib/notifications';
import TimeWheelPicker from '@/components/TimeWheelPicker';
import { Feather } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type Routine = {
  id: number;
  title: string;
  date: string;
  start_time?: string;
  end_time?: string;
  estimated_time?: number;
  actual_duration?: number;
  category?: string;
  status: string;
  priority?: string;
  focus_mode_recommended: boolean;
  session_id?: number;
  energy_score?: number;
  urgency_score?: number;
  scheduling_reason?: string;
  description?: string;
  location?: string;
};

type PlannerSections = {
  overdue: Routine[];
  today: Routine[];
  upcoming: Routine[];
  completed: Routine[];
};

type DailyReview = {
  completed_count: number;
  skipped_count: number;
  partial_count: number;
  pending_count: number;
  total_focus_minutes: number;
  total_recovery_minutes: number;
  summary_message: string;
  carry_forward: { id: number; title: string; status: string; category?: string }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
};

const minutesToDisplay = (mins?: number) => {
  if (!mins) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const CATEGORY_COLORS: Record<string, string> = {
  Technical: '#6366f1',
  Development: '#6366f1',
  Engineering: '#6366f1',
  Health: '#22c55e',
  Fitness: '#22c55e',
  Entertainment: '#f59e0b',
  Personal: '#ec4899',
  Admin: '#64748b',
  Administrative: '#64748b',
  Recovery: '#8b5cf6',
  General: '#94a3b8',
};

const getCategoryColor = (cat?: string) => {
  if (!cat) return '#94a3b8';
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return CATEGORY_COLORS[key];
  }
  return '#94a3b8';
};

const getEnergyLabel = (score?: number) => {
  if (!score) return null;
  if (score >= 8) return { label: 'High', color: '#ef4444' };
  if (score >= 5) return { label: 'Med', color: '#f59e0b' };
  return { label: 'Low', color: '#22c55e' };
};

const CATEGORIES = [
  { label: 'Technical', icon: 'code' },
  { label: 'Health', icon: 'activity' },
  { label: 'Study', icon: 'book' },
  { label: 'Personal', icon: 'user' },
  { label: 'Admin', icon: 'file-text' },
  { label: 'Entertainment', icon: 'film' },
  { label: 'General', icon: 'grid' },
];

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ r, theme, s, onEdit, onAction }: { r: Routine; theme: any; s: any; onEdit: () => void; onAction: (action: string) => void }) {
  const [showReason, setShowReason] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isCompleted = r.status === 'Completed';
  const isSkipped = r.status === 'Skipped';
  const isPartial = r.status === 'Partial';
  const energy = getEnergyLabel(r.energy_score);
  const catColor = getCategoryColor(r.category);

  return (
    <View style={[s.taskCard, isCompleted && s.taskCardCompleted, isSkipped && s.taskCardSkipped]}>
      {/* Top row: category pill + action menu */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        {r.category && (
          <View style={[s.catPill, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
            <View style={[s.catDot, { backgroundColor: catColor }]} />
            <Text style={[s.catText, { color: catColor }]}>{r.category}</Text>
          </View>
        )}
        {energy && (
          <View style={[s.energyPill, { backgroundColor: energy.color + '22' }]}>
            <Text style={[s.energyText, { color: energy.color }]}>⚡ {energy.label} Energy</Text>
          </View>
        )}
        <TouchableOpacity
          style={{ marginLeft: 'auto' }}
          onPress={() => setShowActions(prev => !prev)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="more-horizontal" size={18} color={theme.text3} />
        </TouchableOpacity>
      </View>

      {/* Action Menu */}
      {showActions && (
        <View style={[s.actionMenu, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          {!isCompleted && (
            <TouchableOpacity style={s.actionItem} onPress={() => { setShowActions(false); onAction('complete'); }}>
              <Feather name="check-circle" size={14} color={theme.green} />
              <Text style={[s.actionText, { color: theme.green }]}>Mark Complete</Text>
            </TouchableOpacity>
          )}
          {!isPartial && !isCompleted && (
            <TouchableOpacity style={s.actionItem} onPress={() => { setShowActions(false); onAction('partial'); }}>
              <Feather name="circle" size={14} color={theme.orange} />
              <Text style={[s.actionText, { color: theme.orange }]}>Mark Partial</Text>
            </TouchableOpacity>
          )}
          {!isSkipped && !isCompleted && (
            <TouchableOpacity style={s.actionItem} onPress={() => { setShowActions(false); onAction('skip'); }}>
              <Feather name="slash" size={14} color={theme.text3} />
              <Text style={[s.actionText, { color: theme.text3 }]}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.actionItem} onPress={() => { setShowActions(false); onEdit(); }}>
            <Feather name="edit-2" size={14} color={theme.text2} />
            <Text style={[s.actionText, { color: theme.text2 }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionItem} onPress={() => { setShowActions(false); onAction('delete'); }}>
            <Feather name="trash-2" size={14} color={theme.red} />
            <Text style={[s.actionText, { color: theme.red }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Title */}
      <TouchableOpacity activeOpacity={0.7} onPress={onEdit}>
        <Text style={[s.taskTitle, (isCompleted || isSkipped) && s.taskTitleDimmed]} numberOfLines={2}>
          {r.title}
        </Text>
      </TouchableOpacity>

      {/* Time + Duration row */}
      <View style={s.taskMetaRow}>
        {r.start_time && (
          <View style={s.metaChip}>
            <Feather name="clock" size={11} color={theme.text3} />
            <Text style={s.metaChipText}>
              {formatTime(r.start_time)}{r.end_time ? ` → ${formatTime(r.end_time)}` : ''}
            </Text>
          </View>
        )}
        {r.estimated_time && (
          <View style={s.metaChip}>
            <Feather name="clock" size={11} color={theme.text3} />
            <Text style={s.metaChipText}>{minutesToDisplay(r.estimated_time)}</Text>
          </View>
        )}
        {r.location && (
          <View style={s.metaChip}>
            <Feather name="map-pin" size={11} color={theme.text3} />
            <Text style={s.metaChipText}>{r.location}</Text>
          </View>
        )}
        {r.focus_mode_recommended && (
          <View style={[s.metaChip, { backgroundColor: '#6366f122', borderColor: '#6366f133' }]}>
            <Text style={{ fontSize: 10, color: '#6366f1', fontWeight: '700' }}>🎯 Focus</Text>
          </View>
        )}
      </View>

      {/* Status badge for non-pending */}
      {(isSkipped || isPartial || isCompleted) && (
        <View style={[s.statusBadge, {
          backgroundColor: isCompleted ? theme.green + '22' : isSkipped ? theme.red + '22' : theme.orange + '22',
          borderColor: isCompleted ? theme.green + '44' : isSkipped ? theme.red + '44' : theme.orange + '44',
        }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: isCompleted ? theme.green : isSkipped ? theme.red : theme.orange }}>
            {isCompleted ? '✓ Completed' : isSkipped ? '✕ Skipped' : '◑ Partial'}
            {r.actual_duration && isCompleted ? ` · ${minutesToDisplay(r.actual_duration)}` : ''}
          </Text>
        </View>
      )}

      {/* Scheduling Reason — collapsible */}
      {r.scheduling_reason && !isCompleted && (
        <TouchableOpacity
          style={s.reasonToggle}
          onPress={() => setShowReason(prev => !prev)}
          activeOpacity={0.7}
        >
          <Text style={s.reasonToggleText}>
            <Text style={{ color: theme.orange }}>✦ </Text>
            {showReason ? 'Hide reason ▲' : 'Why scheduled? ▼'}
          </Text>
        </TouchableOpacity>
      )}
      {showReason && r.scheduling_reason && (
        <View style={s.reasonBox}>
          <Text style={s.reasonText}>{r.scheduling_reason}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RoutinesScreen() {
  const { theme } = useTheme();
  const s = getStyles(theme);
  const router = useRouter();

  const [sections, setSections] = useState<PlannerSections>({ overdue: [], today: [], upcoming: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<'overdue' | 'today' | 'upcoming' | 'completed'>('today');

  // Editor State
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Routine> | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // Daily Review
  const [showReview, setShowReview] = useState(false);
  const [review, setReview] = useState<DailyReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Complete with actual duration modal
  const [completeModal, setCompleteModal] = useState<{ id: number; estimated: number } | null>(null);
  const [actualDuration, setActualDuration] = useState('');

  useFocusEffect(useCallback(() => { fetchRoutines(); }, []));

  const fetchRoutines = async () => {
    try {
      const data = await api.get('/routines/planner');
      setSections({ overdue: data.overdue || [], today: data.today || [], upcoming: data.upcoming || [], completed: data.completed || [] });
      syncRoutineNotifications([...(data.today || []), ...(data.upcoming || [])]);
    } catch (error) {
      Alert.alert("Network Error", "Failed to fetch routines. Please check your connection.");
    }
    setLoading(false);
  };

  const fetchReview = async () => {
    setReviewLoading(true);
    try {
      const data = await api.get('/orbit/daily-review');
      setReview(data);
    } catch (error) {
      Alert.alert("Network Error", "Failed to fetch review. Please check your connection.");
    }
    setReviewLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRoutines();
    setRefreshing(false);
  }, []);

  const mutateRoutine = (id: number, newStatus: string) => {
    const updater = (r: Routine) => ({ ...r, status: newStatus as any });
    setSections(prev => ({
      overdue: prev.overdue.map(r => r.id === id ? updater(r) : r),
      today: prev.today.map(r => r.id === id ? updater(r) : r),
      upcoming: prev.upcoming.map(r => r.id === id ? updater(r) : r),
      completed: prev.completed.map(r => r.id === id ? updater(r) : r),
    }));
  };

  const removeRoutine = (id: number) => {
    setSections(prev => ({
      overdue: prev.overdue.filter(r => r.id !== id),
      today: prev.today.filter(r => r.id !== id),
      upcoming: prev.upcoming.filter(r => r.id !== id),
      completed: prev.completed.filter(r => r.id !== id),
    }));
  };

  const handleClearAllOverdue = () => {
    Alert.alert(
      "Clear Overdue Tasks",
      "Are you sure you want to permanently delete all your overdue tasks?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete All", 
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete('/routines/overdue/all');
              setSections(prev => ({ ...prev, overdue: [] }));
              if (activeSection === 'overdue') {
                setActiveSection('today');
              }
            } catch (error) {
              Alert.alert("Error", "Failed to clear overdue tasks.");
            }
          }
        }
      ]
    );
  };

  const handleClearTodayTasks = () => {
    Alert.alert(
      "Clear Today's Tasks",
      "Are you sure you want to permanently delete all your tasks for today?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete All", 
          style: "destructive",
          onPress: async () => {
            try {
              const todayStr = new Date().toISOString().split('T')[0];
              await api.delete(`/routines/history/by-date?date=${todayStr}`);
              setSections(prev => ({ ...prev, today: [] }));
            } catch (error) {
              Alert.alert("Error", "Failed to clear today's tasks.");
            }
          }
        }
      ]
    );
  };

  // ── Actions ──
  const handleAction = (r: Routine, action: string) => {
    if (action === 'delete') {
      Alert.alert('Delete Task', 'Remove this task permanently?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await api.delete(`/routines/${r.id}`);
          removeRoutine(r.id);
        }},
      ]);
    } else if (action === 'complete') {
      setCompleteModal({ id: r.id, estimated: r.estimated_time || 60 });
      setActualDuration(String(r.estimated_time || 60));
    } else if (action === 'partial') {
      api.put(`/routines/${r.id}`, { status: 'Partial' }).then(() => fetchRoutines());
    } else if (action === 'skip') {
      api.put(`/routines/${r.id}`, { status: 'Skipped' }).then(() => fetchRoutines());
    }
  };

  const submitComplete = async () => {
    if (!completeModal) return;
    const dur = parseInt(actualDuration) || completeModal.estimated;
    await api.patch(`/routines/${completeModal.id}/complete?actual_duration=${dur}`);
    setCompleteModal(null);
    fetchRoutines();
  };

  // ── Editor ──
  const openEditor = (task?: Routine) => {
    setConflictMessage(null);
    if (task) {
      setEditingTask({ ...task });
    } else {
      setEditingTask({
        title: '', date: new Date().toISOString().split('T')[0],
        start_time: '09:00', end_time: '10:00',
        category: 'General', estimated_time: 60,
      });
    }
    setShowEditor(true);
  };

  const applyDuration = (mins: number) => {
    if (!editingTask?.start_time) return;
    const [h, m] = editingTask.start_time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m + mins, 0, 0);
    const newEnd = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const dur = (h * 60 + m + mins) - (h * 60 + m);
    setEditingTask(prev => prev ? { ...prev, end_time: newEnd, estimated_time: (prev.estimated_time || 0) + mins } : null);
  };

  const handleSave = async (forceKeep = false) => {
    if (!editingTask || !editingTask.title?.trim()) return;
    setSaving(true);
    setConflictMessage(null);

    try {
      // Conflict check for existing tasks with new time
      if (!forceKeep && editingTask.id && editingTask.start_time && editingTask.end_time) {
        const conflict = await api.post('/routines/check-conflict', {
          routine_id: editingTask.id,
          new_start_time: editingTask.start_time + ':00',
          new_end_time: editingTask.end_time + ':00',
          new_date: editingTask.date,
        });
        if (conflict.has_conflict) {
          setConflictMessage(conflict.message);
          setSaving(false);
          return;
        }
      }

      if (editingTask.id) {
        await api.put(`/routines/${editingTask.id}`, editingTask);
      } else {
        await api.post('/routines', editingTask);
      }
      setShowEditor(false);
      setEditingTask(null);
      await fetchRoutines();
    } catch (error) {
      Alert.alert("Network Error", "Failed to save task. Please try again.");
    }
    setSaving(false);
  };

  // ── Stats ──
  const allTasks = [...sections.overdue, ...sections.today, ...sections.upcoming, ...sections.completed];
  const completedCount = sections.completed.length;
  const totalCount = allTasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const displayedRoutines = sections[activeSection];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading && !refreshing) return <RoutinesSkeleton />;

  return (
    <FadeInView>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Planner</Text>
            <Text style={s.headerSub}>{days[new Date().getDay()]} · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</Text>
          </View>
          <TouchableOpacity onPress={() => openEditor()} activeOpacity={0.7} style={{ padding: 8 }}>
            <Feather name="plus" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* ── Section Tabs ── */}
        <View style={s.tabRow}>
          {(['overdue', 'today', 'upcoming', 'completed'] as const).map(sec => (
            <TouchableOpacity
              key={sec}
              onPress={() => setActiveSection(sec)}
              style={[s.tab, activeSection === sec && s.tabActive]}
            >
              <Text style={[s.tabText, activeSection === sec && s.tabTextActive]}>
                {sec.charAt(0).toUpperCase() + sec.slice(1)}
                {sections[sec].length > 0 ? ` · ${sections[sec].length}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Task List ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.orange} />}
        >
          {displayedRoutines.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Feather name={activeSection === 'today' ? 'sun' : activeSection === 'upcoming' ? 'calendar' : activeSection === 'overdue' ? 'alert-circle' : 'check-circle'} size={32} color={theme.orange} />
              </View>
              <Text style={s.emptyTitle}>
                {activeSection === 'today' ? 'No tasks today' : activeSection === 'upcoming' ? 'Nothing upcoming' : activeSection === 'overdue' ? 'No overdue tasks' : 'No completed tasks yet'}
              </Text>
              <Text style={s.emptyText}>
                {activeSection === 'today'
                  ? 'Let Orbit plan your day with AI-powered scheduling.'
                  : activeSection === 'upcoming'
                  ? 'Scheduled tasks for future days appear here.'
                  : activeSection === 'overdue'
                  ? 'You are all caught up!'
                  : 'Completed tasks from today appear here.'}
              </Text>
              {activeSection === 'today' && (
                <TouchableOpacity style={[s.primaryBtn, { paddingHorizontal: 32, marginTop: 12, minWidth: 200 }]} onPress={() => router.push('/ai-planner')} activeOpacity={0.8}>
                  <Text style={s.primaryBtnText}>✦ Open Orbit</Text>
                </TouchableOpacity>
              )}
              {activeSection === 'completed' && (
                <TouchableOpacity style={[s.primaryBtn, { paddingHorizontal: 32, marginTop: 16, minWidth: 200 }]} onPress={() => router.push('/(tabs)/history')} activeOpacity={0.8}>
                  <Text style={s.primaryBtnText}>View Full History</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {activeSection === 'overdue' && displayedRoutines.length > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Overdue Tasks</Text>
                  <TouchableOpacity onPress={handleClearAllOverdue} style={{ padding: 6, paddingHorizontal: 12, backgroundColor: theme.red + '22', borderRadius: 8 }}>
                    <Text style={{ color: theme.red, fontSize: 13, fontWeight: '600' }}>Clear All</Text>
                  </TouchableOpacity>
                </View>
              )}
              {activeSection === 'today' && displayedRoutines.length > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity onPress={handleClearTodayTasks} style={{ padding: 6, paddingHorizontal: 12, backgroundColor: theme.red + '22', borderRadius: 8 }}>
                    <Text style={{ color: theme.red, fontSize: 13, fontWeight: '600' }}>Clear All</Text>
                  </TouchableOpacity>
                </View>
              )}
              {displayedRoutines.map((r, i) => {
                const isLast = i === displayedRoutines.length - 1;
                const isCompleted = r.status === 'Completed';
                return (
                  <View key={r.id} style={s.timelineRow}>
                    {/* Time Column */}
                    <View style={s.timeCol}>
                      <Text style={[s.timeText, isCompleted && { opacity: 0.4 }]}>
                        {formatTime(r.start_time || '')}
                      </Text>
                      {r.date !== new Date().toISOString().split('T')[0] && (
                        <Text style={s.dateBadge}>
                          {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      )}
                    </View>

                    {/* Timeline Connector */}
                    <View style={s.lineCol}>
                      <View style={[s.dot, isCompleted ? { backgroundColor: theme.green, borderColor: theme.green } : { borderColor: theme.orange }]} />
                      {!isLast && <View style={[s.line, isCompleted && { backgroundColor: theme.green + '44' }]} />}
                    </View>

                    {/* Card */}
                    <View style={[s.cardCol, isCompleted && { opacity: 0.65 }]}>
                      <TaskCard
                        r={r}
                        theme={theme}
                        s={s}
                        onEdit={() => openEditor(r)}
                        onAction={(action) => handleAction(r, action)}
                      />
                    </View>
                  </View>
                );
              })}

              {/* View Full History button (Completed only) */}
              {activeSection === 'completed' && displayedRoutines.length > 0 && (
                <TouchableOpacity 
                  style={[s.primaryBtn, { marginTop: 16, marginHorizontal: 24, marginBottom: 24, backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.border }]} 
                  onPress={() => router.push('/(tabs)/history')} 
                  activeOpacity={0.8}
                >
                  <Text style={[s.primaryBtnText, { color: theme.text }]}>View Full History</Text>
                </TouchableOpacity>
              )}

              {/* Orbit Insights box (Today only) */}
              {activeSection === 'today' && sections.today.length > 0 && (
                <View style={s.insightsBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Text style={{ fontSize: 16 }}>🧠</Text>
                    <Text style={s.insightsTitle}>Orbit Insights</Text>
                  </View>
                  <View style={{ gap: 8, marginBottom: 16 }}>
                    {[
                      'Tasks grouped by context to minimize switching.',
                      'Recovery buffers and meals injected to sustain energy.',
                      'Long focus tasks split into deep-work blocks.',
                    ].map((tip, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                        <Text style={{ color: '#8b5cf6', fontSize: 12, marginTop: 1 }}>✦</Text>
                        <Text style={{ color: theme.text2, fontSize: 13, flex: 1, lineHeight: 20 }}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[s.insightBtn, { flex: 1 }]}
                      onPress={() => { fetchReview(); setShowReview(true); }}
                      activeOpacity={0.8}
                    >
                      <Feather name="bar-chart-2" size={14} color="#8b5cf6" />
                      <Text style={s.insightBtnText}>Day Review</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.insightBtnFilled, { flex: 1 }]}
                      onPress={() => router.push('/ai-planner')}
                      activeOpacity={0.8}
                    >
                      <Text style={s.insightBtnFilledText}>✦ Re-optimize</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>


        {/* ── Complete with Duration Modal ── */}
        <Modal visible={!!completeModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { padding: 24, borderRadius: 20, maxHeight: 'auto' as any }]}>
              <Text style={[s.modalTitle, { marginBottom: 8 }]}>Mark as Complete</Text>
              <Text style={{ color: theme.text2, fontSize: 14, marginBottom: 20 }}>
                How long did it actually take? (Planned: {minutesToDisplay(completeModal?.estimated)})
              </Text>
              <Text style={s.fieldLabel}>Actual Duration (minutes)</Text>
              <TextInput
                style={s.input}
                keyboardType="numeric"
                value={actualDuration}
                onChangeText={setActualDuration}
                placeholder={String(completeModal?.estimated || 60)}
                placeholderTextColor={theme.text3}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity style={[s.secondaryBtn, { flex: 1 }]} onPress={() => setCompleteModal(null)}>
                  <Text style={{ color: theme.text2, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={submitComplete}>
                  <Text style={s.primaryBtnText}>Complete ✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Daily Review Modal ── */}
        <Modal visible={showReview} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>📊 Day Review</Text>
                <TouchableOpacity onPress={() => setShowReview(false)}>
                  <Feather name="x" size={20} color={theme.text3} />
                </TouchableOpacity>
              </View>
              {reviewLoading ? (
                <ActivityIndicator color={theme.orange} style={{ marginVertical: 40 }} />
              ) : review ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={{ color: theme.text2, fontSize: 14, lineHeight: 22, marginBottom: 20 }}>
                    {review.summary_message}
                  </Text>
                  {/* Stat Grid */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Completed', val: review.completed_count, color: theme.green },
                      { label: 'Skipped', val: review.skipped_count, color: theme.red },
                      { label: 'Partial', val: review.partial_count, color: theme.orange },
                      { label: 'Pending', val: review.pending_count, color: theme.text3 },
                    ].map(stat => (
                      <View key={stat.label} style={[s.reviewStatCard, { borderColor: stat.color + '44', backgroundColor: stat.color + '11' }]}>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: stat.color }}>{stat.val}</Text>
                        <Text style={{ fontSize: 11, color: stat.color, fontWeight: '600' }}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Focus Time */}
                  <View style={[s.reviewStatRow]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="zap" size={14} color="#6366f1" />
                      <Text style={{ color: theme.text2, fontSize: 13 }}>Focus Time</Text>
                    </View>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>
                      {minutesToDisplay(review.total_focus_minutes)}
                    </Text>
                  </View>
                  <View style={[s.reviewStatRow]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="heart" size={14} color="#22c55e" />
                      <Text style={{ color: theme.text2, fontSize: 13 }}>Recovery Time</Text>
                    </View>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>
                      {minutesToDisplay(review.total_recovery_minutes)}
                    </Text>
                  </View>
                  {/* Carry Forward */}
                  {review.carry_forward.length > 0 && (
                    <View style={{ marginTop: 20 }}>
                      <Text style={[s.fieldLabel, { marginBottom: 12 }]}>Carry Forward to Tomorrow?</Text>
                      {review.carry_forward.slice(0, 5).map(t => (
                        <View key={t.id} style={[s.carryForwardItem]}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{t.title}</Text>
                            {t.category && <Text style={{ color: theme.text3, fontSize: 11 }}>{t.category}</Text>}
                          </View>
                          <View style={[s.statusBadge, { backgroundColor: theme.orange + '22', borderColor: theme.orange + '44' }]}>
                            <Text style={{ fontSize: 10, color: theme.orange, fontWeight: '700' }}>{t.status}</Text>
                          </View>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={[s.primaryBtn, { marginTop: 16 }]}
                        onPress={() => { setShowReview(false); router.push('/ai-planner'); }}
                        activeOpacity={0.8}
                      >
                        <Text style={s.primaryBtnText}>✦ Plan Tomorrow with Orbit</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              ) : (
                <Text style={{ color: theme.text2 }}>No data available yet.</Text>
              )}
            </View>
          </View>
        </Modal>

        {/* ── Task Editor Bottom Sheet ── */}
        <Modal visible={showEditor} transparent animationType="slide">
          <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editingTask?.id ? 'Edit Task' : 'New Task'}</Text>
                <TouchableOpacity onPress={() => setShowEditor(false)}>
                  <Feather name="x" size={20} color={theme.text3} />
                </TouchableOpacity>
              </View>

              {/* Conflict Warning */}
              {conflictMessage && (
                <View style={s.conflictBanner}>
                  <Text style={s.conflictText}>⚠️ {conflictMessage}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={[s.conflictBtn, { borderColor: theme.border }]} onPress={() => setConflictMessage(null)}>
                      <Text style={{ color: theme.text2, fontSize: 12, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.conflictBtnFilled]} onPress={() => handleSave(true)}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Keep Change</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Title */}
                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Task Name</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. SQL Interview Prep"
                    placeholderTextColor={theme.text3}
                    value={editingTask?.title}
                    onChangeText={t => setEditingTask(prev => prev ? { ...prev, title: t } : null)}
                  />
                </View>

                {/* Category */}
                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {CATEGORIES.map(c => {
                      const active = editingTask?.category === c.label;
                      return (
                        <TouchableOpacity
                          key={c.label}
                          style={[s.chip, active && { borderColor: getCategoryColor(c.label), backgroundColor: getCategoryColor(c.label) + '22' }]}
                          onPress={() => setEditingTask(prev => prev ? { ...prev, category: c.label } : null)}
                        >
                          <Feather name={c.icon as any} size={13} color={active ? getCategoryColor(c.label) : theme.text3} />
                          <Text style={[s.chipText, active && { color: getCategoryColor(c.label) }]}>{c.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Notes */}
                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Notes (optional)</Text>
                  <TextInput
                    style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
                    placeholder="Any details or context..."
                    placeholderTextColor={theme.text3}
                    value={editingTask?.description || ''}
                    multiline
                    onChangeText={t => setEditingTask(prev => prev ? { ...prev, description: t } : null)}
                  />
                </View>

                {/* Time Row */}
                <View style={s.fieldRow}>
                  <View style={[s.fieldWrap, { flex: 1 }]}>
                    <Text style={s.fieldLabel}>Start</Text>
                    <TouchableOpacity style={s.input} onPress={() => { setShowEndTimePicker(false); setShowStartTimePicker(true); }}>
                      <Text style={{ color: theme.text }}>{formatTime(editingTask?.start_time || '')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[s.fieldWrap, { flex: 1 }]}>
                    <Text style={s.fieldLabel}>End</Text>
                    <TouchableOpacity style={s.input} onPress={() => { setShowStartTimePicker(false); setShowEndTimePicker(true); }}>
                      <Text style={{ color: theme.text }}>{formatTime(editingTask?.end_time || '')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Quick Duration */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {[15, 30, 45, 60, 90].map(m => (
                    <TouchableOpacity
                      key={m}
                      style={s.durationChip}
                      onPress={() => applyDuration(m)}
                    >
                      <Text style={{ fontSize: 12, color: theme.text2, fontWeight: '600' }}>+{m}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Time Picker */}
                {(showStartTimePicker || showEndTimePicker) && (
                  <View style={s.timePickerWrap}>
                    <View style={s.timePickerHeader}>
                      <Text style={{ fontWeight: '600', color: theme.text }}>
                        {showStartTimePicker ? 'Select Start Time' : 'Select End Time'}
                      </Text>
                      <TouchableOpacity onPress={() => { setShowStartTimePicker(false); setShowEndTimePicker(false); }}>
                        <Text style={{ color: theme.orange, fontWeight: '700' }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ padding: 16 }}>
                      <TimeWheelPicker
                        value={showStartTimePicker ? editingTask?.start_time || '09:00' : editingTask?.end_time || '10:00'}
                        onChange={(timeStr) => {
                          if (showStartTimePicker) setEditingTask(prev => prev ? { ...prev, start_time: timeStr } : null);
                          else setEditingTask(prev => prev ? { ...prev, end_time: timeStr } : null);
                        }}
                      />
                    </View>
                  </View>
                )}

                {/* Save + Delete */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  {editingTask?.id && (
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={() => {
                        Alert.alert('Delete', 'Remove this task?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: async () => {
                            await api.delete(`/routines/${editingTask.id}`);
                            removeRoutine(editingTask.id as number);
                            setShowEditor(false);
                          }},
                        ]);
                      }}
                    >
                      <Feather name="trash-2" size={20} color={theme.red} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.primaryBtn, { flex: 1 }, saving && { opacity: 0.7 }]}
                    onPress={() => handleSave(false)}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </SafeAreaView>
    </FadeInView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (c: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: c.text3, fontWeight: '500', marginTop: 2 },
  progressPercent: { fontSize: 22, fontWeight: '800', color: c.orange },

  progressWrap: { paddingHorizontal: 20, marginBottom: 12 },
  progressBg: { height: 4, borderRadius: 2, backgroundColor: c.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: c.orange },

  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, gap: 8 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', backgroundColor: c.cardBg },
  tabActive: { backgroundColor: c.orange, borderColor: c.orange },
  tabText: { fontSize: 12, fontWeight: '700', color: c.text2 },
  tabTextActive: { color: '#fff' },

  // Timeline
  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  timeCol: { width: 62, alignItems: 'flex-end', paddingRight: 10, paddingTop: 22 },
  timeText: { fontSize: 11, fontWeight: '700', color: c.text, opacity: 0.85 },
  dateBadge: { fontSize: 9, color: c.text3, marginTop: 2 },
  lineCol: { width: 18, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, backgroundColor: c.bg, marginTop: 22, zIndex: 2 },
  line: { position: 'absolute', top: 34, bottom: -8, width: 2, backgroundColor: c.border, zIndex: 1 },
  cardCol: { flex: 1, paddingBottom: 14, paddingLeft: 10 },

  // Task Card
  taskCard: {
    backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.border,
    borderRadius: 18, padding: 16, paddingVertical: 14, marginTop: 6,
  },
  taskCardCompleted: { backgroundColor: c.bg2, borderColor: 'transparent' },
  taskCardSkipped: { backgroundColor: c.bg2, borderColor: 'transparent', opacity: 0.7 },
  taskTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 10, lineHeight: 22 },
  taskTitleDimmed: { color: c.text3, textDecorationLine: 'line-through' },

  // Pill badges
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catText: { fontSize: 10, fontWeight: '700' },
  energyPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  energyText: { fontSize: 10, fontWeight: '700' },

  taskMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: c.bg3, borderWidth: 1, borderColor: c.border },
  metaChipText: { fontSize: 11, color: c.text3, fontWeight: '600' },

  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginTop: 8 },

  // Action Menu
  actionMenu: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: c.border },
  actionText: { fontSize: 13, fontWeight: '600' },

  // Scheduling reason
  reasonToggle: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
  reasonToggleText: { fontSize: 11, color: c.text3, fontWeight: '600' },
  reasonBox: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: c.orange + '11', borderWidth: 1, borderColor: c.orange + '33' },
  reasonText: { fontSize: 12, color: c.text2, lineHeight: 18 },

  // Insights Box
  insightsBox: {
    marginTop: 16, marginLeft: 90, padding: 16, borderRadius: 18,
    backgroundColor: '#8b5cf611', borderWidth: 1, borderColor: '#8b5cf633',
  },
  insightsTitle: { fontSize: 12, color: '#8b5cf6', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  insightBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#8b5cf6' },
  insightBtnText: { color: '#8b5cf6', fontWeight: '700', fontSize: 13 },
  insightBtnFilled: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#8b5cf6' },
  insightBtnFilledText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Review
  reviewStatCard: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  reviewStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  carryForwardItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: c.border, gap: 10 },

  // Empty State
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.orange + '22', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: c.text, marginTop: 8 },
  emptyText: { fontSize: 14, color: c.text3, textAlign: 'center', maxWidth: 260, lineHeight: 22 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center',
    shadowColor: c.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: c.bg2, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: c.text },

  // Conflict Banner
  conflictBanner: { backgroundColor: '#f59e0b22', borderWidth: 1, borderColor: '#f59e0b55', borderRadius: 14, padding: 14, marginBottom: 16 },
  conflictText: { color: '#d97706', fontSize: 13, lineHeight: 20, fontWeight: '500' },
  conflictBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  conflictBtnFilled: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: c.orange, alignItems: 'center' },

  // Editor Fields
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: c.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  input: {
    backgroundColor: c.bg3, borderWidth: 1, borderColor: c.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    color: c.text, fontSize: 15,
  },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  chipText: { fontSize: 12, fontWeight: '600', color: c.text2 },
  durationChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  timePickerWrap: { backgroundColor: c.surface, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  timePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.bg2 },

  primaryBtn: { backgroundColor: c.orange, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { borderWidth: 1.5, borderColor: c.border, borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: c.surface },
  deleteBtn: { backgroundColor: c.bg3, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
});

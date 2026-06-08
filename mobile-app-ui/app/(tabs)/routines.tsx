import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/lib/api';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { RoutinesSkeleton, FadeInView } from '../../components/PremiumLoader';
import { Radius, FontSize } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import TimeWheelPicker from '@/components/TimeWheelPicker';
import { Feather } from '@expo/vector-icons';

type Routine = {
  id: number;
  title: string;
  date: string;
  start_time?: string;
  end_time?: string;
  category?: string;
  status: string;
  focus_mode_recommended: boolean;
};

export default function RoutinesScreen() {
  const { theme } = useTheme();
  const s = getStyles(theme);

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRoutine, setNewRoutine] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    category: 'Work',
    focus_mode_recommended: false,
  });

  const [rescheduleTaskId, setRescheduleTaskId] = useState<number | null>(null);
  const [extraTime, setExtraTime] = useState(15);
  const [rescheduling, setRescheduling] = useState(false);
  const params = useLocalSearchParams();

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const getSmartDateStr = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  };

  const categories = [
    { label: 'Work', icon: 'briefcase' },
    { label: 'Health', icon: 'activity' },
    { label: 'Study', icon: 'book' },
    { label: 'Personal', icon: 'user' },
    { label: 'Chores', icon: 'check-square' },
  ];

  const smartDates = [
    { label: 'Today', value: getSmartDateStr(0) },
    { label: 'Tomorrow', value: getSmartDateStr(1) },
    { label: 'Next Week', value: getSmartDateStr(7) },
  ];

  const applyDuration = (mins: number) => {
    if (!newRoutine.start_time) return;
    const [h, m] = newRoutine.start_time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    d.setMinutes(d.getMinutes() + mins);
    const newEnd = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setNewRoutine({ ...newRoutine, end_time: newEnd });
  };

  const formatTimeDisplay = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    return `${hours12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const parseTimeToDate = (time24: string) => {
    const d = new Date();
    const [h, m] = time24.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d;
  };

  useFocusEffect(
    useCallback(() => {
      if (params.rescheduleTaskId) {
        setRescheduleTaskId(Number(params.rescheduleTaskId));
      }
      // Don't setLoading(true) here for silent background refresh
      fetchRoutines();
    }, [params.rescheduleTaskId])
  );

  const fetchRoutines = async () => {
    try {
      const data = await api.get('/routines');
      setRoutines(data);
    } catch {}
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRoutines();
    setRefreshing(false);
  }, []);

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      await api.put(`/routines/${id}`, { status: newStatus });
      setRoutines(prev =>
        prev.map(r => r.id === id ? { ...r, status: newStatus } : r)
      );
    } catch {}
  };

  const deleteRoutine = (id: number) => {
    Alert.alert(
      'Delete Routine',
      'Are you sure you want to delete this routine?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/routines/${id}`);
              setRoutines(prev => prev.filter(r => r.id !== id));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete routine.');
            }
          },
        },
      ]
    );
  };

  const handleCreate = async () => {
    if (!newRoutine.title.trim()) return;
    setCreating(true);
    try {
      await api.post('/routines', newRoutine);
      setShowCreate(false);
      setNewRoutine({
        title: '', date: new Date().toISOString().split('T')[0],
        start_time: '09:00', end_time: '10:00',
        category: 'Work',
        focus_mode_recommended: false,
      });
      await fetchRoutines();
    } catch {}
    setCreating(false);
  };

  const handleReschedule = async () => {
    if (!rescheduleTaskId) return;
    setRescheduling(true);
    try {
      const taskIndex = routines.findIndex(r => r.id === rescheduleTaskId);
      if (taskIndex !== -1) {
        // Shift end time of the current task
        const task = routines[taskIndex];
        const shiftMins = extraTime;

        // Helper to add minutes to HH:mm string
        const addMins = (timeStr: string, mins: number) => {
          if (!timeStr) return '';
          const [h, m] = timeStr.split(':').map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          d.setMinutes(d.getMinutes() + mins);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        const newEndTime = addMins(task.end_time || '', shiftMins);
        await api.put(`/routines/${task.id}`, { end_time: newEndTime });

        // Shift subsequent pending tasks
        for (let i = taskIndex + 1; i < routines.length; i++) {
          const nextTask = routines[i];
          if (nextTask.status !== 'Completed') {
            const newStart = addMins(nextTask.start_time || '', shiftMins);
            const newEnd = addMins(nextTask.end_time || '', shiftMins);
            await api.put(`/routines/${nextTask.id}`, { start_time: newStart, end_time: newEnd });
          }
        }
      }
      setRescheduleTaskId(null);
      await fetchRoutines();
    } catch {}
    setRescheduling(false);
  };

  const completed = routines.filter(r => r.status === 'Completed').length;
  const total = routines.length;

  if (loading && !refreshing) {
    return <RoutinesSkeleton />;
  }

  return (
    <FadeInView>
      <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>My Routines</Text>
          <Text style={s.headerSub}>{completed}/{total} completed</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>

          <TouchableOpacity
            style={s.addBtn}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.8}
          >
            <Text style={s.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={s.progressWrap}>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${total > 0 ? (completed / total) * 100 : 0}%` }]} />
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.orange} />
        }
      >
        {routines.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
            <Text style={s.emptyTitle}>No routines yet</Text>
            <Text style={s.emptyText}>
              Create a routine or use the AI Builder to generate your perfect schedule.
            </Text>
          </View>
        ) : (
          routines.map((r) => (
            <View key={r.id} style={s.routineCard}>
              <TouchableOpacity
                style={s.routineMain}
                onPress={() => toggleStatus(r.id, r.status)}
                activeOpacity={0.7}
              >
                <View style={[
                  s.checkbox,
                  r.status === 'Completed' && s.checkboxDone,
                ]}>
                  {r.status === 'Completed' && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[s.routineTitle, r.status === 'Completed' && s.routineTitleDone]}
                    numberOfLines={1}
                  >
                    {r.title}
                  </Text>
                  <View style={s.routineMetaRow}>
                    <Feather name="calendar" size={13} color={theme.text3} style={{ marginRight: 2 }} />
                    <Text style={s.metaText}>{r.date}</Text>
                    <Feather name="clock" size={13} color={theme.text3} style={{ marginLeft: 8, marginRight: 2 }} />
                    <Text style={s.metaText}>{formatTimeDisplay(r.start_time || '')}</Text>
                    {r.category && (
                      <>
                        <Feather name="folder" size={13} color={theme.text3} style={{ marginLeft: 8, marginRight: 2 }} />
                        <Text style={s.metaText}>{r.category}</Text>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              <View style={s.routineActions}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => deleteRoutine(r.id)}
                  activeOpacity={0.6}
                >
                  <Feather name="trash-2" size={18} color={theme.red} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Routine</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Text style={{ color: theme.text3, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Title</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Morning Workout"
                  placeholderTextColor={theme.text3}
                  value={newRoutine.title}
                  onChangeText={t => setNewRoutine({ ...newRoutine, title: t })}
                />
              </View>

              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {categories.map(c => (
                    <TouchableOpacity
                      key={c.label}
                      style={[s.chip, newRoutine.category === c.label && s.chipActive]}
                      onPress={() => setNewRoutine({ ...newRoutine, category: c.label })}
                    >
                      <View style={s.chipInner}>
                        <Feather name={c.icon as any} size={14} color={newRoutine.category === c.label ? theme.orange : theme.text3} />
                        <Text style={[s.chipText, newRoutine.category === c.label && { color: theme.orange }]}>{c.label}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {smartDates.map(sd => (
                    <TouchableOpacity
                      key={sd.label}
                      style={[s.chip, newRoutine.date === sd.value && s.chipActive]}
                      onPress={() => setNewRoutine({ ...newRoutine, date: sd.value })}
                    >
                      <Text style={[s.chipText, newRoutine.date === sd.value && { color: theme.orange }]}>{sd.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>


              <View style={s.fieldRow}>
                <View style={[s.fieldWrap, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Start Time</Text>
                  <TouchableOpacity style={s.input} onPress={() => { setShowEndTimePicker(false); setShowStartTimePicker(true); }}>
                    <Text style={{ color: theme.text }}>{formatTimeDisplay(newRoutine.start_time || '')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[s.fieldWrap, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>End Time</Text>
                  <TouchableOpacity style={s.input} onPress={() => { setShowStartTimePicker(false); setShowEndTimePicker(true); }}>
                    <Text style={{ color: theme.text }}>{formatTimeDisplay(newRoutine.end_time || '')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[15, 30, 60].map(mins => (
                  <TouchableOpacity
                    key={mins}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
                    onPress={() => applyDuration(mins)}
                  >
                    <Text style={{ fontSize: 12, color: theme.text2, fontWeight: '600' }}>+{mins}m</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Time Wheel Picker */}
              {(showStartTimePicker || showEndTimePicker) && (
                <View style={{ backgroundColor: theme.surface, borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.bg2 }}>
                    <Text style={{ fontWeight: '600', color: theme.text }}>
                      {showStartTimePicker ? 'Select Start Time' : 'Select End Time'}
                    </Text>
                    <TouchableOpacity onPress={() => { setShowStartTimePicker(false); setShowEndTimePicker(false); }}>
                      <Text style={{ color: theme.orange, fontWeight: 'bold' }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ padding: 16 }}>
                    <TimeWheelPicker
                      value={showStartTimePicker ? newRoutine.start_time : newRoutine.end_time}
                      onChange={(timeStr) => {
                        if (showStartTimePicker) setNewRoutine({ ...newRoutine, start_time: timeStr });
                        else setNewRoutine({ ...newRoutine, end_time: timeStr });
                      }}
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[s.createBtn, creating && { opacity: 0.7 }]}
                onPress={handleCreate}
                disabled={creating}
                activeOpacity={0.85}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.createBtnText}>Create Routine</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={rescheduleTaskId !== null} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Need More Time?</Text>
              <TouchableOpacity onPress={() => setRescheduleTaskId(null)}>
                <Text style={{ color: theme.text3, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.text2, marginBottom: 20 }}>
              Select how much extra time you need. We'll automatically adjust your remaining schedule for today.
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              {[15, 30, 60].map(mins => (
                <TouchableOpacity
                  key={mins}
                  style={[s.chip, extraTime === mins && s.chipActive, { flex: 1, justifyContent: 'center' }]}
                  onPress={() => setExtraTime(mins)}
                >
                  <Text style={[s.chipText, extraTime === mins && { color: theme.orange }]}>
                    +{mins} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.createBtn, rescheduling && { opacity: 0.7 }]}
              onPress={handleReschedule}
              disabled={rescheduling}
              activeOpacity={0.85}
            >
              {rescheduling ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.createBtnText}>Reschedule Routine</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </FadeInView>
  );
}

const getStyles = (c: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  loadingWrap: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: c.text3, marginTop: 2 },
  addBtn: {
    backgroundColor: c.orange, borderRadius: Radius.sm,
    paddingVertical: 10, paddingHorizontal: 18,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  progressWrap: { paddingHorizontal: 20, marginBottom: 16 },
  progressBg: {
    height: 6, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 3,
    backgroundColor: c.orange,
  },

  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: c.text, marginBottom: 8 },
  emptyText: { fontSize: 13, color: c.text3, textAlign: 'center', maxWidth: 260, lineHeight: 20 },

  routineCard: {
    backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.border,
    borderRadius: Radius.md, padding: 16, marginBottom: 10,
  },
  routineMain: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  checkbox: {
    width: 26, height: 26, borderRadius: 8,
    borderWidth: 2, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: c.green, borderColor: c.green },
  routineTitle: { fontSize: 15, fontWeight: '600', color: c.text },
  routineTitleDone: { textDecorationLine: 'line-through', opacity: 0.5 },
  routineMetaRow: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: c.text3 },
  routineActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10,
  },
  deleteBtn: { padding: 4 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.bg2, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: c.text },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: c.text3,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  fieldRow: { flexDirection: 'row', gap: 12 },
  input: {
    backgroundColor: c.bg3, borderWidth: 1, borderColor: c.border,
    borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 12,
    color: c.text, fontSize: FontSize.sm,
  },
  createBtn: {
    backgroundColor: c.orange, borderRadius: Radius.sm,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14,
  },
  createBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
  },
  chipActive: { borderColor: c.orange, backgroundColor: c.orangeLight },
  chipText: { fontSize: 13, fontWeight: '600', color: c.text2 },
});

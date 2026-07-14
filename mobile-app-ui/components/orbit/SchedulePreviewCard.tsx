import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { OrbitMsg } from './orbitTypes';

interface Props {
  message: OrbitMsg;
  theme: any;
}

export default function SchedulePreviewCard({ message, theme }: Props) {
  const router = useRouter();
  const meta = message.metadata_json || {};
  const taskCount: number = meta.task_count || 0;
  const hoursPlanned: number = meta.hours_planned || 0;
  const focusBlocks: number = meta.focus_blocks || 0;
  
  // Dummy timeline if none exists, or parse from meta
  const tasks = meta.tasks || [];

  return (
    <View style={styles.wrapper}>
      <View style={[styles.orbitAvatar, { backgroundColor: theme.orange + '22', borderColor: theme.orange + '44' }]}>
        <Text style={{ fontSize: 14, color: theme.orange }}>✦</Text>
      </View>
      <View style={{ flex: 1, maxWidth: '90%' }}>
        
        {/* Intro bubble before the card */}
        <View style={[styles.orbitBubble, { backgroundColor: theme.cardBg, borderColor: theme.border, marginBottom: 12 }]}>
          <Text style={[styles.orbitText, { color: theme.text }]}>
            {message.content || 'Your schedule is ready.'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <Text style={{ fontSize: 16 }}>✦</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Today's Schedule Ready</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: theme.text }]}>{taskCount}</Text>
              <Text style={[styles.statLabel, { color: theme.text3 }]}>Tasks</Text>
            </View>
            <View style={[styles.statCol, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.border }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>{hoursPlanned}h</Text>
              <Text style={[styles.statLabel, { color: theme.text3 }]}>Planned</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: theme.text }]}>{focusBlocks}</Text>
              <Text style={[styles.statLabel, { color: theme.text3 }]}>Focus Blocks</Text>
            </View>
          </View>

          {tasks.length > 0 && (
            <View style={styles.timelineWrap}>
              <Text style={[styles.timelineTitle, { color: theme.text3 }]}>Mini Timeline:</Text>
              {tasks.slice(0, 4).map((t: any, i: number) => (
                <View key={i} style={styles.timelineItem}>
                  <Text style={[styles.timelineTime, { color: theme.orange }]}>{t.time || '10:00 AM'}</Text>
                  <Text style={[styles.timelineText, { color: theme.text }]} numberOfLines={1}>
                    {t.title || t.task_title || 'Task'}
                  </Text>
                </View>
              ))}
              {tasks.length > 4 && (
                <Text style={[styles.timelineText, { color: theme.text3, marginLeft: 65, marginTop: 4 }]}>
                  + {tasks.length - 4} more
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/routines')}
            activeOpacity={0.8}
            style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.btnText, { color: theme.text }]}>View Full Routine</Text>
            <Feather name="arrow-right" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 14,
  },
  orbitAvatar: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
    marginBottom: 4,
  },
  orbitBubble: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    padding: 14,
  },
  orbitText: {
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  timelineWrap: {
    padding: 16,
    paddingTop: 0,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  timelineTime: {
    fontSize: 13,
    fontWeight: '600',
    width: 65,
  },
  timelineText: {
    fontSize: 13,
    flex: 1,
  },
  btn: {
    margin: 12,
    marginTop: 0,
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    fontWeight: '600',
    fontSize: 14,
  }
});

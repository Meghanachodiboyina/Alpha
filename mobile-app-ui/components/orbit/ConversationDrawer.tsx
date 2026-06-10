import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  Animated, StyleSheet, Pressable, Alert, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface ConversationSummary {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  visible: boolean;
  conversations: ConversationSummary[];
  activeId: number | null;
  theme: any;
  onClose: () => void;
  onSelect: (id: number) => void;
  onNew: () => void;
  onRename: (id: number, newTitle: string) => void;
  onDelete: (id: number) => void;
}

export default function ConversationDrawer({
  visible, conversations, activeId, theme,
  onClose, onSelect, onNew, onRename, onDelete,
}: Props) {
  const slideAnim = useRef(new Animated.Value(-320)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 20, tension: 180 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: -320, useNativeDriver: true, friction: 20 }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleRenameConfirm = (id: number) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDeletePress = (id: number, title: string) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(id) },
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: overlayAnim }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          { backgroundColor: theme.bg2 || '#0d0d1a', borderRightColor: theme.border },
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Drawer Header */}
        <View style={[styles.drawerHeader, { borderBottomColor: theme.border }]}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Conversations</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color={theme.text2} />
          </TouchableOpacity>
        </View>

        {/* New Chat Button */}
        <TouchableOpacity
          onPress={() => { onNew(); onClose(); }}
          activeOpacity={0.7}
          style={[styles.newChatBtn, { backgroundColor: theme.orange + '22', borderColor: theme.orange + '55' }]}
        >
          <Feather name="plus" size={16} color={theme.orange} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.orange }}>New Conversation</Text>
        </TouchableOpacity>

        {/* Conversation List */}
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isActive = item.id === activeId;
            const isEditing = editingId === item.id;

            return (
              <View
                style={[
                  styles.convoItem,
                  isActive && { backgroundColor: theme.orange + '15', borderColor: theme.orange + '44' },
                  { borderColor: 'transparent', borderWidth: 1 },
                ]}
              >
                {isEditing ? (
                  <TextInput
                    style={[styles.renameInput, { color: theme.text, borderColor: theme.orange }]}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    autoFocus
                    onSubmitEditing={() => handleRenameConfirm(item.id)}
                    onBlur={() => handleRenameConfirm(item.id)}
                    returnKeyType="done"
                  />
                ) : (
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => { onSelect(item.id); onClose(); }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{ fontSize: 13, fontWeight: '500', color: isActive ? theme.orange : theme.text, lineHeight: 18 }}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.text3, marginTop: 2 }}>
                      {new Date(item.updated_at).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Action buttons */}
                {!isEditing && (
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity
                      onPress={() => { setEditingId(item.id); setEditTitle(item.title); }}
                      style={styles.actionBtn}
                    >
                      <Feather name="edit-2" size={13} color={theme.text3} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeletePress(item.id, item.title)}
                      style={styles.actionBtn}
                    >
                      <Feather name="trash-2" size={13} color={theme.red || '#ef4444'} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ fontSize: 13, color: theme.text3 }}>No conversations yet.</Text>
              <Text style={{ fontSize: 12, color: theme.text3, marginTop: 4 }}>Start chatting with Orbit!</Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: 300,
    borderRightWidth: 1,
    paddingTop: 60,
    zIndex: 999,
  },
  drawerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  newChatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 12,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  convoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    marginHorizontal: 8, borderRadius: 10,
    marginBottom: 2,
  },
  renameInput: {
    flex: 1, fontSize: 13, borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  actionBtn: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
});

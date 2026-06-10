import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
  AppState, AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import api, { API_BASE_URL } from '../../lib/api';
import { supabase } from '@/lib/supabase';
import { ClickUpStyleLoader, FadeInView } from '../../components/PremiumLoader';
import OrbitMessageBubble, { TypingIndicator, OrbitMsg } from '../../components/orbit/OrbitMessageBubble';
import ConversationDrawer, { ConversationSummary } from '../../components/orbit/ConversationDrawer';

const RECOVERY_CHECKED_KEY = 'orbit_recovery_checked_date';

export default function AiPlannerScreen() {
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) return <ClickUpStyleLoader />;
  return <FadeInView><OrbitChat theme={theme} /></FadeInView>;
}

function OrbitChat({ theme }: { theme: any }) {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // ─── State ────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<OrbitMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  // Pending clarifications state (for follow-up responses)
  const [pendingClarificationMsg, setPendingClarificationMsg] = useState<string | null>(null);

  // Animations for initial state → chat transition
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const [hasStarted, setHasStarted] = useState(false);

  // ─── Load conversations on mount ─────────────────────────────────────────
  useEffect(() => {
    loadConversations();
    checkIncompleteTasksOnce();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await api.get('/orbit/conversations');
      setConversations(data);
    } catch (e) {
      // silently fail — user can still use Orbit
    }
  };

  // ─── Once-per-day incomplete task check ──────────────────────────────────
  const checkIncompleteTasksOnce = async () => {
    const today = new Date().toDateString();
    const lastChecked = await AsyncStorage.getItem(RECOVERY_CHECKED_KEY);
    if (lastChecked === today) return;

    try {
      const data = await api.get('/orbit/incomplete-tasks');
      await AsyncStorage.setItem(RECOVERY_CHECKED_KEY, today);
      if (data.has_incomplete && data.tasks.length > 0) {
        // Inject recovery prompt as first message
        const recoveryMsg: OrbitMsg = {
          id: 'recovery-' + Date.now(),
          role: 'orbit',
          content: `You didn't complete ${data.tasks.length} task${data.tasks.length > 1 ? 's' : ''} yesterday. What would you like to do?`,
          message_type: 'task_recovery_prompt',
          metadata_json: { tasks: data.tasks },
        };
        setMessages([recoveryMsg]);
        // If we show recovery, mark as started so chat UI shows
        transitionToChat();
      }
    } catch (e) {
      // silently fail
    }
  };

  // ─── Header fade-out transition ───────────────────────────────────────────
  const transitionToChat = useCallback(() => {
    if (hasStarted) return;
    setHasStarted(true);
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(headerTranslateY, { toValue: -40, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [hasStarted]);

  // ─── Load a specific conversation ─────────────────────────────────────────
  const loadConversation = async (id: number) => {
    try {
      const data = await api.get(`/orbit/conversations/${id}`);
      setActiveConversationId(id);
      const msgs: OrbitMsg[] = (data.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        message_type: m.message_type,
        metadata_json: m.metadata_json,
        created_at: m.created_at,
      }));
      setMessages(msgs);
      if (msgs.length > 0) transitionToChat();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) {
      setError('Failed to load conversation.');
    }
  };

  // ─── New conversation ─────────────────────────────────────────────────────
  const startNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setHasStarted(false);
    headerOpacity.setValue(1);
    headerTranslateY.setValue(0);
    setInputText('');
    setError('');
  };

  // ─── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async (text?: string, clarifications?: Record<string, string>, originalMsg?: string) => {
    const userText = (text || inputText).trim();
    if (!userText) return;

    // Add user bubble immediately
    const localUserMsg: OrbitMsg = {
      id: 'local-' + Date.now(),
      role: 'user',
      content: userText,
      message_type: 'user_message',
    };
    setMessages(prev => [...prev, localUserMsg]);
    setInputText('');
    setError('');
    transitionToChat();

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    setIsTyping(true);

    try {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, -1);

      const payload: any = {
        conversation_id: activeConversationId,
        user_message: userText,
        plan_scope: 'today',
        current_time: localISO,
      };

      if (clarifications) {
        payload.is_clarification_response = true;
        payload.clarifications = clarifications;
      }

      const response = await api.post('/orbit/chat', payload);

      setIsTyping(false);

      const newMsgs: OrbitMsg[] = (response.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        message_type: m.message_type,
        metadata_json: m.metadata_json,
        created_at: m.created_at,
      }));

      // Update conversation ID if new
      if (response.conversation_id && !activeConversationId) {
        setActiveConversationId(response.conversation_id);
        loadConversations(); // refresh sidebar list
      }

      // Replace the local user msg with server-persisted messages
      setMessages(prev => {
        const withoutLocal = prev.filter(m => m.id !== localUserMsg.id);
        return [...withoutLocal, ...newMsgs];
      });

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (e: any) {
      setIsTyping(false);
      const errMsg: OrbitMsg = {
        id: 'err-' + Date.now(),
        role: 'orbit',
        content: e.message || 'Something went wrong. Please try again.',
        message_type: 'orbit_message',
      };
      setMessages(prev => {
        const withoutLocal = prev.filter(m => m.id !== localUserMsg.id);
        return [...withoutLocal, errMsg];
      });
    }
  };

  // ─── Clarification answer handler ──────────────────────────────────────────
  const handleClarificationAnswer = (clarifications: Record<string, string>, originalContent: string) => {
    sendMessage(pendingClarificationMsg || originalContent, clarifications);
    setPendingClarificationMsg(null);
  };

  // ─── Recovery action handler ───────────────────────────────────────────────
  const handleRecoveryAction = async (action: 'today' | 'weekend' | 'dismiss', tasks: any[]) => {
    const taskNames = tasks.slice(0, 5).map((t: any) => t.task_title).join(', ');
    if (action === 'dismiss') {
      const dismissMsg: OrbitMsg = {
        id: 'dismiss-' + Date.now(),
        role: 'orbit',
        content: "Got it! I've cleared those tasks. Let me know what you'd like to plan next.",
        message_type: 'orbit_message',
      };
      setMessages(prev => [...prev, dismissMsg]);
      return;
    }

    const when = action === 'today' ? "today" : "this weekend";
    const replanText = `Reschedule these unfinished tasks for ${when}: ${taskNames}`;
    sendMessage(replanText);
  };

  // ─── Voice recording ─────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, interruptionMode: 'doNotMix' });
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) { setError('Microphone permission not granted'); return; }
      await recorder.prepareToRecordAsync();
      await recorder.record();
      setIsRecording(true);
      setError('');
    } catch (err: any) {
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = async () => {
    try {
      if (!isRecording) return;
      await recorder.stop();
      setIsRecording(false);
      const uri = recorder.uri;
      if (uri) await uploadAudio(uri);
    } catch (err: any) {
      setError('Failed to stop recording: ' + err.message);
    }
  };

  const uploadAudio = async (uri: string) => {
    setIsTyping(true);
    try {
      const formData = new FormData();
      formData.append('audio', { uri, name: 'voice.m4a', type: 'audio/m4a' } as any);
      const xhr = new XMLHttpRequest();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      xhr.open('POST', `${API_BASE_URL}/transcribe-audio`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onload = () => {
        setIsTyping(false);
        if (xhr.status === 200) {
          const responseData = JSON.parse(xhr.responseText);
          if (responseData.text) {
            // Send transcript directly as a message
            sendMessage(responseData.text);
          }
        } else {
          setError('Failed to transcribe. Please try again.');
        }
      };
      xhr.onerror = () => { setIsTyping(false); setError('Network error during transcription.'); };
      xhr.send(formData);
    } catch (err: any) {
      setIsTyping(false);
      setError('Failed to transcribe audio: ' + err.message);
    }
  };

  // ─── Conversation management ───────────────────────────────────────────────
  const handleRenameConversation = async (id: number, newTitle: string) => {
    try {
      await api.patch(`/orbit/conversations/${id}`, { title: newTitle });
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
    } catch { setError('Failed to rename.'); }
  };

  const handleDeleteConversation = async (id: number) => {
    try {
      await api.delete(`/orbit/conversations/${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) startNewConversation();
    } catch { setError('Failed to delete.'); }
  };

  // ─── Suggestion chips (initial state) ────────────────────────────────────
  const suggestions = [
    '📚 Study SQL, gym at 6 PM, buy groceries',
    '🧘 Morning meditation, team standup 10 AM, deep work',
    '🏃 Wake 6 AM, jog, office by 9, finish project by 5',
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: '#050505' }]} edges={['top']}>
      {/* Top Nav */}
      <View style={s.topNav}>
        <TouchableOpacity style={s.navBtn} onPress={() => setDrawerOpen(true)}>
          <Feather name="clock" size={18} color={theme.text} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>Orbit</Text>
          <Text style={{ fontSize: 13, color: theme.orange }}>✦</Text>
        </View>

        <TouchableOpacity style={s.navBtn} onPress={startNewConversation}>
          <Feather name="plus-square" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Initial Hero State */}
        {!hasStarted && (
          <Animated.View
            style={[
              s.heroContainer,
              { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] },
            ]}
            pointerEvents={hasStarted ? 'none' : 'auto'}
          >
            <Text style={s.orbitTitle}>
              Orbit <Text style={{ color: theme.orange }}>✦</Text>
            </Text>
            <Text style={s.orbitSubtitle}>
              Your AI planner for a better, balanced day.
            </Text>

            {/* Suggestion chips */}
            <View style={{ marginTop: 28, width: '100%', gap: 10 }}>
              {suggestions.map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.suggestionChip, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                  onPress={() => sendMessage(sug.replace(/^[^\s]+\s/, ''))}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, color: theme.text2, lineHeight: 18 }}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Chat Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[s.messageList, !hasStarted && { opacity: 0 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <OrbitMessageBubble
              message={item}
              theme={theme}
              onClarificationAnswer={(answers, _) => {
                // Track which message was the user's original prompt
                const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                setPendingClarificationMsg(lastUserMsg?.content || null);
                handleClarificationAnswer(answers, item.content);
              }}
              onRecoveryAction={handleRecoveryAction}
            />
          )}
          ListFooterComponent={isTyping ? <TypingIndicator theme={theme} /> : null}
        />

        {/* Error */}
        {error ? (
          <View style={s.errorBanner}>
            <Text style={{ fontSize: 12, color: '#ef4444' }}>{error}</Text>
            <TouchableOpacity onPress={() => setError('')}>
              <Feather name="x" size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Input Bar */}
        <View style={[s.inputBar, { backgroundColor: '#0a0a0f', borderColor: '#3b2f4a' }]}>
          <TouchableOpacity
            style={[s.micBtn, isRecording && { backgroundColor: 'rgba(239,68,68,0.15)' }]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={16}
              color={isRecording ? '#ef4444' : theme.text}
            />
          </TouchableOpacity>

          <TextInput
            style={[s.textInput, { color: theme.text }]}
            placeholder={isRecording ? 'Listening...' : 'Tell me what you need to do...'}
            placeholderTextColor={isRecording ? theme.orange : theme.text3}
            multiline
            maxLength={2000}
            value={inputText}
            onChangeText={setInputText}
            editable={!isRecording}
          />

          <TouchableOpacity
            style={[
              s.sendBtn,
              { backgroundColor: theme.orange },
              (!inputText.trim() || isTyping) && { opacity: 0.4 },
            ]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isTyping}
            activeOpacity={0.8}
          >
            <Feather name="arrow-up" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Conversation Drawer */}
      <ConversationDrawer
        visible={drawerOpen}
        conversations={conversations}
        activeId={activeConversationId}
        theme={theme}
        onClose={() => setDrawerOpen(false)}
        onSelect={loadConversation}
        onNew={() => { startNewConversation(); }}
        onRename={handleRenameConversation}
        onDelete={handleDeleteConversation}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  topNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },

  heroContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 80,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  orbitTitle: {
    fontSize: 44, fontWeight: '800', color: '#fff',
    letterSpacing: -2, marginBottom: 8,
  },
  orbitSubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', lineHeight: 20,
  },
  suggestionChip: {
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 14,
  },

  messageList: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexGrow: 1,
  },

  errorBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 6,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    marginHorizontal: 12, marginBottom: 12,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
    borderRadius: 24, borderWidth: 1,
  },
  micBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  textInput: {
    flex: 1, fontSize: 14, lineHeight: 20,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
});

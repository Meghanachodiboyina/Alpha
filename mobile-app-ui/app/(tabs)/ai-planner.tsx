import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
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
import { OrbitMsg } from '../../components/orbit/orbitTypes';
import OrbitChat from '../../components/orbit/OrbitChat';
import OrbitLanding from '../../components/orbit/OrbitLanding';
import ConversationDrawer, { ConversationSummary } from '../../components/orbit/ConversationDrawer';
import { useOrbitStore } from '../../store/orbitStore';

const RECOVERY_CHECKED_KEY = 'orbit_recovery_checked_date';

type AppState = 'welcome' | 'input_focus' | 'chat';

export default function AiPlannerScreen() {
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) return <ClickUpStyleLoader />;
  return <FadeInView><OrbitChatScreen theme={theme} /></FadeInView>;
}

function OrbitChatScreen({ theme }: { theme: any }) {
  const router = useRouter();
  const flatListRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // ─── State ────────────────────────────────────────────────────────────────
  const store = useOrbitStore();
  const messages = store.messages;
  const setMessages = store.setMessages;
  const activeConversationId = store.conversationId;
  const setActiveConversationId = store.setConversationId;
  const isTyping = store.isThinking;
  const setIsTyping = store.setIsThinking;

  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Pending clarifications state


  // UI State mapping
  let appState: AppState = 'welcome';
  if (messages.length > 0 || isTyping) {
    appState = 'chat';
  } else if (isInputFocused) {
    appState = 'input_focus';
  }

  // ─── Load conversations on mount ─────────────────────────────────────────
  useEffect(() => {
    loadConversations();
    checkIncompleteTasksOnce();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await api.get('/orbit/conversations');
      setConversations(data);
    } catch (e) {}
  };

  const checkIncompleteTasksOnce = async () => {
    const today = new Date().toDateString();
    const lastChecked = await AsyncStorage.getItem(RECOVERY_CHECKED_KEY);
    if (lastChecked === today) return;

    try {
      const data = await api.get('/orbit/incomplete-tasks');
      await AsyncStorage.setItem(RECOVERY_CHECKED_KEY, today);
      if (data.has_incomplete && data.tasks.length > 0) {
        const recoveryMsg: OrbitMsg = {
          id: 'recovery-' + Date.now(),
          role: 'orbit',
          content: `You didn't complete ${data.tasks.length} task${data.tasks.length > 1 ? 's' : ''} yesterday. What would you like to do?`,
          message_type: 'task_recovery_prompt',
          metadata_json: { tasks: data.tasks },
        };
        setMessages([recoveryMsg]);
      }
    } catch (e) {}
  };

  // ─── Load a specific conversation ─────────────────────────────────────────
  const loadConversation = async (id: number) => {
    try {
      const data = await api.get(`/orbit/conversations/${id}`);
      setActiveConversationId(id);
      const msgs: OrbitMsg[] = (data.messages || []).map((m: any) => ({
        ...m,
      }));
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) {
      setError('Failed to load conversation.');
    }
  };

  // ─── New conversation ─────────────────────────────────────────────────────
  const startNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputText('');
    setError('');
  };

  // ─── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async (text?: string) => {
    const userText = (text || inputText).trim();
    if (!userText) return;

    const localUserMsg: OrbitMsg = {
      id: 'local-' + Date.now(),
      role: 'user',
      content: userText,
      message_type: 'user_message',
    };
    if (userText) {
      setMessages([...messages, localUserMsg]);
    }
    setInputText('');
    setError('');

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    setIsTyping(true);
    store.setStatus('GENERATING');

    try {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, -1);

      let enrichedPayloadText = userText;
      if (!activeConversationId) {
        const recoveryMsg = messages.find((m) => m.message_type === 'task_recovery_prompt');
        if (recoveryMsg?.metadata_json?.tasks) {
          const taskTitles = recoveryMsg.metadata_json.tasks.map((t: any) => t.task_title).join(', ');
          enrichedPayloadText = `${userText}\n\n[System Context: Uncompleted tasks from yesterday: ${taskTitles}. Include these if the user agrees.]`;
        }
      }


      const payload: any = {
        conversation_id: activeConversationId,
        user_message: enrichedPayloadText,
        plan_scope: 'today',
        current_time: localISO,
        is_clarification_response: store.status === 'WAITING_FOR_CLARIFICATION'
      };

      const response = await api.post('/orbit/chat', payload);

      setIsTyping(false);
      if (response.status) {
        store.setStatus(response.status);
      } else {
        store.setStatus('COMPLETE');
      }

      const newMsgs: OrbitMsg[] = (response.messages || []).map((m: any) => ({
        ...m,
      }));

      if (response.conversation_id && !activeConversationId) {
        setActiveConversationId(response.conversation_id);
        loadConversations();
      }

      if (userText) {
        setMessages([...messages.filter(m => m.id !== localUserMsg.id), ...newMsgs]);
      } else {
        setMessages([...messages, ...newMsgs]);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (e: any) {
      setIsTyping(false);
      store.setStatus('ERROR');
      const errMsg: OrbitMsg = {
        id: 'err-' + Date.now(),
        role: 'orbit',
        content: e.message || 'Something went wrong. Please try again.',
        message_type: 'orbit_message',
      };
      if (userText) {
         setMessages([...messages.filter(m => m.id !== localUserMsg.id), errMsg]);
      } else {
         setMessages([...messages, errMsg]);
      }
    }
  };



  const handleRecoveryAction = async (action: 'today' | 'weekend' | 'dismiss', tasks: any[]) => {
    const taskNames = tasks.slice(0, 5).map((t: any) => t.task_title).join(', ');
    if (action === 'dismiss') {
      const dismissMsg: OrbitMsg = {
        id: 'dismiss-' + Date.now(),
        role: 'orbit',
        content: "Got it! I've cleared those tasks. Let me know what you'd like to plan next.",
        message_type: 'orbit_message',
      };
      setMessages([...messages, dismissMsg] as any);
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
          if (responseData.text) sendMessage(responseData.text);
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: '#050505' }]} edges={['top']}>
      
      {/* Top Header */}
      {appState !== 'input_focus' && (
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
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {appState === 'chat' ? (
          <OrbitChat
            messages={messages}
            theme={theme}
            flatListRef={flatListRef}
            status={store.status}
            isThinking={store.isThinking}
            onRecoveryAction={handleRecoveryAction}
          />
        ) : (
          <OrbitLanding
            theme={theme}
            isInputFocused={appState === 'input_focus'}
            onSuggestionPress={(text) => {
              setInputText(text);
              setTimeout(() => {
                inputRef.current?.focus();
              }, 50);
            }}
          />
        )}

        {/* Error Banner */}
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
            ref={inputRef}
            style={[s.textInput, { color: theme.text }]}
            placeholder={isRecording ? 'Listening...' : 'Tell me what you need to do...'}
            placeholderTextColor={isRecording ? theme.orange : theme.text3}
            multiline
            maxLength={2000}
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
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
        onNew={() => { startNewConversation(); setDrawerOpen(false); }}
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
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
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

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api, { API_BASE_URL } from '../../lib/api';
import { Radius, FontSize } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ClickUpStyleLoader, FadeInView } from '../../components/PremiumLoader';
import { supabase } from '@/lib/supabase';

type ClarificationOption = {
  value: string;
  label: string;
  emoji?: string;
};

type ClarificationQuestion = {
  id: string;
  question: string;
  type: string;
  options: ClarificationOption[];
  task_title?: string;
  default_value?: string;
};

type AnalysisResponse = {
  needs_clarification: boolean;
  clarifications: ClarificationQuestion[];
  result?: {
    summary: string;
    productivity_tips: string[];
    routines: any[];
  };
};

export default function AiPlannerScreen() {
  const { theme } = useTheme();
  const s = getStyles(theme);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <ClickUpStyleLoader />;
  }

  return (
    <FadeInView>
      <AiPlannerContent theme={theme} s={s} />
    </FadeInView>
  );
}

// --- Clarification Card Component ---
function ClarificationCard({
  question,
  selectedValue,
  onSelect,
  theme,
}: {
  question: ClarificationQuestion;
  selectedValue: string | null;
  onSelect: (questionId: string, value: string) => void;
  theme: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        backgroundColor: theme.cardBg,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: Radius.md,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {question.task_title ? (
        <Text style={{ fontSize: 11, color: theme.text3, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {question.task_title}
        </Text>
      ) : null}
      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 14, lineHeight: 20 }}>
        {question.question}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {question.options.map((opt) => {
          const isSelected = selectedValue === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onSelect(question.id, opt.value)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: Radius.sm,
                borderWidth: 1.5,
                backgroundColor: isSelected ? theme.orangeLight : theme.surface,
                borderColor: isSelected ? theme.orange : theme.border,
              }}
            >
              {opt.emoji ? (
                <Text style={{ fontSize: 14 }}>{opt.emoji}</Text>
              ) : null}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? theme.orange : theme.text2,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

// --- Main AI Planner Content ---
function AiPlannerContent({ theme, s }: { theme: any, s: any }) {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [inputText, setInputText] = useState(params.prompt ? String(params.prompt) : '');
  const [planScope, setPlanScope] = useState<'today' | 'week'>('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Clarification state
  const [clarifications, setClarifications] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [showClarifications, setShowClarifications] = useState(false);
  const [originalInput, setOriginalInput] = useState('');

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    if (params.prompt && typeof params.prompt === 'string') {
      setInputText(params.prompt);
    }
  }, [params.prompt]);

  // Phase 1: Analyze the request
  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError('Please describe your tasks or goals.');
      return;
    }
    setLoading(true);
    setError('');
    setShowClarifications(false);
    setClarifications([]);
    setClarificationAnswers({});

    try {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, -1);

      const data: AnalysisResponse = await api.post('/ai/analyze', {
        input_text: inputText,
        plan_scope: planScope,
        current_time: localISO,
      });

      if (data.needs_clarification && data.clarifications.length > 0) {
        // Show clarification questions
        setClarifications(data.clarifications);
        setOriginalInput(inputText);
        setShowClarifications(true);

        // Pre-fill default answers
        const defaults: Record<string, string> = {};
        data.clarifications.forEach((q) => {
          if (q.default_value) {
            defaults[q.id] = q.default_value;
          }
        });
        setClarificationAnswers(defaults);
        setLoading(false);
      } else {
        // No clarification needed — routines already saved by backend
        setInputText('');
        setLoading(false);
        Alert.alert(
          'Success',
          'Your routines have been successfully generated and added to your planner!',
          [
            { text: 'View Routines', onPress: () => router.navigate('/(tabs)/routines') },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze your request. Please try again.');
      setLoading(false);
    }
  };

  // Phase 2: Generate with clarification answers
  const handleGenerateWithClarifications = async () => {
    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, -1);

      await api.post('/ai/generate-with-clarifications', {
        input_text: originalInput,
        plan_scope: planScope,
        current_time: localISO,
        clarifications: clarificationAnswers,
      });

      setInputText('');
      setShowClarifications(false);
      setClarifications([]);
      setClarificationAnswers({});
      setLoading(false);

      Alert.alert(
        'Success',
        'Your personalized routines have been generated!',
        [
          { text: 'View Routines', onPress: () => router.navigate('/(tabs)/routines') },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to generate routine. Please try again.');
      setLoading(false);
    }
  };

  // Skip clarifications — generate with AI defaults
  const handleSkipClarifications = async () => {
    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, -1);

      await api.post('/generate-routine', {
        input_text: originalInput,
        plan_scope: planScope,
        current_time: localISO,
      });

      setInputText('');
      setShowClarifications(false);
      setClarifications([]);
      setClarificationAnswers({});
      setLoading(false);

      Alert.alert(
        'Success',
        'Routines generated with AI defaults!',
        [
          { text: 'View Routines', onPress: () => router.navigate('/(tabs)/routines') },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to generate routine. Please try again.');
      setLoading(false);
    }
  };

  const handleClarificationSelect = (questionId: string, value: string) => {
    setClarificationAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const startRecording = async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });

      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setError('Microphone permission not granted');
        return;
      }
      
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
      if (uri) {
        await uploadAudio(uri);
      }
    } catch (err: any) {
      setError('Failed to stop recording: ' + err.message);
    }
  };

  const uploadAudio = async (uri: string) => {
    setLoading(true);
    setError('');
    try {
      const ext = 'm4a';
      const filename = `voice.${ext}`;
      const type = `audio/${ext}`;
      
      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: filename,
        type,
      } as any);

      const xhr = new XMLHttpRequest();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      xhr.open('POST', `${API_BASE_URL}/transcribe-audio`);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        setLoading(false);
        if (xhr.status === 200) {
          try {
            const responseData = JSON.parse(xhr.responseText);
            if (responseData.text) {
              setInputText(prev => prev ? `${prev} ${responseData.text}` : responseData.text);
            }
          } catch {
            setError('Failed to parse transcription response.');
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText || '{}');
            setError(`Failed to transcribe audio: ${errorData.detail || 'Request failed'}`);
          } catch {
            setError(`Failed to transcribe audio (Status ${xhr.status})`);
          }
        }
      };

      xhr.onerror = () => {
        setLoading(false);
        setError('Failed to transcribe audio: Network request failed');
      };

      xhr.send(formData);
    } catch (err: any) {
      setLoading(false);
      const errMsg = err.message || 'Please try again.';
      setError(`Failed to transcribe audio: ${errMsg}`);
    }
  };

  const suggestions = [
    'Study Python for 2 hours, gym at 5 PM, dinner at 7 PM',
    'Morning meditation, team standup at 10, deep work 11-1, lunch, review PRs',
    'Wake up 6 AM, jog, breakfast, office by 9, project work till 5',
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top Navbar */}
      <View style={[s.topNav, { justifyContent: 'flex-end' }]}>
        <TouchableOpacity style={s.navIconBtn}>
          <Feather name="clock" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {showClarifications ? (
            <View style={{ flex: 1, marginTop: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <View style={s.chatBubble}>
                  <Text style={{ fontSize: 14 }}>💬</Text>
                </View>
                <Text style={s.chatBubbleTitle}>
                  Quick question{clarifications.length > 1 ? 's' : ''}
                </Text>
              </View>

              {clarifications.map((q) => (
                <ClarificationCard
                  key={q.id}
                  question={q}
                  selectedValue={clarificationAnswers[q.id] || null}
                  onSelect={handleClarificationSelect}
                  theme={theme}
                />
              ))}

              <TouchableOpacity
                style={[s.generateBtnLarge, loading && { opacity: 0.7 }]}
                onPress={handleGenerateWithClarifications}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.generateTextLarge}>✦ Generate with my preferences</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSkipClarifications} style={s.skipBtn}>
                <Text style={s.skipBtnText}>Skip — use AI defaults</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.emptyStateCentered}>
              <Text style={s.orbitTitle}>
                Orbit <Text style={{ color: theme.orange }}>✦</Text>
              </Text>
              <Text style={s.orbitSubtitle}>
                Your AI planner for a better, balanced day.
              </Text>

              {/* Error Box */}
              {error ? (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Bottom Input Area */}
          <View style={s.inputWrap}>
            <TextInput
              style={s.textArea}
              placeholder={isRecording ? "Listening to your voice..." : "Tell me what you need to do..."}
              placeholderTextColor={isRecording ? theme.orange : theme.text3}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={inputText}
              onChangeText={setInputText}
              editable={!showClarifications}
            />
            <View style={s.inputBottomRow}>
              {/* Mic on Left */}
              <TouchableOpacity 
                style={[s.micBtn, isRecording && s.micBtnRecording]} 
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Ionicons 
                  name={isRecording ? "stop" : "mic"} 
                  size={16} 
                  color={isRecording ? theme.red : theme.text} 
                />
              </TouchableOpacity>

              {/* Plan my day button on Right */}
              {!showClarifications && (
                <TouchableOpacity
                  style={[s.planBtn, (!inputText.trim() && !loading) && { opacity: 0.5 }]}
                  onPress={handleGenerate}
                  disabled={loading || !inputText.trim()}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.planBtnText}>Plan my day</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (c: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050505' },
  
  topNav: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10,
  },
  navIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },

  emptyStateCentered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingBottom: 40,
  },
  orbitTitle: {
    fontSize: 42, fontWeight: '700', color: '#fff',
    letterSpacing: -1.5, marginBottom: 8,
  },
  orbitSubtitle: {
    fontSize: 13, color: c.text3, fontWeight: '400',
  },

  inputWrap: {
    backgroundColor: '#0a0a0f',
    borderWidth: 1, borderColor: '#3b2f4a', // Dark purple-ish border
    borderRadius: 24, padding: 16,
    marginTop: 'auto', // pushes to bottom if content is small
  },
  textArea: {
    color: '#fff', fontSize: 14, lineHeight: 22,
    minHeight: 60, maxHeight: 120, paddingBottom: 10,
  },
  inputBottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8,
  },
  micBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnRecording: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  planBtn: {
    backgroundColor: c.orange,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20,
  },
  planBtnText: {
    color: '#fff', fontSize: 13, fontWeight: '600',
  },

  // Clarifications
  chatBubble: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: c.orangeLight,
    alignItems: 'center', justifyContent: 'center',
  },
  chatBubbleTitle: {
    fontSize: 14, fontWeight: '700', color: c.text, letterSpacing: -0.2,
  },
  generateBtnLarge: {
    backgroundColor: c.orange, borderRadius: Radius.sm,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
  },
  generateTextLarge: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  skipBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  skipBtnText: { fontSize: 13, color: c.text3, fontWeight: '500' },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)', borderRadius: Radius.sm,
    padding: 16, marginTop: 24, width: '100%',
  },
  errorText: { color: c.red, fontSize: FontSize.sm, fontWeight: '500', textAlign: 'center' },
});

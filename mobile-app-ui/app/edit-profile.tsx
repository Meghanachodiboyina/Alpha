import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Radius, FontSize } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const s = getStyles(theme);
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setName(user.user_metadata.full_name);
    } else if (user?.email) {
      setName(user.email.split('@')[0]);
    }
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updates: any = { data: { full_name: name.trim() } };

      const { error: supaError } = await supabase.auth.updateUser(updates);

      if (supaError) {
        throw supaError;
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Feather name="arrow-left" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={s.title}>Edit Profile</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Error */}
          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email (Read Only) */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Email Address</Text>
            <View style={[s.input, s.inputDisabled]}>
              <Text style={{ color: theme.text3 }}>{user?.email}</Text>
            </View>
            <Text style={s.helpText}>Email cannot be changed.</Text>
          </View>

          {/* Name */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Full Name</Text>
            <TextInput
              style={s.input}
              placeholder="Your Name"
              placeholderTextColor={theme.text3}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (c: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20, paddingVertical: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 32, marginTop: 10,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: c.text },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)', borderRadius: Radius.sm,
    padding: 16, marginBottom: 24,
  },
  errorText: { color: c.red, fontSize: FontSize.sm, fontWeight: '500' },
  fieldWrap: { marginBottom: 24 },
  label: {
    fontSize: FontSize.xs, fontWeight: '700', color: c.text3,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  input: {
    backgroundColor: c.bg3, borderWidth: 1, borderColor: c.border,
    borderRadius: Radius.sm, paddingHorizontal: 16, paddingVertical: 14,
    color: c.text, fontSize: FontSize.md,
  },
  inputDisabled: {
    backgroundColor: c.surface, borderColor: c.border, opacity: 0.7,
  },
  helpText: {
    fontSize: 12, color: c.text3, marginTop: 6, marginLeft: 4,
  },
  btn: {
    backgroundColor: c.orange, borderRadius: Radius.sm,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    marginTop: 16, marginBottom: 24,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16,
  },
  btnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});

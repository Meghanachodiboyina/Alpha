import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Radius, FontSize } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const s = getStyles(theme);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: supaError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'routinely://reset-password',
      });

      if (supaError) {
        throw supaError;
      }
      
      setSuccess(true);
      Alert.alert('Reset Link Sent', 'Check your email for the password reset link.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link. Please try again.');
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
          {/* Back button */}
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={s.backBtn}>
              <Text style={s.backBtnText}>← Back to Login</Text>
            </TouchableOpacity>
          </Link>

          {/* Title */}
          <Text style={s.title}>Reset Password</Text>
          <Text style={s.subtitle}>
            Enter your email address and we will send you a link to reset your password.
          </Text>

          {/* Error / Success */}
          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View style={s.successBox}>
              <Text style={s.successText}>Password reset link sent to your email.</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Email address</Text>
            <TextInput
              style={s.input}
              placeholder="name@company.com"
              placeholderTextColor={theme.text3}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={handleReset}
            disabled={loading || success}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>Send Reset Link</Text>
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
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 28, paddingVertical: 40,
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 10, marginBottom: 20 },
  backBtnText: { color: c.text2, fontSize: FontSize.md, fontWeight: '600' },
  title: {
    fontSize: FontSize.xxl, fontWeight: '700', color: c.text,
    letterSpacing: -0.5, marginBottom: 8,
  },
  subtitle: { fontSize: FontSize.md, color: c.text2, lineHeight: 22, marginBottom: 28 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)', borderRadius: Radius.sm,
    padding: 16, marginBottom: 24,
  },
  errorText: { color: c.red, fontSize: FontSize.sm, fontWeight: '500' },
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)', borderRadius: Radius.sm,
    padding: 16, marginBottom: 24,
  },
  successText: { color: c.green, fontSize: FontSize.sm, fontWeight: '500' },
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
  btn: {
    backgroundColor: c.orange, borderRadius: Radius.sm,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 24,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16,
  },
  btnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});

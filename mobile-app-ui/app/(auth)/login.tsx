import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Radius, FontSize } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';

export default function LoginScreen() {
  const { theme } = useTheme();
  const s = getStyles(theme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { error: supaError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (supaError) {
        throw supaError;
      }
      
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
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
          {/* Logo */}
          <View style={s.logoRow}>
            <View style={s.logoIcon}>
              <Text style={s.logoEmoji}>◆</Text>
            </View>
            <Text style={s.logoText}>Routinely</Text>
          </View>

          {/* Title */}
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>
            Log in to your workspace and pick up where you left off.
          </Text>

          {/* Error */}
          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
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

          {/* Password */}
          <View style={s.fieldWrap}>
            <View style={s.labelRow}>
              <Text style={s.label}>Password</Text>
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity>
                  <Text style={s.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </Link>
            </View>
            <View style={s.passwordWrap}>
              <TextInput
                style={[s.input, { paddingRight: 52 }]}
                placeholder="••••••••••"
                placeholderTextColor={theme.text3}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={theme.text3} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>Log in to Dashboard</Text>
            )}
          </TouchableOpacity>

          {/* Sign up link */}
          <View style={s.switchRow}>
            <Text style={s.switchText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={s.switchLink}>Sign up free</Text>
              </TouchableOpacity>
            </Link>
          </View>


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
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 36 },
  logoIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center',
    shadowColor: c.orange, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14,
  },
  logoEmoji: { color: '#fff', fontSize: 18, fontWeight: '700' },
  logoText: { fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
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
  fieldWrap: { marginBottom: 24 },
  label: {
    fontSize: FontSize.xs, fontWeight: '700', color: c.text3,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  forgotLink: {
    fontSize: FontSize.xs, color: c.orange, fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: c.bg3, borderWidth: 1, borderColor: c.border,
    borderRadius: Radius.sm, paddingHorizontal: 16, paddingVertical: 14,
    color: c.text, fontSize: FontSize.md,
  },
  passwordWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: 16, top: 0, bottom: 0,
    justifyContent: 'center',
  },
  btn: {
    backgroundColor: c.orange, borderRadius: Radius.sm,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 24,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16,
  },
  btnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 36 },
  switchText: { fontSize: FontSize.sm, color: c.text2 },
  switchLink: { fontSize: FontSize.sm, color: c.orange, fontWeight: '700' },
});

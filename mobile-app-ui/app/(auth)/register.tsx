import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Radius, FontSize } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';

export default function RegisterScreen() {
  const { theme } = useTheme();
  const s = getStyles(theme);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { error: supaError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (supaError) {
        throw supaError;
      }
      
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </Link>

          {/* Title */}
          <Text style={s.title}>Create your account</Text>
          <Text style={s.subtitle}>Join Routinely and take control of your time.</Text>

          {/* Error */}
          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Name */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Full Name</Text>
            <TextInput
              style={s.input}
              placeholder="Jane Doe"
              placeholderTextColor={theme.text3}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Email address</Text>
            <TextInput
              style={s.input}
              placeholder="name@company.com"
              placeholderTextColor={theme.text3}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••••"
              placeholderTextColor={theme.text3}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={s.switchRow}>
            <Text style={s.switchText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={s.switchLink}>Log in</Text>
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
  backBtn: { alignSelf: 'flex-start', paddingVertical: 10, marginBottom: 20 },
  backBtnText: { color: c.text2, fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: c.text, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: FontSize.md, color: c.text2, lineHeight: 22, marginBottom: 32 },
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
  btn: {
    backgroundColor: c.orange, borderRadius: Radius.sm,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 24,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16,
  },
  btnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontSize: FontSize.sm, color: c.text2 },
  switchLink: { fontSize: FontSize.sm, color: c.orange, fontWeight: '700' },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function ProfileScreen() {
  const { theme, isDarkMode, themeMode, setThemeMode } = useTheme();
  const { logout, resetOnboarding, user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This will permanently delete all your data and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/users/me');
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again later.');
            }
          },
        },
      ]
    );
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  
  const initials = displayName
    ? displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'R';

  const themeOptions: { label: string; value: 'light' | 'dark' | 'system'; icon: keyof typeof Feather.glyphMap }[] = [
    { label: 'Light', value: 'light', icon: 'sun' },
    { label: 'Dark', value: 'dark', icon: 'moon' },
    { label: 'System', value: 'system', icon: 'smartphone' },
  ];



  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 24 }}>
          <Text style={{
            fontSize: 22, fontWeight: '700', color: theme.text,
            letterSpacing: -0.4
          }}>
            Profile
          </Text>
          <TouchableOpacity 
            onPress={() => router.push('/edit-profile')}
            style={{
              paddingHorizontal: 14, paddingVertical: 8,
              backgroundColor: `${theme.orange}15`, borderRadius: 12,
            }}
          >
            <Text style={{ color: theme.orange, fontWeight: '600', fontSize: 14 }}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <View style={{
          backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border,
          borderRadius: 20, padding: 24, marginBottom: 20,
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.2 : 0.05, shadowRadius: 12,
          alignItems: 'center',
        }}>
          {/* Avatar */}
          <View style={{
            width: 72, height: 72, borderRadius: 22,
            backgroundColor: theme.orange,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
            shadowColor: theme.orange, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35, shadowRadius: 16,
          }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>{initials}</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
            {displayName}
          </Text>
          <Text style={{ fontSize: 13, color: theme.text3 }}>
            {user?.email || 'user@email.com'}
          </Text>
        </View>

        {/* Theme Selector */}
        <View style={{
          backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border,
          borderRadius: 16, padding: 16, marginBottom: 20,
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.2 : 0.05, shadowRadius: 12,
        }}>
          <Text style={{
            fontSize: 11, fontWeight: '700', color: theme.text3,
            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
          }}>
            Appearance
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {themeOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setThemeMode(opt.value)}
                activeOpacity={0.7}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: themeMode === opt.value ? theme.orangeLight : theme.surface,
                  borderWidth: 1,
                  borderColor: themeMode === opt.value ? theme.orange : theme.border,
                }}
              >
                <Feather
                  name={opt.icon}
                  size={14}
                  color={themeMode === opt.value ? theme.orange : theme.text3}
                />
                <Text style={{
                  fontSize: 12, fontWeight: '600',
                  color: themeMode === opt.value ? theme.orange : theme.text2,
                }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reset App Guide Option */}
        <View style={{
          backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border,
          borderRadius: 16, overflow: 'hidden', marginBottom: 20,
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.2 : 0.05, shadowRadius: 12,
        }}>
          <TouchableOpacity
            onPress={async () => {
              await resetOnboarding();
              Alert.alert('App Guide Reset', 'The onboarding walkthrough will be shown on next app restart.');
            }}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 14,
              paddingVertical: 16, paddingHorizontal: 18,
            }}
          >
            <View style={{
              width: 38, height: 38, borderRadius: 11,
              backgroundColor: `${theme.orange}15`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Feather name="help-circle" size={17} color={theme.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: theme.text }}>Reset App Guide</Text>
              <Text style={{ fontSize: 11.5, color: theme.text3, marginTop: 1 }}>Show onboarding tour on restart</Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.text3} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 16, borderRadius: 14,
            backgroundColor: theme.surface,
            borderWidth: 1, borderColor: theme.border,
            marginBottom: 12,
          }}
        >
          <Feather name="log-out" size={16} color={theme.text2} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text2 }}>Log Out</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 16, borderRadius: 14,
            backgroundColor: 'rgba(239,68,68,0.08)',
            borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
          }}
        >
          <Feather name="trash-2" size={16} color="#ef4444" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#ef4444' }}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

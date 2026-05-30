import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import { useFocusEffect } from 'expo-router';
import { WorkspaceSkeleton, FadeInView } from '../../components/PremiumLoader';
import { Feather } from '@expo/vector-icons';

export default function WorkspacePage() {
  const { theme, isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workspace/projects');
      setProjects(res);
    } catch {
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [])
  );

  const createProject = async () => {
    Alert.prompt(
      'New Project',
      'Enter new project name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async (name: string | undefined) => {
            if (!name || name.trim().length < 2) {
              Alert.alert('Error', 'Project name must be at least 2 characters long.');
              return;
            }
            try {
              const res = await api.post('/workspace/projects', { name: name.trim() });
              setProjects([...projects, res]);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to create project.');
            }
          },
        },
      ]
    );
  };

  const deleteProject = (id: number) => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/workspace/projects/${id}`);
              setProjects(projects.filter(p => p.id !== id));
            } catch {
              Alert.alert('Error', 'Cannot delete the default Team Space or this project.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <WorkspaceSkeleton />;
  }

  const cardW = '100%';

  return (
    <FadeInView>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 40 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 4 }}>Workspace</Text>
          <Text style={{ fontSize: 14, color: theme.text2 }}>Organize your workspace into focused projects.</Text>
        </View>

        {error ? (
          <View style={{ padding: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
            <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '500' }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'column', flexWrap: 'wrap', gap: 16 }}>
          {projects.map(project => (
            <View
              key={project.id}
              style={{
                width: cardW,
                backgroundColor: theme.cardBg,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 20,
                overflow: 'hidden',
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDarkMode ? 0.2 : 0.05, shadowRadius: 10,
              }}
            >
              {/* Color bar */}
              <View style={{ height: 4, backgroundColor: project.color || theme.orange }} />
              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View style={{
                    width: 48, height: 48, borderRadius: 14,
                    backgroundColor: `${project.color || theme.orange}18`,
                    borderWidth: 1, borderColor: `${project.color || theme.orange}30`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 24 }}>◈</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteProject(project.id)}
                    style={{
                      width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: theme.border,
                      backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Feather name="trash-2" size={15} color={theme.text3} />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontWeight: '700', fontSize: 17, color: theme.text, marginBottom: 6 }}>{project.name}</Text>
                {project.description ? (
                  <Text style={{ fontSize: 13, color: theme.text2, lineHeight: 18, marginBottom: 12 }} numberOfLines={2}>
                    {project.description}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="users" size={12} color={theme.text3} />
                  <Text style={{ fontSize: 11.5, color: theme.text3, fontWeight: '600' }}>Workspace project</Text>
                </View>
              </View>
            </View>
          ))}

          {/* Add new placeholder */}
          <TouchableOpacity
            onPress={createProject}
            style={{
              width: cardW,
              minHeight: 160,
              backgroundColor: theme.surface,
              borderWidth: 1, borderStyle: 'dashed', borderColor: theme.borderStrong,
              borderRadius: 20,
              padding: 24,
              alignItems: 'center', justifyContent: 'center',
              gap: 10,
            }}
          >
            <Feather name="plus" size={28} color={theme.text3} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text3 }}>Create New Project</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </SafeAreaView>
    </FadeInView>
  );
}

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  theme: typeof Colors.dark;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load saved preference
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('theme_preference');
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (e) {
        console.error("Failed to load theme preference", e);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('theme_preference', mode);
    } catch (e) {
      console.error("Failed to save theme preference", e);
    }
  };

  const isDarkMode = themeMode === 'system' 
    ? systemScheme === 'dark'
    : themeMode === 'dark';

  const theme = isDarkMode ? Colors.dark : Colors.light;

  const value = useMemo(() => ({
    themeMode,
    isDarkMode,
    theme,
    setThemeMode
  }), [themeMode, isDarkMode, theme]);

  if (!isReady) return null; // Avoid rendering flash before theme loads

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

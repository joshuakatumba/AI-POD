'use client';

import { createContext, useEffect, useMemo, useState, useContext } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export type ThemeMode = 'light' | 'dark' | 'system';
export const THEME_STORAGE_KEY = 'theme-mode';

interface ThemeModeContextProps {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeModeContext = createContext<ThemeModeContextProps>({
  mode: 'system',
  setMode: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>('light');

  // Load saved preference or system preference
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    requestAnimationFrame(() => {
      setMode(stored ?? 'system');
      setSystemMode(isDark ? 'dark' : 'light');
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemMode(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const changeMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  // Resolve actual mode (system -> dark/light)
  const resolvedMode = useMemo<'light' | 'dark'>(() => {
    return mode === 'system' ? systemMode : mode;
  }, [mode, systemMode]);

  // Sync Tailwind dark class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedMode === 'dark');
  }, [resolvedMode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode: resolvedMode },
      }),
    [resolvedMode]
  );

  return (
    <ThemeModeContext.Provider value={{ mode, setMode: changeMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

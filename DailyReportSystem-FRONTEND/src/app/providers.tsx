'use client';

import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark' | 'system';
export const THEME_STORAGE_KEY = 'theme-mode';

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
  }, []);

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

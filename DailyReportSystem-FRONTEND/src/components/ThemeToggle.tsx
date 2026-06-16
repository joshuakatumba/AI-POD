'use client';

import { IconButton, Tooltip } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from '@/app/providers';

type ThemeMode = 'light' | 'dark';

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode | null>(null);

  // Load saved preference or system preference
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Defer setState to avoid React cascading render warning
    requestAnimationFrame(() => {
      setMode(stored ?? (prefersDark ? 'dark' : 'light'));
    });
  }, []);

  const toggleMode = () => {
    if (!mode) return;

    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    window.location.reload(); // re-evaluate Providers
  };

  if (!mode) return null; // avoid hydration flash

  return (
    <Tooltip title={`Theme: ${mode}`}>
      <IconButton onClick={toggleMode} color="inherit">
        {mode === 'dark' ? <DarkMode /> : <LightMode />}
      </IconButton>
    </Tooltip>
  );
}

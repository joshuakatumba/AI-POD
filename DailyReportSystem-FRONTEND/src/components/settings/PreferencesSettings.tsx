'use client';

import React from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useThemeMode, ThemeMode } from '@/app/providers';
import { useTranslations } from 'next-intl';
import LanguageToggle from '@/components/LanguageToggle';

export default function PreferencesSettings() {
  const t = useTranslations('Settings.PreferencesSettings');
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();

  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: ThemeMode | null
  ) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  const cardSx = {
    p: { xs: 3, md: 4 },
    borderRadius: 4,
    bgcolor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.background.paper, 0.6) 
      : theme.palette.background.paper,
    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    backdropFilter: 'blur(12px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 8px 32px rgba(0,0,0,0.3)'
      : '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
    '&:hover': {
      borderColor: alpha(theme.palette.divider, 0.15),
      boxShadow: theme.palette.mode === 'dark'
        ? '0 8px 40px rgba(0,0,0,0.4)'
        : '0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08)',
    },
  };

  const themeOptions = [
    { 
      value: 'light', 
      label: t('themeLight'), 
      icon: <LightModeIcon />, 
      color: '#f59e0b',
      desc: 'Bright & clean',
    },
    { 
      value: 'dark', 
      label: t('themeDark'), 
      icon: <DarkModeIcon />, 
      color: '#6366f1',
      desc: 'Easy on the eyes',
    },
    { 
      value: 'system', 
      label: t('themeSystem'), 
      icon: <SettingsBrightnessIcon />, 
      color: '#10b981',
      desc: 'Follow OS setting',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Appearance Card */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Avatar sx={{ 
            width: 48, height: 48, 
            background: 'linear-gradient(135deg, #f59e0b, #f97316)',
            boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
          }}>
            <PaletteOutlinedIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {t('appearance')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('appearanceDesc')}
            </Typography>
          </Box>
        </Box>

        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          aria-label="Theme mode"
          sx={{ 
            width: '100%', 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 1.5,
            '& .MuiToggleButtonGroup-grouped': {
              border: 'none !important',
              borderRadius: '16px !important',
              m: '0 !important',
            },
          }}
        >
          {themeOptions.map((option) => (
            <ToggleButton 
              key={option.value}
              value={option.value} 
              aria-label={option.label}
              sx={{ 
                flex: 1, 
                py: 3,
                px: 2,
                flexDirection: 'column',
                gap: 1,
                textTransform: 'none',
                border: `1.5px solid ${alpha(theme.palette.divider, 0.1)} !important`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important',
                '&:hover': {
                  bgcolor: `${alpha(option.color, 0.04)} !important`,
                  borderColor: `${alpha(option.color, 0.25)} !important`,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 6px 20px ${alpha(option.color, 0.15)}`,
                },
                '&.Mui-selected': {
                  bgcolor: `${alpha(option.color, 0.08)} !important`,
                  borderColor: `${alpha(option.color, 0.4)} !important`,
                  boxShadow: `0 0 0 3px ${alpha(option.color, 0.1)}, 0 4px 16px ${alpha(option.color, 0.2)}`,
                  '&:hover': {
                    bgcolor: `${alpha(option.color, 0.12)} !important`,
                  },
                },
              }}
            >
              <Avatar sx={{ 
                width: 44, height: 44,
                bgcolor: mode === option.value ? alpha(option.color, 0.15) : alpha(theme.palette.text.secondary, 0.08),
                transition: 'all 0.3s ease',
                '& .MuiSvgIcon-root': {
                  color: mode === option.value ? option.color : theme.palette.text.secondary,
                  fontSize: 22,
                  transition: 'color 0.3s ease',
                },
              }}>
                {option.icon}
              </Avatar>
              <Typography variant="body2" fontWeight={mode === option.value ? 700 : 500}>
                {option.label}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                {option.desc}
              </Typography>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Language & Localization Card */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Avatar sx={{ 
            width: 48, height: 48, 
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
          }}>
            <LanguageOutlinedIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {t('localization')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose your preferred language for the interface
            </Typography>
          </Box>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 2.5,
          borderRadius: 3,
          bgcolor: alpha(theme.palette.action.hover, 0.04),
          border: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TranslateOutlinedIcon sx={{ color: 'text.secondary' }} />
            <Box>
              <Typography variant="body2" fontWeight={600}>Interface Language</Typography>
              <Typography variant="caption" color="text.secondary">
                Changes apply immediately
              </Typography>
            </Box>
          </Box>
          <LanguageToggle />
        </Box>

        <Box sx={{ 
          mt: 2,
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          p: 2.5,
          borderRadius: 3,
          bgcolor: alpha(theme.palette.action.hover, 0.04),
          border: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
          opacity: 0.6,
        }}>
          <AccessTimeIcon sx={{ color: 'text.secondary' }} />
          <Box>
            <Typography variant="body2" fontWeight={600}>
              Timezone
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('timezoneSupport')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// Small helper — re-export the icon used inline
function TranslateOutlinedIcon(props: { sx?: object }) {
  return <LanguageOutlinedIcon {...props} />;
}

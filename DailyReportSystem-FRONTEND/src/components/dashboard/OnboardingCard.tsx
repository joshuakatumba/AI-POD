'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  IconButton,
  alpha,
  useTheme,
  Card,
  CardContent,
} from '@mui/material';
import {
  CloseRounded,
  AddRounded,
  SettingsRounded,
  WavingHandRounded,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

export default function OnboardingCard() {
  const theme = useTheme();
  const t = useTranslations('dashboard.home.onboarding');
  const pathname = usePathname();
  const router = useRouter();
  const selectedLanguage = pathname.split('/')[1] || 'en';

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the onboarding card before
    const isDismissed = localStorage.getItem('onboarding_dismissed');
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Card
      elevation={0}
      sx={{
        mb: 4,
        borderRadius: 4,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(
          theme.palette.primary.light,
          0.15
        )} 100%)`,
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.2),
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Background Decorative Element */}
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 100%)`,
          filter: 'blur(30px)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 3, md: 4 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ maxWidth: '80%' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              <WavingHandRounded sx={{ color: 'primary.main', fontSize: 28 }} />
              <Typography variant="h5" fontWeight={800} sx={{ color: 'primary.dark' }}>
                {t('title')}
              </Typography>
            </Stack>

            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.6 }}>
              {t('description')}
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                disableElevation
                startIcon={<AddRounded />}
                onClick={() => router.push(`/${selectedLanguage}/projects`)}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  fontWeight: 700,
                  textTransform: 'none',
                }}
              >
                {t('createProject')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<SettingsRounded />}
                onClick={() => router.push(`/${selectedLanguage}/settings`)}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                {t('viewSettings')}
              </Button>
            </Stack>
          </Box>

          <IconButton
            onClick={handleDismiss}
            aria-label={t('dismiss')}
            sx={{
              color: 'text.secondary',
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              '&:hover': {
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                color: 'text.primary',
              },
            }}
          >
            <CloseRounded />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

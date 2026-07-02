'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  MenuItem,
  Avatar,
  Chip,
  useTheme,
  alpha,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authFetch } from '@/utils/apiClient';
import { updateProfileSchema, changePasswordSchema, UpdateProfileFormValues, ChangePasswordFormValues } from '@/schema/settingsSchema';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import TranslateIcon from '@mui/icons-material/Translate';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SecurityIcon from '@mui/icons-material/Security';

export default function ProfileSettings() {
  const t = useTranslations('Settings.ProfileSettings');
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      preferred_language: 'en',
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authFetch('/api/auth/current-user-info/');
        if (response.ok) {
          const data = await response.json();
          setValue('full_name', data.full_name || '');
          setValue('email', data.email || '');
          setValue('preferred_language', data.preferred_language || 'en');
        }
      } catch (error) {
        console.error('Error fetching profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [setValue]);

  const onSubmitProfile = async (data: UpdateProfileFormValues) => {
    setLoadingProfile(true);
    setSaveSuccess(false);
    try {
      const response = await authFetch('/api/auth/current-user-info/', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(t('updateError'));
      }
    } catch (error) {
      alert(t('updateError'));
    } finally {
      setLoadingProfile(false);
    }
  };

  const onSubmitPassword = async (data: ChangePasswordFormValues) => {
    setLoadingPassword(true);
    try {
      const response = await authFetch('/api/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        alert(t('passwordSuccess'));
        resetPassword();
      } else {
        const errData = await response.json();
        alert(errData.old_password?.[0] || t('passwordError'));
      }
    } catch (error) {
      alert(t('passwordError'));
    } finally {
      setLoadingPassword(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

    const cardSx = {
    p: { xs: 3, md: 4 },
    borderRadius: 2,
    bgcolor: 'background.paper',
    border: `1px solid ${theme.palette.divider}`,
  };
const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      transition: 'all 0.2s ease',
      '&:hover': {
      },
      '&.Mui-focused': {
      },
    },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Profile Info Section */}
      <Box sx={cardSx}>
        {/* Section Header with Avatar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Avatar sx={{ 
            width: 48, height: 48, 
            bgcolor: 'primary.main',
          }}>
            <PersonOutlineIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {t('personalInfo')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update your personal details and preferences
            </Typography>
          </Box>
        </Box>

        <form onSubmit={handleSubmit(onSubmitProfile)}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('fullName')}
                {...register('full_name')}
                error={!!errors.full_name}
                helperText={errors.full_name?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('email')}
                type="email"
                disabled
                {...register('email')}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Chip label="Verified" size="small" sx={{ 
                          height: 24, fontSize: '0.7rem', fontWeight: 600,
                          bgcolor: alpha('#10b981', 0.1), color: '#10b981',
                          '& .MuiChip-label': { px: 1 },
                        }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="preferred_language"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Preferred Language"
                    error={!!errors.preferred_language}
                    helperText={errors.preferred_language?.message}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <TranslateIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={textFieldSx}
                  >
                    <MenuItem value="en">🇬🇧 English</MenuItem>
                    <MenuItem value="ja">🇯🇵 日本語</MenuItem>
                    <MenuItem value="fr">🇫🇷 Français</MenuItem>
                    <MenuItem value="es">🇪🇸 Español</MenuItem>
                    <MenuItem value="de">🇩🇪 Deutsch</MenuItem>
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={loadingProfile}
                  sx={{ 
                    borderRadius: 2.5,
                    px: 4,
                    py: 1.2,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    bgcolor: 'primary.main',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      bgcolor: 'primary.main',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': { transform: 'translateY(0)' },
                  }}
                >
                  {loadingProfile ? <CircularProgress size={22} color="inherit" /> : t('saveChanges')}
                </Button>
                {saveSuccess && (
                  <Chip
                    icon={<CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#10b981 !important' }} />}
                    label="Saved successfully"
                    size="small"
                    sx={{
                      bgcolor: alpha('#10b981', 0.1),
                      color: '#10b981',
                      fontWeight: 600,
                      animation: 'fadeIn 0.3s ease',
                      '@keyframes fadeIn': {
                        from: { opacity: 0, transform: 'translateX(-8px)' },
                        to: { opacity: 1, transform: 'translateX(0)' },
                      },
                    }}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        </form>
      </Box>

      {/* Password Section */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Avatar sx={{ 
            width: 48, height: 48, 
            bgcolor: 'primary.main',
          }}>
            <SecurityIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {t('changePassword')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Keep your account secure with a strong password
            </Typography>
          </Box>
        </Box>

        <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('oldPassword')}
                type={showOldPassword ? 'text' : 'password'}
                {...registerPassword('old_password')}
                error={!!passwordErrors.old_password}
                helperText={passwordErrors.old_password?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowOldPassword(!showOldPassword)}>
                          {showOldPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('newPassword')}
                type={showNewPassword ? 'text' : 'password'}
                {...registerPassword('new_password')}
                error={!!passwordErrors.new_password}
                helperText={passwordErrors.new_password?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowNewPassword(!showNewPassword)}>
                          {showNewPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                {...registerPassword('confirm_password')}
                error={!!passwordErrors.confirm_password}
                helperText={passwordErrors.confirm_password?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={textFieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button 
                type="submit" 
                variant="outlined" 
                disabled={loadingPassword}
                sx={{ 
                  mt: 1,
                  borderRadius: 2.5,
                  px: 4,
                  py: 1.2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  borderColor: alpha('#f59e0b', 0.4),
                  color: '#f59e0b',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    borderColor: '#f59e0b',
                    bgcolor: alpha('#f59e0b', 0.06),
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 14px rgba(245,158,11,0.2)',
                  },
                  '&:active': { transform: 'translateY(0)' },
                }}
              >
                {loadingPassword ? <CircularProgress size={22} color="inherit" /> : t('updatePassword')}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Box>
  );
}

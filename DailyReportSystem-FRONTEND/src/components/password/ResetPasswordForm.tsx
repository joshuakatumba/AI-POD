'use client';

import { useState } from 'react';
import {
  TextField, Button, Alert, InputAdornment, IconButton,
  Typography, Box, Link,
  CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useTranslations } from 'next-intl';

interface ResetPasswordFormProps {
  onSubmit: (password: string) => void;
  error?: string;
  isLoading?: boolean;
}

export function ResetPasswordForm({ onSubmit, error, isLoading }: ResetPasswordFormProps) {
  const t = useTranslations('reset-password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: '',
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = { password: '', confirmPassword: '' };

    if (!password) {
      newErrors.password = t('errors.passwordRequired');
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = t('errors.passwordMinLength');
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('errors.confirmPasswordRequired');
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('errors.passwordsDoNotMatch');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(password);
    }
  };

  return (
    <Box className="w-full max-w-md mx-auto flex flex-col items-center gap-3 p-8">
      <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-indigo-600 shadow-md">
        <span className="text-white text-3xl font-extrabold tracking-wide">AP</span>
      </div>

      <div>
        <Typography variant="h5" fontWeight={600} className="text-center">
          {t('title')}
        </Typography>

        <Typography variant="body2" className="text-center">
          {t('subtitle')}
        </Typography>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5 mt-6">
        <TextField
          label={t('form.newPassword.label')}
          type={showPassword ? 'text' : 'password'}
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!!errors.password}
          helperText={errors.password}
          placeholder={t('form.newPassword.placeholder')}
          disabled={isLoading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label={t('form.confirmPassword.label')}
          type={showConfirmPassword ? 'text' : 'password'}
          fullWidth
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword}
          placeholder={t('form.confirmPassword.placeholder')}
          disabled={isLoading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="caption" fontWeight={600}>
            {t('requirements.title')}
          </Typography>
          <Typography variant="caption" component="div" color="text.secondary">
            • {t('requirements.length')}
            <br />
            • {t('requirements.mix')}
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          className="!rounded-xl !py-3"
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? t('form.buttons.submitting') : t('form.buttons.submit')}
        </Button>
      </form>

      <div className="text-center text-md text-gray-600 mt-2">
        {t('already-have-account')}{' '}
        <Link href="/login" underline="hover" className="font-medium">
          {t('login')}
        </Link>
      </div>
    </Box>
  );
}
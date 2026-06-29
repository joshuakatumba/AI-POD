'use client';

export const dynamic = 'force-dynamic';

import ForgotPasswordSuccess from '@/components/password/ForgotPasswordSuccess';
import { Typography, TextField, Button, Link, CircularProgress } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { requestPasswordResetApi } from '@/app/[locale]/(auth)/index';
import { getEffectiveLocale, getLocalOverrideLocale } from '@/utils/localePreference';

export default function ForgotPassword() {
  const t = useTranslations('forgot-password');
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setError(t('errors.emailRequired'));
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('errors.emailInvalid'));
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;
    setIsLoading(true);
    try {
      const submittedLanguage = getLocalOverrideLocale() ?? getEffectiveLocale();
      await requestPasswordResetApi(
        submittedLanguage ? { email, preferred_language: submittedLanguage } : { email }
      );
      setIsSubmitted(true);
    } catch (err: any) {
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <ForgotPasswordSuccess email={email} />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 p-8">
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
          label={t('form.email.label')}
          type="email"
          fullWidth
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('form.email.placeholder')}
          error={!!error}
          helperText={error}
          disabled={isLoading}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isLoading}
          className="!rounded-xl !py-3"
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? t('form.buttons.sending') : t('form.buttons.send')}
        </Button>
      </form>

      <div className="text-center text-md text-gray-600 mt-2">
        {t('already-have-account')}{' '}
        <Link href="/login" underline="hover" className="font-medium">
          {t('login')}
        </Link>
      </div>
    </div>
  );
}

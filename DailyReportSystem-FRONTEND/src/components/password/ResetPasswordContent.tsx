'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResetPasswordForm } from '@/components/password/ResetPasswordForm';
import ResetPasswordSuccess from '@/components/password/ResetPasswordSuccess';
import { useTranslations } from 'next-intl';
import { Typography } from '@mui/material';
import { confirmPasswordResetApi } from '@/app/[locale]/(auth)/index';

export default function ResetPasswordContent() {
  const t = useTranslations('reset-password');
  const searchParams = useSearchParams();

  const reset_token = searchParams.get('reset_token');
  const uid = searchParams.get('uid');

  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!reset_token || !uid) {
    return (
      <div className="text-center p-8">
        <Typography variant="body1" color="error">
          {t('errors.invalidToken')}
        </Typography>
      </div>
    );
  }

  const handleResetPassword = async (password: string) => {
    setIsLoading(true);
    setError('');

    try {
      await confirmPasswordResetApi({
        reset_token,
        uid,
        new_password: password,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return <ResetPasswordSuccess />;
  }

  return (
    <ResetPasswordForm
      onSubmit={handleResetPassword}
      error={error}
      isLoading={isLoading}
    />
  );
}
'use client';

import { Typography, Link } from '@mui/material';
import { useTranslations } from 'next-intl';

type ForgotPasswordSuccessProps = {
  email: string;
};

export default function ForgotPasswordSuccess({
  email,
}: ForgotPasswordSuccessProps) {
  const t = useTranslations('forgot-password');

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4 p-8">
      <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-indigo-600 shadow-md">
        <span className="text-white text-3xl font-extrabold tracking-wide">
          AP
        </span>
      </div>

      <Typography
        variant="h5"
        fontWeight={600}
        className="text-center"
      >
        {t('success.title')}
      </Typography>

      <Typography
        variant="body2"
        className="text-center"
      >
        {t('success.message')}
        <br />
        <strong>{email}. </strong>
        {t('success.instruction')}
      </Typography>

      <div className="text-center text-md text-gray-600 mt-4">
        {t('already-have-account')}{' '}
        <Link
          href="/login"
          underline="hover"
          className="font-medium"
        >
          {t('login')}
        </Link>
      </div>
    </div>
  );
}
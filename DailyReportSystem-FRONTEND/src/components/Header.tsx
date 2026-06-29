'use client';

import { Typography } from '@mui/material';

type HeaderProps = {
  title: string;
  subtitle?: string;
  logoText?: string;
};

export default function Header({
  title,
  subtitle,
  logoText = 'H',
}: HeaderProps) {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 p-5">
      <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-indigo-600 shadow-md">
        <span className="text-white text-3xl font-extrabold tracking-wide">
          {logoText}
        </span>
      </div>

      <div className="text-center">
        <Typography variant="h5" fontWeight={600}>
          {title}
        </Typography>

        {subtitle && (
          <Typography variant="body2">
            {subtitle}
          </Typography>
        )}
      </div>
    </div>
  );
}

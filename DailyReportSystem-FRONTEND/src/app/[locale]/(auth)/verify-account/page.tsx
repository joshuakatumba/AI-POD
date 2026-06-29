'use client';

import { Typography, Button, TextField } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function Verification() {
  const t = useTranslations('verify-account');
  const [otp, setOtp] = useState(['', '', '', '']);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      const newOtp = [...otp];
      newOtp[index] = val;
      setOtp(newOtp);
      // Auto-focus next input
      if (val && index < 3) {
        const next = document.getElementById(`otp-${index + 1}`);
        next?.focus();
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 p-8">
      <Typography variant="h5" fontWeight={600} className="text-center">
        {t('title')}
      </Typography>
      <Typography variant="body2" className="text-center">
        {t('subtitle')}
      </Typography>

      <div className="flex justify-center gap-4 mt-6">
        {otp.map((val, idx) => (
          <TextField
            key={idx}
            id={`otp-${idx}`}
            value={val}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e, idx)}
            inputProps={{ maxLength: 1, className: 'text-center' }}
            className="w-14"
            variant="outlined"
            multiline={false} // ensures it's always an <input>
          />
        ))}
      </div>

      <Button variant="contained" size="large" className="!mt-6 !rounded-xl !py-3">
        {t('form.buttons.verify')}
      </Button>
    </div>
  );
}

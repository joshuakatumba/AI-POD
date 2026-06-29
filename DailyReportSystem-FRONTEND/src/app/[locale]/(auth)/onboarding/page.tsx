'use client';


import { useState } from 'react';
import { Button, Typography, TextField, Snackbar, Alert, AlertColor  } from '@mui/material';
import { useTranslations } from 'next-intl';

interface OnboardingCardProps {
  onInviteAccepted: () => void;
}

export default function OnboardingCard({ onInviteAccepted }: OnboardingCardProps) {
  const [fullname, setFullname] = useState('');
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'success' as AlertColor,
  });

  const t = useTranslations('onboarding');

  const showToast = (message: string, severity: AlertColor = 'success') => {
    setToast({
      open: true,
      message,
      severity,
    });
  };
  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleAcceptInvitation = () => {
    if (!fullname) {
      showToast('Please enter your full name.', 'error');
      return;
    }

     showToast(`Welcome ${fullname}! Invitation accepted.`, 'success');
    onInviteAccepted();
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 p-8">
      <Snackbar
        open={toast.open}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseToast} 
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
      <div className="text-center">
        <Typography variant="h5" fontWeight={600}>
          {t('title')}
        </Typography>
        <Typography variant="body2">
          {t('subtitle')}
        </Typography>
      </div>
      <div className="w-full">
        <TextField
          label={t('form.fullName.label')}
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          required
          fullWidth
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          size="large"
          className="!mt-2 !rounded-xl !py-3"
          fullWidth
          onClick={handleAcceptInvitation}
        >
          {t('form.buttons.acceptInvitation')}
        </Button>
      </div>
    </div>
  );
}
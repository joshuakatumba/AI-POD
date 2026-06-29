'use client';

import {
  Box, Stack, Avatar,Divider,
  TextField, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { PersonOutline } from '@mui/icons-material';
import { useTranslations } from 'next-intl';

interface ProfileBodyProps {
  isEditing: boolean;
  displayName: string;
  preferredLanguage: string;
  email: string;
  role: string;
  reference: string;
  onDisplayNameChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function ProfileBody({
  displayName,
  preferredLanguage,
  email,
  onDisplayNameChange,
  onLanguageChange,
  onSubmit,
}: ProfileBodyProps) {
  const t = useTranslations('dashboard.profile.details');

  const languages = [
    { value: 'en', label: t('form.language.english') },
    { value: 'ja', label: t('form.language.japanese') },
  ];

  const avatarLetter = displayName.trim().charAt(0).toUpperCase();

  return (
    <Box sx={{ flex: 1, overflowY: 'auto' }}>
      <form id="profile-form" onSubmit={onSubmit}>
        <Stack direction="row" display="flex" spacing={2} justifyContent={"center"} px={3} py={3} margin={3}>
          <Avatar
            sx={{
              width: 75,
              height: 75,
              bgcolor: 'primary.main',
              fontSize: '2rem',
              fontWeight: 700,
              borderRadius: '50%',
              size: 'large',
              margin: '2',
            }}
          >
            {avatarLetter || <PersonOutline />}
          </Avatar>
        </Stack>

        <Divider sx={{ mx: 3 }} />

        <Stack spacing={2.5} px={3} py={3}>
          <TextField
            label={t('form.displayName.label')}
            fullWidth
            required
            autoFocus
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder={t('form.displayName.placeholder')}
            error={displayName.length > 0 && displayName.length < 2}
            helperText={
              displayName.length > 0 && displayName.length < 2
                ? t('form.displayName.error') : ''
            }
          />

          <FormControl fullWidth required>
            <InputLabel>{t('form.language.label')}</InputLabel>
            <Select
              value={preferredLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              label={t('form.language.label')}
            >
              {languages.map((lang) => (
                <MenuItem key={lang.value} value={lang.value}>
                  {lang.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={t('form.email.label')}
            value={email}
            fullWidth
            disabled
            helperText={t('form.email.hint')}
          />
        </Stack>
      </form>
    </Box>
  );
}
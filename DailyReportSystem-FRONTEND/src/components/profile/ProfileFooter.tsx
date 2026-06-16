'use client';

import { Box, Stack, Button } from '@mui/material';
import { useTranslations } from 'next-intl';

interface ProfileFooterProps {
  loading: boolean;
  displayName: string;
  preferredLanguage: string;
  onCancel: () => void;
}

export default function ProfileFooter({
  loading,
  displayName,
  preferredLanguage,
  onCancel,
}: ProfileFooterProps) {
  const t = useTranslations('dashboard.profile.details');

  return (
    <Box
      sx={{
        px: 3,
        py: 2.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <Stack direction="row" spacing={1.5}>
        <Button
          fullWidth
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
          sx={{ borderRadius: 2, py: 1.25, fontWeight: 600 }}
        >
          {t('form.buttons.cancel')}
        </Button>
        <Button
          fullWidth
          variant="contained"
          type="submit"
          form="profile-form"
          disabled={!displayName.trim() || !preferredLanguage || loading}
          sx={{ borderRadius: 2, py: 1.25, fontWeight: 600 }}
        >
          {loading ? t('form.buttons.saving') : t('form.buttons.save')}
        </Button>
      </Stack>
    </Box>
  );
}
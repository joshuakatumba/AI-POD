'use client';

import { organisationMemberType } from '@/_types/organisation';
import {
  Modal,
  Box,
  Typography,
  Avatar,
  Button,
  Stack,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type DeactivateMemberModalProps = {
  open: boolean;
  organisationMember: organisationMemberType | null;
  onClose: () => void;
  onConfirm: (userId: string) => Promise<void>;
};

export default function DeactivateOrganisationMemberModal({
  open,
  organisationMember,
  onClose,
  onConfirm,
}: DeactivateMemberModalProps) {
  const t = useTranslations('modals.deactivateOrganisationMember');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- handlers ---------------- */
  const handleConfirm = async () => {
    if (!organisationMember) return;

    setLoading(true);
    setError(null);

    try {
      await onConfirm(organisationMember.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  if (!organisationMember) return null;

  /* ---------------- helpers ---------------- */
  const initials = organisationMember.display_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  /* ---------------- UI ---------------- */
  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 24,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Header */}
        <Box px={3} py={2}>
          <Typography variant="h6" fontWeight={600}>
            {t('title')}
          </Typography>
        </Box>

        <Divider />

        {/* Content */}
        <Box px={3} py={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar 
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'grey.400',
                fontWeight: 600,
              }}
            >
              {initials}
            </Avatar>
            <Box minWidth={0}>
              <Typography fontWeight={500} noWrap>
                {organisationMember?.display_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {organisationMember.email}
              </Typography>
            </Box>
          </Stack>

          <Typography mt={3} variant="body2" color="text.secondary">
            {t('message')}
          </Typography>
        </Box>

        <Divider />

        {/* Actions */}
        <Box
          px={3}
          py={2}
          display="flex"
          flexDirection={{ xs: 'column-reverse', sm: 'row' }}
          gap={1.5}
          justifyContent="flex-end"
        >
          <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }} disabled={loading}>
            {t('buttons.cancel')}
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleConfirm}
            sx={{ borderRadius: 2 }}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? t('deleting') : t('buttons.deactivate')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

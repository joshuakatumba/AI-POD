'use client';

import { useState } from 'react';
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
import { BusinessOutlined } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { AdminOrganisationType } from '@/_types/admin';
import { useToast } from '@/app/_providers/ToastProvider';

type DeleteOrganisationModalProps = {
  open: boolean;
  organisation: AdminOrganisationType | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
};

export default function DeleteOrganisationModal({
  open,
  organisation,
  onClose,
  onConfirm,
}: DeleteOrganisationModalProps) {
  const t = useTranslations('admin.organisations.modals.delete');
  const [loading, setLoading] = useState(false);
  const showToast = useToast();

  const handleConfirm = async () => {
    if (!organisation) return;
    setLoading(true);
    try {
      await onConfirm(organisation.id);
      showToast({ message: t('toast.success'), severity: 'success' });
      onClose();
    } catch (err) {
      console.error(err);
      showToast({ message: t('toast.error'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!organisation) return null;

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
                bgcolor: 'error.lighter',
                color: 'error.main',
                fontWeight: 600,
              }}
            >
              <BusinessOutlined />
            </Avatar>
            <Box minWidth={0}>
              <Typography fontWeight={600} noWrap>
                {organisation.name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" color="text.secondary" noWrap>
                  {organisation.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">•</Typography>
                <Typography variant="body2" color="text.secondary">
                  {organisation.country}
                </Typography>
              </Stack>
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
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {t('buttons.cancel')}
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleConfirm}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
          >
            {loading ? t('deleting') : t('buttons.delete')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
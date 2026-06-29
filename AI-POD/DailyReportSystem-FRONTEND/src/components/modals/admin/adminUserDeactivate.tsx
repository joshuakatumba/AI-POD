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
import { useTranslations } from 'next-intl';
import { AdminUserType, DeactivateAdminUserPayloadType } from '@/_types/admin';

type DeactivateAdminUserModalProps = {
  open: boolean;
  user: AdminUserType | null;
  onClose: () => void;
  onConfirm: (userId: string, payload: DeactivateAdminUserPayloadType) => Promise<void>;
};

export default function DeactivateAdminUserModal({
  open,
  user,
  onClose,
  onConfirm,
}: DeactivateAdminUserModalProps) {
  const t = useTranslations('admin.users');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await onConfirm(user.id, { is_active: false });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const displayName = user.memberships?.[0]?.display_name || user.email;

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
            {t('deactivateModal.title')}
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
                bgcolor: 'primary.main',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box minWidth={0}>
              <Typography fontWeight={600} noWrap>
                {displayName}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" color="text.secondary" noWrap>
                  {user.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">•</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {user.is_superuser
                    ? t('editModal.roles.superuser')
                    : user.is_staff
                    ? t('editModal.roles.staff')
                    : t('editModal.roles.member')}
                </Typography>
              </Stack>
            </Box>
          </Stack>

          <Typography mt={3} variant="body2" color="text.secondary">
            {t('deactivateModal.message')}
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
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            disabled={loading}
          >
            {t('deactivateModal.buttons.cancel')}
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleConfirm}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? t('deactivateModal.deactivating') : t('deactivateModal.buttons.deactivate')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
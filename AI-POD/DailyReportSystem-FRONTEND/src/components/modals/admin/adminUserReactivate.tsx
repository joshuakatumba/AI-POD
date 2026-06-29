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
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { AdminUserType } from '@/_types/admin';

type Props = {
  open: boolean;
  user: AdminUserType | null;
  onClose: () => void;
  onConfirm: (userId: string, payload: { is_active: boolean }) => Promise<void>;
};

export default function ReactivateAdminUserModal({ open, user, onClose, onConfirm }: Props) {
  const t = useTranslations('admin.users');
  const [loading, setLoading] = useState(false);

  const displayName = user?.memberships?.[0]?.display_name || user?.email || '';

  const handleConfirm = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await onConfirm(user.id, { is_active: true });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 450 },
          maxWidth: 500,
          borderRadius: 3,
          bgcolor: 'background.paper',
          boxShadow: 24,
        }}
      >
        {/* Header */}
        <Box px={3} py={2}>
          <Typography variant="h6" fontWeight={600}>
            {t('reactivateModal.title')}
          </Typography>
        </Box>

        <Divider />

        {/* Content */}
        <Box px={3} py={3}>
          <Stack direction="row" spacing={2} alignItems="center" mb={3}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'success.lighter',
                color: 'success.main',
                fontWeight: 600,
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box minWidth={0}>
              <Typography fontWeight={600} noWrap>
                {displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.email}
              </Typography>
            </Box>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {t('reactivateModal.message')}
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
            {t('reactivateModal.buttons.cancel')}
          </Button>

          <Button
            variant="contained"
            color="success"
            onClick={handleConfirm}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
          >
            {loading ? t('reactivateModal.reactivating') : t('reactivateModal.buttons.reactivate')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
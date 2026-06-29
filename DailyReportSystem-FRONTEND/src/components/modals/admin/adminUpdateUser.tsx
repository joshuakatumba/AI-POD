'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  Avatar,
  Button,
  Stack,
  Divider,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { AdminUserType } from '@/_types/admin';

type RoleOption = 'member' | 'staff' | 'superuser';

type Props = {
  open: boolean;
  user: AdminUserType | null;
  onClose: () => void;
  onConfirm: (userId: string, payload: { is_staff: boolean; is_superuser: boolean }) => Promise<void>;
};

function getRole(user: AdminUserType): RoleOption {
  if (user.is_superuser) return 'superuser';
  if (user.is_staff) return 'staff';
  return 'member';
}

function getRolePayload(role: RoleOption) {
  return {
    is_superuser: role === 'superuser',
    is_staff: role === 'staff' || role === 'superuser',
  };
}

export default function EditAdminUserModal({ open, user, onClose, onConfirm }: Props) {
  const t = useTranslations('admin.users');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleOption>('member');

  useEffect(() => {
    if (user) setSelectedRole(getRole(user));
  }, [user]);

  const handleRoleChange = (event: SelectChangeEvent) => {
    setSelectedRole(event.target.value as RoleOption);
  };

  const handleConfirm = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await onConfirm(user.id, getRolePayload(selectedRole));
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const roles: { key: RoleOption; label: string }[] = [
    { key: 'member', label: t('editModal.roles.member') },
    { key: 'staff', label: t('editModal.roles.staff') },
    { key: 'superuser', label: t('editModal.roles.superuser') },
  ];

  const displayName = user?.memberships?.[0]?.display_name || user?.email || '';

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
            {t('editModal.title')}
          </Typography>
        </Box>

        <Divider />

        {/* Content */}
        <Box px={3} py={3}>
          {/* User Info */}
          <Stack direction="row" spacing={3} alignItems="center" mb={3}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'primary.lighter',
                color: 'primary.main',
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

          {/* Role Selection */}
          <Typography variant="subtitle2" fontWeight={600} mb={1}>
            {t('editModal.changeRole')}
          </Typography>

          <FormControl fullWidth size="small">
            <Select
              value={selectedRole}
              onChange={handleRoleChange}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              {roles.map((role) => (
                <MenuItem key={role.key} value={role.key}>
                  <Typography variant="body2">{role.label}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography mt={3} variant="body2" color="text.secondary">
            {t('editModal.message')}
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
            {t('editModal.buttons.cancel')}
          </Button>

          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={loading || selectedRole === getRole(user)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
          >
            {loading ? t('editModal.saving') : t('editModal.buttons.save')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
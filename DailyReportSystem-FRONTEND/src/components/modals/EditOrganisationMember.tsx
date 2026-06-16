'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Avatar,
  Divider,
  Stack,
  FormHelperText,
  CircularProgress,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { Role, organisationMemberType, updateOrganisationMemberType } from '@/_types/organisation';
import { useAuth } from '@/app/_contexts/AuthContext';

/* ---------------- props ---------------- */
type EditMemberModalProps = {
  open: boolean;
  organisationMember?: organisationMemberType | null | undefined;
  onClose: () => void;
  isCurrentUser?: boolean;
  isAdmin: boolean;
  onConfirm: (id: string, updates: updateOrganisationMemberType) => Promise<void>;
};


export default function EditOrganisationMemberModal({
  open,
  organisationMember,
  onClose,
  onConfirm,
  isAdmin,
  isCurrentUser,
}: EditMemberModalProps) {
  const t = useTranslations('modals.editOrganisationMember');
  const m = useTranslations('organisation.Members');
  const ROLES = ['member', 'admin'];
  const { user } = useAuth();
  /* ---------------- state ---------------- */
  const [display_name, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  /* ---------------- handlers ---------------- */
  const handleSubmit = useCallback(async () => {
    if (!organisationMember || !display_name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onConfirm(organisationMember.id, {
        display_name: display_name.trim(),
        role,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  }, [organisationMember, display_name, email, role, onConfirm, onClose]);

  /* ---------------- effects ---------------- */
  useEffect(() => {
    if (open && organisationMember) {
      if (organisationMember.display_name) {
         setDisplayName(organisationMember.display_name);
      }
      setEmail(organisationMember.email);
      setRole(organisationMember.role);
      setError(null);
    }
  }, [open, organisationMember]);

  if (!open || !organisationMember) return null;

  /* ---------------- initials ---------------- */
  const initials = (organisationMember.display_name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  /* ---------------- validation ---------------- */
  const isValid = display_name.trim().length > 0;

  /* ---------------- UI ---------------- */
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
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 24,
        }}
      >
        {/* Header */}
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {isAdmin ? t('title') : t('editProfile')}
          </Typography>
        </Box>

        <Divider />

        {/* Content */}
        <Box sx={{ px: 3, py: 3 }}>
          <Stack spacing={3}>
            {/* User Avatar */}
            <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>{initials}</Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {isAdmin ? t('editing') : t('editingProfile')}
                </Typography>
                <Typography variant="body1" fontWeight={500} noWrap>
                  {organisationMember.display_name}
                </Typography>
              </Box>
            </Stack>
            {/* Name Input -only current users name editable */}
            <TextField
              fullWidth
              id="display_name"
              label={t('display_name')}
              value={display_name}
              onChange={(e) => setDisplayName(e.target.value)}
              variant="outlined"
              size="small"
              disabled={!isCurrentUser}
              required
            />
            {/* Email Input - always disabled */}
            <TextField
              fullWidth
              id="email"
              label={t('email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled
              variant="outlined"
              size="small"
            />

            {/* Role Select - Only admins can edit */}
            <FormControl fullWidth size="small">
              <InputLabel id="role-label">{t('role.title')}</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                value={role}
                label={t('role.title')}
                onChange={(e) => setRole(e.target.value as Role)}
                disabled={!isAdmin || loading}
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {m(`roles.${r}`)}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{!isAdmin ? t('changeRole') : t('role.label')}</FormHelperText>
            </FormControl>
          </Stack>
        </Box>

        <Divider />

        {/* Actions */}
        <Box sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={onClose} variant="outlined" color="inherit" disabled={loading}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || loading}
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {loading ? t('saving') : t('save')}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}
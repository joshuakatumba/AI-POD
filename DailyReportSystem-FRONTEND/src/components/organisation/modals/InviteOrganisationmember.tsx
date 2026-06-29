'use client';

import { useState, useCallback } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Stack,
  CircularProgress,
  Alert,
  MenuItem,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import {  InviteOrganisationMemberPayloadType } from '@/_types/organisation';
/* ---------------- Types ---------------- */

type InviteOrganisationMemberModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: InviteOrganisationMemberPayloadType) => Promise<void>;
};

const roles = ['admin', 'member'];

const InitialFormData: InviteOrganisationMemberPayloadType = {
  email: '',
  role: 'member',
};

/* ---------------- Component ---------------- */
export default function InviteOrganisationMemberModal({ open, onClose, onConfirm }: InviteOrganisationMemberModalProps) {
  const t = useTranslations('organisation.invite');

  const [form, setForm] = useState<InviteOrganisationMemberPayloadType>(InitialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- Handlers ---------------- */
  const handleChange =
    (field: keyof InviteOrganisationMemberPayloadType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleClose = () => {
    if (loading) return;
    setForm(InitialFormData);
    setError(null);
    onClose();
  };

  const handleSubmit = useCallback(async () => {
    if (!form.email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onConfirm(form);
      setForm(InitialFormData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite project');
    } finally {
      setLoading(false);
    }
  }, [form, onConfirm, onClose]);

  /* ---------------- Validation ---------------- */
  const isValid = form.email.trim().length > 0;

  /* ---------------- UI ---------------- */
  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 480 },
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 24,
        }}
      >
        {/* Header */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Typography variant="h6" fontWeight={700}>
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>

        <Divider />

        {/* Content */}
        <Box sx={{ px: 3, py: 3 }}>
          <Stack spacing={2.5}>
            {/* Error */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Email Address */}
            <TextField
              fullWidth
              label={t('form.email.label')}
              value={form.email}
              onChange={handleChange('email')}
              disabled={loading}
              size="small"
              required
              autoFocus
            />

            {/* Status */}
            <TextField
              fullWidth
              select
              label={t('form.role.label')}
              value={form.role}
              onChange={handleChange('role')}
              disabled={loading}
              size="small"
            >
              {roles.map((option) => (
                <MenuItem key={option} value={option}>
                  {t(`form.role.options.${option.toLowerCase()}`)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Box>

        <Divider />

        {/* Actions */}
        <Box sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={handleClose} variant="outlined" color="inherit" disabled={loading}>
              {t('form.buttons.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!isValid || loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {loading ? t('form.buttons.inviting') : t('form.buttons.invite')}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}
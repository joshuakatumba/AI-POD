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
  CircularProgress,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { BusinessOutlined } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { useToast } from '@/app/_providers/ToastProvider';
import { AdminEditOrganisationPayloadType, AdminOrganisationType } from '@/_types/admin';

type EditOrganisationModalProps = {
  open: boolean;
  organisation: AdminOrganisationType | null;
  onClose: () => void;
  onConfirm: (id: string, payload: AdminEditOrganisationPayloadType) => Promise<void>;
};

export default function EditOrganisationModal({
  open,
  organisation,
  onClose,
  onConfirm,
}: EditOrganisationModalProps) {
  const t = useTranslations('admin.organisations.modals.edit');
  const tStatus = useTranslations('admin.organisations.status');
  const [loading, setLoading] = useState(false);
  const showToast = useToast();

  const [form, setForm] = useState<AdminEditOrganisationPayloadType>({
    name: '',
    email: '',
    country: '',
    is_active: true,
  });

  // Populate form when organisation changes
  useEffect(() => {
    if (organisation) {
      setForm({
        name: organisation.name,
        email: organisation.email,
        country: organisation.country,
        is_active: organisation.is_active,
      });
    }
  }, [organisation]);

  const handleChange = (field: keyof AdminEditOrganisationPayloadType, value: string | boolean) => {
    setForm((prev: AdminEditOrganisationPayloadType ) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = async () => {
    if (!organisation) return;
    setLoading(true);
    try {
      await onConfirm(organisation.id, form);
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
          maxWidth: 460,
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
          <Typography variant="body2" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>

        <Divider />

        {/* Content */}
        <Box px={3} py={3}>

          {/* Org identity */}
          <Stack direction="row" spacing={2} alignItems="center" mb={3}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: 'primary.light',
                color: 'primary.main',
                fontWeight: 700,
                borderRadius: 2,
              }}
            >
              <BusinessOutlined />
            </Avatar>
            <Box minWidth={0}>
              <Typography fontWeight={600} noWrap>{organisation.name}</Typography>
              <Typography variant="caption" color="text.secondary">{organisation.email}</Typography>
            </Box>
          </Stack>

          <Stack spacing={2.5}>
            <TextField
              fullWidth
              size="small"
              label={t('fields.name')}
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              fullWidth
              size="small"
              label={t('fields.email')}
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            
            <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              size="small"
              label={t('fields.country')}
              value={form.country}
              onChange={(e) => handleChange('country', e.target.value)}
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <FormControl fullWidth size="small">
              <InputLabel>{t('fields.status')}</InputLabel>
              <Select
                value={form.is_active ? 'active' : 'inactive'}
                label={t('fields.status')}
                onChange={(e) => handleChange('is_active', e.target.value === 'active')}
                disabled={loading}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="active">{tStatus('active')}</MenuItem>
                <MenuItem value="inactive">{tStatus('inactive')}</MenuItem>
              </Select>
            </FormControl>
            </Stack>
          </Stack>
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
            onClick={handleConfirm}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
          >
            {loading ? t('buttons.saving') : t('buttons.save')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
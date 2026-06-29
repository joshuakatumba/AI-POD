'use client';

import { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Stack,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { CreateAIModelPayloadType, ProviderType } from '@/_types/admin';


type CreateAIModelModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: CreateAIModelPayloadType) => Promise<void>;
};

const providers: ProviderType[] = [
  'openai',
  'anthropic',
  'cohere',
  'gemini',
];

const InitialFormData: CreateAIModelPayloadType = {
  name: '',
  provider: 'openai',
  api_key: '',
};

/* ---------------- Component ---------------- */

export default function CreateAIModelModal({
  open,
  onClose,
  onConfirm,
}: CreateAIModelModalProps) {
  const t = useTranslations('admin.aiModels.modals.createModel');

  const [form, setForm] = useState<CreateAIModelPayloadType>(InitialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- Handlers ---------------- */

  const handleChange =
    (field: keyof CreateAIModelPayloadType) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleClose = () => {
    console.log("HERE I AM")
    if (loading) return;
    console.log("HERE I AM 2")

    setForm(InitialFormData);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.provider) return;

    setLoading(true);
    setError(null);

    try {
      await onConfirm({
        ...form,
        api_key: form.api_key || null,
      });

      setForm(InitialFormData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create AI model');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Validation ---------------- */

  const isValid = form.name.trim().length > 0 && !!form.provider;

  /* ---------------- UI ---------------- */

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 460 },
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
            {/* Name */}
            <TextField
              fullWidth
              label={t('fields.name')}
              value={form.name}
              onChange={handleChange('name')}
              disabled={loading}
              size="small"
              required
              autoFocus
            />

            {/* Provider */}
            <TextField
              fullWidth
              select
              label={t('fields.provider')}
              value={form.provider}
              onChange={handleChange('provider')}
              disabled={loading}
              size="small"
              required
            >
              {providers.map((provider) => (
                <MenuItem key={provider} value={provider}>
                  {t(`fields.providers.${provider}`)}
                </MenuItem>
              ))}
            </TextField>

            {/* API Key */}
            <TextField
              fullWidth
              label={t('fields.api_key')}
              value={form.api_key ?? ''}
              onChange={handleChange('api_key')}
              disabled={loading}
              size="small"
              type="password"
            />
          </Stack>
        </Box>

        <Divider />

        {/* Actions */}
        <Box sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              onClick={handleClose}
              variant="outlined"
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              disabled={loading}
            >
              {t('cancel')}
            </Button>

            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!isValid || loading}
               sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
              startIcon={
                loading ? <CircularProgress size={16} color="inherit" /> : null
              }
            >
              {loading ? t('creating') : t('confirm')}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}
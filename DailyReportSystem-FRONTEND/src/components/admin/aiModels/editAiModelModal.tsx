'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  MenuItem,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { AiModelType, EditAIModelPayloadType, ProviderType } from '@/_types/admin';


type EditAIModelModalProps = {
  open: boolean;
  model: AiModelType | null;
  onClose: () => void;
  onConfirm: (id: string, data: EditAIModelPayloadType) => Promise<void>;
};

const providers: ProviderType[] = [
  'openai',
  'anthropic',
  'cohere',
  'gemini',
];

export default function EditAIModelModal({
  open,
  model,
  onClose,
  onConfirm,
}: EditAIModelModalProps) {
  const t = useTranslations('admin.aiModels');

  const [form, setForm] = useState<EditAIModelPayloadType>({
    name: '',
    provider: 'openai',
    api_key: '',
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (model) {
      setForm({
        name: model.name || '',
        provider: model.provider || 'openai',
        api_key: '',
        is_active: model.is_active,
      });
    }
  }, [model, open]);

  const handleChange =
    (field: keyof EditAIModelPayloadType) =>
      (e: React.ChangeEvent<HTMLInputElement> | any) => {
        const value = e.target ? e.target.value : e;
        setForm((prev) => ({ ...prev, [field]: value }));
      };

  const handleSubmit = async () => {
    if (!model || !form.name?.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const updates: EditAIModelPayloadType = {};

      const fields: (keyof EditAIModelPayloadType & keyof AiModelType)[] = [
        'name',
        'provider',
        'api_key',
        'is_active',
      ];
      
      fields.forEach((field) => {
        const formValue = field === 'name' ? form[field]?.trim() : form[field];
        const modelValue = model[field];

        if (formValue !== modelValue && formValue !== '') {
          updates[field] = formValue as any;
        }
      });

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      await onConfirm(model.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update AI model');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !model) return null;

  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
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
            {t('modals.editModel.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('modals.editModel.subtitle')}
          </Typography>
        </Box>

        <Divider />

        <Box sx={{ px: 3, py: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label={t('modals.createModel.fields.name')}
              value={form.name}
              onChange={handleChange('name')}
              disabled={loading}
              size="small"
            />

            <TextField
              fullWidth
              select
              label={t('modals.createModel.fields.provider')}
              value={form.provider}
              onChange={handleChange('provider')}
              disabled={loading}
              size="small"
            >
              {providers.map((provider) => (
                <MenuItem key={provider} value={provider}>
                  {t(`modals.createModel.fields.providers.${provider}`)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label={t('modals.createModel.fields.api_key')}
              value={form.api_key}
              onChange={handleChange('api_key')}
              disabled={loading}
              size="small"
              type="password"
              placeholder={t('modals.editModel.apiKeyPlaceholder')}
              autoComplete="new-password"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={!!form.is_active}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  disabled={loading}
                />
              }
              label={form.is_active ? t('aiModelCard.online') : t('aiModelCard.offline')}
            />
          </Stack>
        </Box>

        <Divider />

        {/* Actions */}
        <Box sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={onClose} variant="outlined" disabled={loading} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
              {t('modals.editModel.cancel')}
            </Button>

            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {loading
                ? t('modals.editModel.saving')
                : t('modals.editModel.saveChanges')}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}
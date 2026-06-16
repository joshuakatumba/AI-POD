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
  Alert,
  MenuItem,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { CreateProjectPayloadType } from '@/_types/project';
/* ---------------- Types ---------------- */

type CreateProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: CreateProjectPayloadType) => Promise<void>;
};

const visibility = ['team', 'organisation'] as const;

const InitialFormData: CreateProjectPayloadType = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  visibility: 'team',
};

/* ---------------- Component ---------------- */
export default function CreateProjectModal({ open, onClose, onConfirm }: CreateProjectModalProps) {
  const t = useTranslations('projects.modals.createProject');

  const [form, setForm] = useState<CreateProjectPayloadType>(InitialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- Handlers ---------------- */
  const handleChange =
    (field: keyof CreateProjectPayloadType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleClose = () => {
    if (loading) return;
    setForm(InitialFormData);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
  if (!form.name.trim() || !form.end_date) return;

  setLoading(true);
  setError(null);

    try {
      await onConfirm(form);
      setForm(InitialFormData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
    [form, onConfirm, onClose]
  } 

  /* ---------------- Validation ---------------- */
  const isValid = form.name.trim().length > 0 && form.end_date.length > 0;

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
            {/* Project Name */}
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

            {/* Description */}
            <TextField
              fullWidth
              label={t('fields.description')}
              value={form.description}
              onChange={handleChange('description')}
              disabled={loading}
              size="small"
              multiline
              rows={6}
            />

            <Stack direction="row" spacing={2}>
              {/* Start */}
              <TextField
                fullWidth
                label={t('fields.start_date')}
                type="date"
                value={form.start_date}
                onChange={handleChange('start_date')}
                disabled={loading}
                size="small"
                required
                InputLabelProps={{ shrink: true }}
              />
              {/* Deadline */}
              <TextField
                fullWidth
                label={t('fields.end_date')}
                type="date"
                value={form.end_date}
                onChange={handleChange('end_date')}
                disabled={loading}
                size="small"
                required
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            {/* Status */}
            <TextField
              fullWidth
              select
              label={t('fields.visibility.label')}
              value={form.visibility}
              onChange={handleChange('visibility')}
              disabled={loading}
              size="small"
            >
              {visibility.map((option) => (
                <MenuItem key={option} value={option}>
                  {t(`fields.visibility.options.${option.toLowerCase()}`)}
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
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!isValid || loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {loading ? t('creating') : t('confirm')}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}
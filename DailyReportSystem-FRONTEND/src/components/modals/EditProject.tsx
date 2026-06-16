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
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { ProjectResponseType, EditProjectPayloadType } from '@/_types/project';

type EditProjectModalProps = {
  open: boolean;
  project: ProjectResponseType | null;
  onClose: () => void;
  onConfirm: (id: string, data: EditProjectPayloadType) => Promise<void>;
};

const statuses = ['active', 'paused', 'completed', 'cancelled', 'inactive', 'pending', 'closed'] as const;
const visibility = ['team', 'organisation'] as const;

export default function EditProjectModal({
  open,
  project,
  onClose,
  onConfirm,
}: EditProjectModalProps) {
  const t = useTranslations('projects');

  const [form, setForm] = useState<EditProjectPayloadType>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'active',
    visibility: 'Team',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form with project data when modal opens
  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        status: (project.status as any) || 'active',
        visibility: (project.visibility as any) || 'Team',
      });
    }
  }, [project, open]);

  const handleChange =
    (field: keyof EditProjectPayloadType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
      const value = e.target ? e.target.value : e;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async () => {
    if (!project || !form.name?.trim() || !form?.start_date || !form?.end_date) return;

    setLoading(true);
    setError(null);

    try {
      const updates: EditProjectPayloadType = {};

      const fields: (keyof EditProjectPayloadType)[] = [
        'name',
        'description',
        'start_date',
        'end_date',
        'status',
        'visibility',
      ];

      fields.forEach((field) => {
        const formValue = field === 'name' ? form[field]?.trim() : form[field];
        const projectValue = project[field] || '';

        if (formValue !== projectValue) {
          updates[field] = formValue as any;
        }
      });

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      await onConfirm(project.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setLoading(false);
    }
    [project, form, onConfirm, onClose];
  };

  if (!open || !project) return null;

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
            {t('modals.editProject.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('modals.editProject.subtitle')}
          </Typography>
        </Box>

        <Divider />

        <Box sx={{ px: 3, py: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label={t('modals.createProject.fields.name')}
              value={form.name}
              onChange={handleChange('name')}
              disabled={loading}
              size="small"
            />

            <TextField
              fullWidth
              label={t('modals.createProject.fields.description')}
              multiline
              rows={6}
              value={form.description}
              onChange={handleChange('description')}
              disabled={loading}
              size="small"
              InputProps={{ sx: { borderRadius: 2 } }}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                label={t('modals.createProject.fields.start_date')}
                type="date"
                value={form.start_date}
                onChange={handleChange('start_date')}
                disabled={loading}
                size="small"
              />
              <TextField
                fullWidth
                label={t('modals.createProject.fields.end_date')}
                type="date"
                value={form.end_date}
                onChange={handleChange('end_date')}
                disabled={loading}
                size="small"
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                select
                label={t('table.headers.status')}
                value={form.status}
                onChange={handleChange('status')}
                disabled={loading}
                size="small"
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {t(`status.${status.toLowerCase()}`)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                select
                label={t('modals.createProject.fields.visibility.label')}
                value={form.visibility}
                onChange={handleChange('visibility')}
                disabled={loading}
                size="small"
              >
                {visibility.map((option) => (
                  <MenuItem key={option} value={option}>
                    {t(`modals.createProject.fields.visibility.options.${option.toLowerCase()}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </Box>

        <Divider />

        {/* Actions */}
        <Box sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={onClose} variant="outlined" color="inherit" disabled={loading}>
              {t('modals.editProject.buttons.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {loading
                ? t('modals.editProject.buttons.saving')
                : t('modals.editProject.buttons.saveChanges')}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}
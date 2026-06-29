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
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateTaskFormData,
  STATUS_OPTIONS,
  CreateTaskModalProps,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
} from '@/_types/task';
import { createTaskSchema } from '@/schema/task.schema';

const PRIORITY_OPTIONS = TASK_PRIORITIES.map(value => ({
  value,
  label: `form.priority.options.${value}` as const,
}));

const CATEGORY_OPTIONS = TASK_CATEGORIES.map(value => ({
  value,
  label: `form.category.options.${value}` as const,
}));

export default function CreateTaskModal({
  open,
  onClose,
  onConfirm,
  projectMembers,
  canCreateTask,
}: CreateTaskModalProps) {
  const t = useTranslations('tasks.create');
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'backlog',
      assignees: [],
      dueDate: '',
      estimatedHours: undefined,
      priority: 'medium',
      category: 'feature',
    },
  });

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    setError(null);
    onClose();
  };

  const onSubmit = useCallback(async (data: CreateTaskFormData) => {
    setError(null);
    try {
      await onConfirm(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  }, [onConfirm, onClose, reset]);

  const getErrorMessage = (messageKey?: string) => {
    if (!messageKey) return '';
    const key = messageKey.split('.')[1];
    return t(`validation.${key}`);
  };

  const isDisabled = isSubmitting || !canCreateTask;

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 560 },
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 24,
          maxHeight: '90vh',
          overflowY: 'auto',
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
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ px: 3, py: 3 }}>
          <Stack spacing={2.5}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Title */}
            <TextField
              fullWidth
              size="small"
              label={t('form.title.label')}
              placeholder={t('form.title.placeholder')}
              {...register('title')}
              error={!!errors.title}
              helperText={getErrorMessage(errors.title?.message)}
              disabled={isDisabled}
              autoFocus
            />

            {/* Description */}
            <TextField
              fullWidth
              size="small"
              label={t('form.description.label')}
              placeholder={t('form.description.placeholder')}
              {...register('description')}
              error={!!errors.description}
              helperText={errors.description?.message}
              multiline
              rows={4}
              disabled={isDisabled}
            />

            {/* Status */}
            <TextField
              fullWidth
              select
              size="small"
              label={t('form.status.label')}
              value={watch('status')}
              onChange={(e) => setValue('status', e.target.value as any)}
              disabled={isDisabled}
            >
              {STATUS_OPTIONS.map(({ value, label }) => (
                <MenuItem key={value} value={value}>
                  {t(label)}
                </MenuItem>
              ))}
            </TextField>

            {/* Assignees */}
            <FormControl fullWidth size="small">
              <InputLabel>{t('form.assignees.label')}</InputLabel>
              <Select
                value={watch('assignees')?.[0] ?? ''}
                onChange={(e) => setValue('assignees', [e.target.value as string])}
                input={<OutlinedInput label={t('form.assignees.label')} />}
                disabled={isDisabled}
              >
                <MenuItem value="">
                  <Typography variant="body2" color="text.secondary">
                    {t('form.assignees.none')}
                  </Typography>
                </MenuItem>
                {projectMembers.map(({ id, member_name, member_email }) => (
                  <MenuItem key={id} value={id}>
                    <Typography variant="body2">{member_name?.trim() || member_email}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={4} mt={2}>
              <TextField
                fullWidth
                select
                size="small"
                label={t('form.priority.label')}
                value={watch('priority')}
                onChange={(e) => setValue('priority', e.target.value as any)}
                disabled={isDisabled}
              >
                {PRIORITY_OPTIONS.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>
                    {t(label)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                select
                size="small"
                label={t('form.category.label')}
                value={watch('category')}
                onChange={(e) => setValue('category', e.target.value as any)}
                disabled={isDisabled}
              >
                {CATEGORY_OPTIONS.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>
                    {t(label)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {/* Due Date & Estimated Hours */}
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                size="small"
                label={t('form.dueDate.label')}
                type="date"
                {...register('dueDate')}
                InputLabelProps={{ shrink: true }}
                disabled={isDisabled}
              />
              <TextField
                fullWidth
                size="small"
                label={t('form.estimatedHours.label')}
                type="number"
                placeholder={t('form.estimatedHours.placeholder')}
                {...register('estimatedHours', { valueAsNumber: true })}
                error={!!errors.estimatedHours}
                helperText={getErrorMessage(errors.estimatedHours?.message)}
                disabled={isDisabled}
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Stack>
          </Stack>

          <Divider sx={{ mt: 3 }} />

          {/* Actions */}
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              onClick={handleClose}
              variant="outlined"
              color="inherit"
              disabled={isSubmitting}
            >
              {t('form.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isDisabled}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isSubmitting ? t('creating') : t('form.submit')}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}

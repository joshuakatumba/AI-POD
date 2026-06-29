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
  Alert,
  MenuItem,
  Divider,
} from '@mui/material';
import { AccessTime, PersonOutline, AssignmentOutlined } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { TASK_PRIORITIES, EditTaskPayloadType,  TASK_CATEGORIES, TaskType } from '@/_types/task';
import { ProjectMemberBase } from '@/_types/projectMembers';
import { create } from 'domain';

type EditTaskModalProps = {
  open: boolean;
  task: TaskType | null;
  projectId: string;
  onClose: () => void;
  onConfirm: (projectId: string, taskId: string, data: EditTaskPayloadType) => Promise<void>;
  projectMembers: ProjectMemberBase[];
};

const PRIORITY_OPTIONS = TASK_PRIORITIES.map(value => ({
  value,
  label: `form.priority.options.${value}` as const,
}));

const CATEGORY_OPTIONS = TASK_CATEGORIES.map(value => ({
  value,
  label: `form.category.options.${value}` as const,
}));

const statuses = ['backlog', 'ready', 'in_progress', 'blocked', 'review', 'testing', 'done', 'cancelled', 'deployed'];

export default function EditTaskModal({
  projectId,
  open,
  task,
  onClose,
  onConfirm,
  projectMembers,
}: EditTaskModalProps) {
  const t = useTranslations('tasks');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<EditTaskPayloadType>({
    name: '',
    description: '',
    status: '',
    due_date: '',
    expected_hours: 0,
    assigned_to: '',
    priority: '',
    category: '',
  });

  const handleChange =
    (field: keyof EditTaskPayloadType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
      const value = e.target ? e.target.value : e;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name,
        description: task.description || '',
        status: task.status,
        due_date: task.due_date.split('T')[0],
        expected_hours: task?.expected_hours,
        assigned_to: task?.assigned_to?.id || '',
        priority: task.priority,
        category: task.category,
      });
    }
  }, [task, open]);

  const handleConfirm = async () => {
    if (!task || !form.name?.trim() || !form?.due_date || !form?.description) return;

    setLoading(true);
    setError(null);

    try {
      const updates: EditTaskPayloadType = {};

      const fields: (keyof EditTaskPayloadType)[] = [
        'name',
        'description',
        'due_date',
        'expected_hours',
        'status',
        'assigned_to',
        'priority',
        'category',
      ];

      fields.forEach((field) => {
        const formValue = field === 'name' ? form[field]?.trim() : form[field];
        const taskValue = task[field] || '';

        if (formValue !== taskValue) {
          updates[field] = formValue as any;
        }
      });

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      await onConfirm(projectId, task.id, updates);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setLoading(false);
    }
    [task, projectId, form, onConfirm, onClose];
  };

  if (!open || !task) return null;

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
            {t('editTask.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('editTask.subtitle')}
          </Typography>
        </Box>

        <Divider />

        {/* Form */}
        <Box sx={{ px: 4, py: 2 }}>
          <Stack spacing={2.5}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label={t('table.headers.name')}
              value={form.name}
              onChange={handleChange('name')}
              disabled={loading}
              size="small"
              InputProps={{
                startAdornment: (
                  <AssignmentOutlined sx={{ color: 'text.disabled', mr: 1, fontSize: 20 }} />
                ),
              }}
            />

            <TextField
              fullWidth
              label={t('editTask.description')}
              multiline
              rows={6}
              value={form.description}
              onChange={handleChange('description')}
              disabled={loading}
              size="small"
            />

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
                  <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>
                    {t(`status.${status.toLowerCase()}`)}
                  </MenuItem>
                ))}
              </TextField>
              
              <TextField
                fullWidth
                label={t('table.headers.hours')}
                type="number"
                value={form.expected_hours}
                onChange={handleChange('expected_hours')}
                disabled={loading}
                size="small"
                InputProps={{
                  startAdornment: (
                    <AccessTime sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} />
                  ),
                }}
              />
            </Stack>

            <TextField
              fullWidth
              label={t('table.headers.dueDate')}
              type="date"
              value={form.due_date}
              onChange={handleChange('due_date')}
              disabled={loading}
              size="small"
            />
            <Stack direction="row" spacing={2}>
                <TextField
                fullWidth
                select
                size="small"
                label={t('create.form.priority.label')}
                value={form.priority}
                onChange={handleChange('priority')}
                disabled={loading}
              >
                {PRIORITY_OPTIONS.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>
                    {t(`create.${label}`)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                select
                size="small"
                label={t('create.form.category.label')}
                value={form.category}
                onChange={handleChange('category')}
                disabled={loading}
              >
                {CATEGORY_OPTIONS.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>
                    {t(`create.${label}`)}
                  </MenuItem>
                ))}
              </TextField>
               
              </Stack>

            <TextField
              fullWidth
              select
              label={t('table.headers.assignedTo')}
              value={form.assigned_to}
              onChange={handleChange('assigned_to')}
              disabled={loading}
              size="small"
              InputProps={{
                startAdornment: (
                  <PersonOutline sx={{ color: 'text.disabled', mr: 1, fontSize: 20 }} />
                ),
              }}
            >
              {projectMembers.map(({ id, member_name, member_email }) => (
                <MenuItem key={id} value={id}>
                  <Typography variant="body2">{member_name || member_email}</Typography>
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Box>

        <Divider />

        {/* Actions */}
        <Box sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={onClose} variant="outlined" color="inherit" disabled={loading}>
              {t('editTask.buttons.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {loading ? t('editTask.buttons.saving') : t('editTask.buttons.save')}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
}
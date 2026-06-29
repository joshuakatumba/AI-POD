'use client';

import {
  Box,
  Drawer,
  Stack,
  Typography,
  IconButton,
  TextField,
  Divider,
  Button,
  Avatar,
  alpha,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Translate as TranslationIcon,
  FactCheckOutlined as RequirementsIcon,
  AnalyticsOutlined as ReportsIcon,
  ArrowForward as ArrowIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { AiModelType, AiWorkflowUpdatePayloadType, WorkflowResponseType } from '@/_types/admin';
import { useToast } from '@/app/_providers/ToastProvider';
import ArchiveWorkflowModal from '@/components/modals/workflow/ArchiveWorkflow';
import { archiveWorkflowAPI } from '@/app/[locale]/admin/workflows';

interface UpdateWorkflowProps {
  open: boolean;
  onClose: () => void;
  workflow: WorkflowResponseType | null;
  onConfirm: (id: string, data: AiWorkflowUpdatePayloadType) => Promise<void>;
  aiModels: AiModelType[];
  onArchive: (workflowId: string) => void;
}

const category_configurations: Record<string, { icon: React.ReactNode; color: string, label: string }> = {
  translation: { icon: <TranslationIcon sx={{ fontSize: 32 }} />, color: '#6366F1', label: 'categories.translation' },
  requirements: { icon: <RequirementsIcon sx={{ fontSize: 32 }} />, color: '#10B981', label: 'categories.requirements' },
  report: { icon: <ReportsIcon sx={{ fontSize: 32 }} />, color: '#F59E0B', label: 'categories.report' },
};

const category_fallback_configurations = {
  icon: <ArrowIcon sx={{ fontSize: 32 }} />,
  color: '#94a3b8',
  label: 'categories.general'
};

export default function UpdateWorkflow({
  open,
  onClose,
  workflow,
  onConfirm,
  aiModels,
  onArchive,
}: UpdateWorkflowProps) {
  const t = useTranslations('admin.workflows');
  const [isEditing, setIsEditing] = useState(false);
  const showToast = useToast();
  const [openArchiveModal, setOpenArchiveModal] = useState(false);

  const [form, setForm] = useState<AiWorkflowUpdatePayloadType>({
    name: '',
    description: '',
    system_prompt: '',
    ai_model: '',
    category: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEditable = () => {
    setIsEditing(true);
  };

  const aiModelsFiltered = useMemo(() => aiModels.filter((model) => model.is_active), [aiModels]);

  useEffect(() => {
    if (workflow && open) {
      setForm({
        name: workflow.name || '',
        description: workflow.description || '',
        system_prompt: workflow.system_prompt || '',
        ai_model: workflow.ai_model || '',
        category: workflow.category || '',
      });
    } else {
      // Reset form when drawer closes
      setForm({
        name: '',
        description: '',
        system_prompt: '',
        ai_model: '',
        category: '',
      });
      setIsEditing(false);
    }
  }, [workflow, open]);

  const handleChange =
    (field: keyof AiWorkflowUpdatePayloadType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleUpdate = async () => {
    if (!workflow) return;

    setLoading(true);
    setError(null);

    try {
      const updates: AiWorkflowUpdatePayloadType = {};

      const fields: (keyof AiWorkflowUpdatePayloadType)[] = [
        'name',
        'description',
        'system_prompt',
        'ai_model',
        'category',
      ];

      fields.forEach((field) => {
        const formValue = field === 'name' ? form[field]?.trim() : form[field];
        const projectValue = workflow[field] || '';

        if (formValue !== projectValue) {
          updates[field] = formValue as any;
        }
      });

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      await onConfirm(workflow.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workflows');
    } finally {
      setLoading(false);
    }
    [workflow, form, onConfirm, onClose];
  };

  const handleOpenArchiveModal = () => {
    setOpenArchiveModal(true);
  };

  const handleCloseArchiveModal = () => {
    setOpenArchiveModal(false);
  };

  const handleArchiveWorkflow = async (workflowId: string) => {
    try {
      await archiveWorkflowAPI(workflowId);

      onArchive(workflowId);
      handleCloseArchiveModal();
      onClose();
      showToast({
        message: t('archiveWorkflow.toast.success'),
        severity: 'success',
      });
    } catch (error) {
      showToast({
        message: t('archiveWorkflow.toast.error'),
        severity: 'error',
      });
    }
  };

  if (!workflow) return null;
  const { icon, color, label } =
    category_configurations[workflow.category] ?? category_fallback_configurations;
  const categoryName = t(label);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 450 },
          border: 'none',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.08)'
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header Area */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.5px' }}>
            {t("updateWorkflow.title")}
          </Typography>
          <IconButton onClick={onClose} sx={{ bgcolor: 'divider' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Form Body - Scrollable */}
        <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto', bgcolor: 'background.paper' }}>
          <Stack spacing={4}>
            {/* Context Header */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: alpha(color, 0.1),
                  color: color,
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                }}
              >
                {icon}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  {workflow.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  ID: {workflow.reference || 'N/A'} • {categoryName}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Inputs */}
            <Stack spacing={3}>
              <Box>
                <TextField
                  fullWidth
                  label={t('updateWorkflow.agentName')}
                  value={form.name}
                  onChange={handleChange('name')}
                  size="small"
                  required
                  autoFocus
                  disabled={!isEditing}
                />
              </Box>

              <TextField
                fullWidth
                multiline
                rows={4}
                label={t('updateWorkflow.description')}
                value={form.description}
                onChange={handleChange('description')}
                size="small"
                required
                disabled={!isEditing}
              />

              <TextField
                fullWidth
                multiline
                rows={8}
                label={t('updateWorkflow.systemPrompt')}
                value={form.system_prompt}
                onChange={handleChange('system_prompt')}
                size="small"
                required
                autoFocus
                disabled={!isEditing}
              />

              <Stack direction="row" spacing={2.5}>
                <TextField
                  select
                  fullWidth
                  label={t('updateWorkflow.model')}
                  size="small"
                  value={form.ai_model}
                  onChange={handleChange('ai_model')}
                  required
                  disabled={!isEditing}
                >
                  {aiModelsFiltered.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label={t('updateWorkflow.category.title')}
                  value={form.category}
                  onChange={handleChange('category')}
                  size="small"
                  required
                  disabled={!isEditing}
                >
                  {Object.entries(category_configurations).map(([key, category]) => (
                    <MenuItem key={key} value={key}>
                      {t(category.label)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        {/* Footer Action - Sticky */}
        <Box
          sx={{
            p: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.03)',
          }}
        >
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={isEditing ? handleUpdate : handleEditable}
            sx={{
              borderRadius: 3,
              py: 1.8,
              fontWeight: 900,
              textTransform: 'none',
              bgcolor: isEditing ? color : 'primary.main',
              boxShadow: `0 8px 20px ${alpha(color, 0.25)}`,
              '&:hover': {
                bgcolor: isEditing ? color : 'primary.main',
                opacity: 0.9,
                boxShadow: `0 12px 24px ${alpha(color, 0.35)}`,
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : isEditing ? (
              t('updateWorkflow.buttons.update')
            ) : (
              t('updateWorkflow.buttons.edit')
            )}
          </Button>

          <Button
            fullWidth
            variant="text"
            color="error"
            sx={{ mt: 1, fontWeight: 700, textTransform: 'none' }}
            onClick={handleOpenArchiveModal}
          >
            {t('updateWorkflow.buttons.archive')}
          </Button>
        </Box>
      </Box>

      {/* Archive Workflow Modal */}
      <ArchiveWorkflowModal
        open={openArchiveModal}
        workflow={workflow}
        onClose={handleCloseArchiveModal}
        onConfirm={handleArchiveWorkflow}
      />
    </Drawer>
  );
}
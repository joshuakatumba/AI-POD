'use client';

import {
  Box,
  Modal,
  Typography,
  Stack,
  IconButton,
  TextField,
  MenuItem,
  Avatar,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as SparkleIcon,
  Translate as TranslationIcon,
  FactCheckOutlined as RequirementsIcon,
  AnalyticsOutlined as ReportsIcon,
} from '@mui/icons-material';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import LivePreview from '@/components/workflow/LivePreview';
import { AiModelType, CreateWorkflowPayloadType } from '@/_types/admin';

interface CreateWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  aiModels: AiModelType[];
  onConfirm: (payload: CreateWorkflowPayloadType) => Promise<void>;
}

const InitialFormData: CreateWorkflowPayloadType = {
  name: '',
  description: '',
  system_prompt: '',
  ai_model: '',
  category: '',
};

// 1. Define Category Configurations (Syncs Icon + Color)
const category_configurations: Record<string, { icon: React.ReactNode; color: string, label: string }> = {
  translation: { icon: <TranslationIcon sx={{ fontSize: 32 }} />, color: '#6366F1', label: 'categories.translation' },
  requirements: { icon: <RequirementsIcon sx={{ fontSize: 32 }} />, color: '#10B981', label: 'categories.requirements' },
  report: { icon: <ReportsIcon sx={{ fontSize: 32 }} />, color: '#F59E0B', label: 'categories.report' },
};


export default function CreateWorkflowModal({ open, onClose, onConfirm, aiModels }: CreateWorkflowModalProps) {
  const t = useTranslations('admin.workflows');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateWorkflowPayloadType>(InitialFormData);

  const defaultConfig = {
    icon: <SparkleIcon sx={{ fontSize: 32 }} />,
    color: '#94a3b8',
    label: 'categories.general'
  };

  // 2. Derive visual styles based on category selection
  const activeConfig = useMemo(
    () => category_configurations[formData.category] || defaultConfig,
    [formData.category]
  );

  const handleClose = () => {
    if (submitting) return;
    setFormData(InitialFormData);
    setError(null);
    onClose();
  };

  const handleDeploy = async () => {
    if (
      !formData.name.trim() ||
      !formData.ai_model.trim() ||
      !formData.system_prompt.trim() ||
      !formData.category
    )
      return;

    setSubmitting(true);
    setError(null);

    try {
      await onConfirm(formData);
      setFormData(InitialFormData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setSubmitting(false);
    }
    [formData, onConfirm, onClose];
  };

  /* ---------------- Validation ---------------- */
  const isValid =
    formData.name.trim() && formData.system_prompt.trim() && formData.ai_model && formData.category;

  const aiModelsFiltered = useMemo(
    () => aiModels.filter((model) => model.is_active),
    [aiModels]);

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '95vw', md: '920px' },
          height: { md: '640px' },
          bgcolor: 'background.paper',
          borderRadius: 6,
          boxShadow: '0 32px 64px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                bgcolor: alpha(activeConfig.color, 0.1),
                color: activeConfig.color,
                borderRadius: 2,
              }}
            >
              <SparkleIcon fontSize="small" />
            </Avatar>
            <Typography variant="h6" fontWeight={900}>
              {t('createWorkflow.title')}
            </Typography>
          </Stack>
          <IconButton onClick={handleClose} sx={{ bgcolor: 'divider' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ flexGrow: 1, overflow: 'hidden' }}>
          {/* Left: Configuration Form */}
          <Box
            sx={{
              p: 4,
              flex: 1.2,
              borderRight: '1px solid',
              borderColor: 'divider',
              overflowY: 'auto',
            }}
          >
            <Stack spacing={3}>
              <TextField
                fullWidth
                label={t('createWorkflow.basicInformation.title')}
                placeholder={t('createWorkflow.basicInformation.placeholder')}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                value={formData.name}
                size="small"
                required
                autoFocus
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                label={t('createWorkflow.description.title')}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                size="small"
                autoFocus
              />

              <TextField
                fullWidth
                multiline
                rows={6}
                size="small"
                required
                autoFocus
                value={formData.system_prompt}
                label={t('createWorkflow.systemPrompt.title')}
                placeholder={t('createWorkflow.systemPrompt.placeholder')}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  required
                  value={formData.ai_model}
                  label={t('createWorkflow.model')}
                  onChange={(e) => setFormData({ ...formData, ai_model: e.target.value })}
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
                  size="small"
                  required
                  label={t('createWorkflow.category.title')}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {Object.entries(category_configurations).map(([key, category]) => (
                    <MenuItem key={key} value={key}>
                      {t(category.label)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>
          </Box>

          {/* Right: Live Preview (Direct Card Replica) */}
          <LivePreview
            formData={formData}
            activeConfig={activeConfig}
            isValid={!!isValid}
            submitting={submitting}
            onDeploy={handleDeploy}
            aiModels={aiModelsFiltered}
          />
        </Stack>
      </Box>
    </Modal>
  );
}
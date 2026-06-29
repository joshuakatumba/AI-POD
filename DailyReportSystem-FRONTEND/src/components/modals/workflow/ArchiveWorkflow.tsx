'use client';

import { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  Avatar,
  Button,
  Stack,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Translate as TranslationIcon,
  FactCheckOutlined as RequirementsIcon,
  AnalyticsOutlined as ReportsIcon,
  ArrowForward as ArrowIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { WorkflowResponseType } from '@/_types/admin';

type ArchiveWorkflowModalProps = {
  open: boolean;
  workflow: WorkflowResponseType | null;
  onClose: () => void;
  onConfirm: (workflowId: string) => Promise<void>;
};

const category_configurations: Record<string, { icon: React.ReactNode; }> = {
  translation: { icon: <TranslationIcon sx={{ fontSize: 32 }} /> },
  requirements: { icon: <RequirementsIcon sx={{ fontSize: 32 }} /> },
  report: { icon: <ReportsIcon sx={{ fontSize: 32 }} />},
};

const category_fallback_configurations = {
  icon: <ArrowIcon sx={{ fontSize: 32 }} />,
};

export default function ArchiveWorkflowModal({
  open,
  workflow,
  onClose,
  onConfirm,
}: ArchiveWorkflowModalProps) {
  const t = useTranslations('admin.workflows.archiveWorkflow');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!workflow) return;

    setLoading(true);

    try {
      await onConfirm(workflow.id);
      onClose();
    } catch (err) {
      setLoading(false);
    }
  };

  if (!workflow) return null;

  const { icon } =
  category_configurations[workflow.category] ??
  category_fallback_configurations;

  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 420,
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
        </Box>

        <Divider />

        {/* Content */}
        <Box px={3} py={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'error.lighter',
                color: 'error.main',
                fontWeight: 600,
              }}
            >
              {icon}
            </Avatar>

            <Box minWidth={0}>
              <Typography fontWeight={600} noWrap>
                {workflow.name}
              </Typography>

              <Typography variant="body2" color="text.secondary" noWrap>
                {t('subtitle')}
              </Typography>
            </Box>
          </Stack>

          <Typography mt={3} variant="body2" color="text.secondary">
            {t('message')}
          </Typography>
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
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {t('buttons.cancel')}
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleConfirm}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
            }}
          >
            {loading ? t('archiving') : t('buttons.archive')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}